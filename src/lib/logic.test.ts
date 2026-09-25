import { describe, expect, it } from 'vitest'
import { timerAt, totalSeconds, phaseEnd, type TimerConfig } from './timer'
import { expandEvents } from './recurrence'
import { currentStreak } from './streaks'
import { parseVCards } from './vcard'
import { OfflineQueue, isNetworkError, type KV } from './offline'
import { fmtWeight, fromInput, toDisplay } from './units'
import { dailyRate } from './weight'
import { affirmationOfDay } from './affirmation'
import { nextFight } from './fights'
import { weeklySummary } from '../pages/train/TrainLog'
import type { Affirmation, CalEvent, Fight, TrainingSession } from './types'

describe('round timer', () => {
  const cfg: TimerConfig = { rounds: 3, roundSec: 180, restSec: 60, warnSec: 10, prepSec: 10 }
  it('walks through prep, rounds and rests', () => {
    expect(timerAt(cfg, 0)).toMatchObject({ phase: 'prep', remaining: 10 })
    expect(timerAt(cfg, 10)).toMatchObject({ phase: 'round', round: 1, remaining: 180 })
    expect(timerAt(cfg, 190)).toMatchObject({ phase: 'rest', round: 1, remaining: 60 })
    expect(timerAt(cfg, 250)).toMatchObject({ phase: 'round', round: 2 })
    expect(timerAt(cfg, 10 + 3 * 180 + 2 * 60 - 1)).toMatchObject({ phase: 'round', round: 3, remaining: 1 })
    expect(timerAt(cfg, totalSeconds(cfg))).toMatchObject({ phase: 'done' })
  })
  it('has no rest after the last round', () => {
    expect(totalSeconds(cfg)).toBe(10 + 540 + 120)
  })
  it('skip jumps to the end of the current phase', () => {
    expect(phaseEnd(cfg, 50)).toBe(190)
  })
})

const ev = (over: Partial<CalEvent>): CalEvent => ({
  id: 'e1', user_id: 'u', title: 't', type: 'training', start_at: new Date(2026, 8, 1, 6, 0).toISOString(),
  end_at: null, location: null, camp_id: null, reminder_min: null, repeat: null, ...over,
})

describe('recurring events', () => {
  const from = new Date(2026, 8, 7) // Mon Sep 7 2026
  const to = new Date(2026, 8, 14)
  it('expands daily events inside the range', () => {
    const occ = expandEvents([ev({ repeat: { freq: 'daily' } })], from, to)
    expect(occ).toHaveLength(7)
    expect(occ[0].start.getHours()).toBe(6)
  })
  it('expands weekly events on chosen weekdays', () => {
    const occ = expandEvents([ev({ repeat: { freq: 'weekly', days: [2, 4, 6] } })], from, to)
    expect(occ.map((o) => o.start.getDay())).toEqual([2, 4, 6])
  })
  it('respects until and never starts before the first date', () => {
    const occ = expandEvents([ev({ start_at: new Date(2026, 8, 9, 6).toISOString(), repeat: { freq: 'daily', until: '2026-09-10' } })], from, to)
    expect(occ.map((o) => o.start.getDate())).toEqual([9, 10])
  })
  it('includes one-off events only in range', () => {
    expect(expandEvents([ev({ start_at: new Date(2026, 8, 8, 9).toISOString() })], from, to)).toHaveLength(1)
    expect(expandEvents([ev({ start_at: new Date(2026, 8, 20, 9).toISOString() })], from, to)).toHaveLength(0)
  })
})

describe('streaks', () => {
  const today = new Date(2026, 8, 25)
  it('counts back from today', () => {
    expect(currentStreak(['2026-09-25', '2026-09-24', '2026-09-23', '2026-09-21'], today)).toBe(3)
  })
  it('still counts when today is not logged yet', () => {
    expect(currentStreak(['2026-09-24', '2026-09-23'], today)).toBe(2)
  })
  it('is zero after a missed day', () => {
    expect(currentStreak(['2026-09-22'], today)).toBe(0)
  })
})

describe('vCard import', () => {
  it('reads common fields and folded lines', () => {
    const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Ramos;Luis;;;\r\nFN:Luis Ramos\r\nORG:Ramos Boxing;\r\nTEL;TYPE=CELL:+1 555 0100\r\nEMAIL;TYPE=INTERNET:luis@example.com\r\nADR;TYPE=WORK:;;1 Main St;Las Vegas;NV;89101;USA\r\nNOTE:Head coach\\, 20 yrs\r\n  experience\r\nEND:VCARD\r\nBEGIN:VCARD\r\nN:Cut;Joe\r\nTEL:555\r\nEND:VCARD'
    expect(parseVCards(vcf)).toEqual([
      { name: 'Luis Ramos', phone: '+1 555 0100', email: 'luis@example.com', company: 'Ramos Boxing', city: 'Las Vegas', notes: 'Head coach, 20 yrs experience' },
      { name: 'Joe Cut', phone: '555', email: null, company: null, city: null, notes: null },
    ])
  })
})

describe('offline queue', () => {
  const mem = (): KV => {
    const m = new Map<string, string>()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
  }
  it('replays queued rows in order and clears them', async () => {
    const sent: string[] = []
    const q = new OfflineQueue(mem(), async (_t, row) => {
      sent.push(row.id as string)
      return { error: null }
    })
    q.enqueue('weigh_ins', { id: 'a', user_id: 'u', weight: 220 })
    q.enqueue('training_sessions', { id: 'b', user_id: 'u' })
    expect(q.pending('weigh_ins', 'u')).toHaveLength(1)
    expect(await q.flush('u')).toEqual({ sent: 2, dropped: 0 })
    expect(sent).toEqual(['a', 'b'])
    expect(q.items()).toHaveLength(0)
  })
  it('stops on network errors and keeps the rest', async () => {
    const q = new OfflineQueue(mem(), async () => ({ error: { message: 'TypeError: Failed to fetch' } }))
    q.enqueue('weigh_ins', { id: 'a', user_id: 'u' })
    expect(await q.flush('u')).toEqual({ sent: 0, dropped: 0 })
    expect(q.items()).toHaveLength(1)
  })
  it('drops rows the server rejects and skips other users', async () => {
    const q = new OfflineQueue(mem(), async () => ({ error: { message: 'violates check', code: '23514' } }))
    q.enqueue('weigh_ins', { id: 'a', user_id: 'u' })
    q.enqueue('weigh_ins', { id: 'b', user_id: 'other' })
    expect(await q.flush('u')).toEqual({ sent: 0, dropped: 1 })
    expect(q.items().map((i) => i.row.id)).toEqual(['b'])
  })
  it('classifies errors', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true)
    expect(isNetworkError({ message: 'Failed to fetch', code: '42501' })).toBe(false)
  })
})

describe('units and weight', () => {
  it('round-trips kg input', () => {
    expect(toDisplay(fromInput(100, 'kg'), 'kg')).toBeCloseTo(100, 6)
    expect(fmtWeight(220.46, 'kg')).toBe('100.0 kg')
    expect(fmtWeight(null, 'lb')).toBe('—')
  })
  it('computes a daily rate of change', () => {
    const day = 86_400_000
    expect(dailyRate([{ t: 0, v: 230 }, { t: day, v: 229 }, { t: 2 * day, v: 228 }])).toBeCloseTo(-1)
    expect(dailyRate([{ t: 0, v: 230 }])).toBeNull()
  })
})

describe('dashboard helpers', () => {
  it('rotates affirmations daily and skips paused ones', () => {
    const a = (id: string, order: number, active = true): Affirmation => ({ id, user_id: 'u', text: id, order, active })
    const list = [a('x', 0), a('y', 1), a('z', 2, false)]
    const d1 = affirmationOfDay(list, new Date(2026, 8, 25))!
    const d2 = affirmationOfDay(list, new Date(2026, 8, 26))!
    expect(d1.id).not.toBe(d2.id)
    expect([d1.id, d2.id]).not.toContain('z')
  })
  it('picks the next upcoming fight', () => {
    const f = (id: string, date: string, status: Fight['status'] = 'upcoming') => ({ id, date, status }) as Fight
    const now = new Date('2026-09-25T12:00:00Z')
    expect(nextFight([f('old', '2026-01-01T00:00:00Z', 'won'), f('past', '2026-09-01T00:00:00Z'), f('next', '2026-11-01T00:00:00Z')], now)?.id).toBe('next')
  })
  it('summarizes a training week', () => {
    const s = (date: string, type: TrainingSession['type'], rounds: number, rpe: number) => ({ id: date + type, date, type, rounds, rpe_1_10: rpe, duration_min: 60 }) as TrainingSession
    const sum = weeklySummary([s('2026-09-21', 'sparring', 6, 8), s('2026-09-22', 'bag', 8, 6), s('2026-09-28', 'bag', 8, 6)], new Date(2026, 8, 21))
    expect(sum).toMatchObject({ sessions: 2, rounds: 14, sparringRounds: 6, avgRpe: 7, minutes: 120 })
  })
})
