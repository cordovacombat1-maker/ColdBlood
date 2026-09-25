import { useMemo, useState } from 'react'
import { deleteRow, useRows, type Pending } from '../../lib/data'
import { addDays, fmtDate, parseYmd, startOfWeek, ymd } from '../../lib/dates'
import type { SparringRound, TrainingSession } from '../../lib/types'
import { Button, Card, Empty, Page, PendingDot, SectionTitle, Stat } from '../../components/ui'
import { SessionSheet } from '../../components/LogSheets'
import TrainNav from './TrainNav'

export function weeklySummary(sessions: TrainingSession[], weekStart: Date) {
  const from = ymd(weekStart)
  const to = ymd(addDays(weekStart, 7))
  const wk = sessions.filter((s) => s.date >= from && s.date < to)
  const rpes = wk.map((s) => s.rpe_1_10).filter((r): r is number => r != null)
  return {
    sessions: wk.length,
    rounds: wk.reduce((n, s) => n + (s.rounds ?? 0), 0),
    sparringRounds: wk.filter((s) => s.type === 'sparring').reduce((n, s) => n + (s.rounds ?? 0), 0),
    roadwork: wk.filter((s) => s.type === 'roadwork').length,
    minutes: wk.reduce((n, s) => n + (s.duration_min ?? 0), 0),
    avgRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
  }
}

export default function TrainLog() {
  const { rows: sessions } = useRows<TrainingSession>('training_sessions', { order: 'date' })
  const { rows: spars } = useRows<SparringRound>('sparring_rounds')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7)
  const summary = weeklySummary(sessions, weekStart)

  const byDate = useMemo(() => {
    const m = new Map<string, Pending<TrainingSession>[]>()
    for (const s of sessions) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return [...m.entries()]
  }, [sessions])

  const remove = async (id: string) => {
    if (confirm('Delete this session?')) await deleteRow('training_sessions', id)
  }

  return (
    <Page title="Train" actions={<Button onClick={() => setOpen(true)} className="min-h-10 px-4 text-base">+ Log</Button>}>
      <TrainNav />
      <Card>
        <SectionTitle
          action={
            <div className="flex items-center gap-1">
              <button type="button" className="w-10 h-10 text-xl text-mute" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">‹</button>
              <button type="button" className="w-10 h-10 text-xl text-mute disabled:opacity-30" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">›</button>
            </div>
          }
        >
          WEEK OF {fmtDate(weekStart).toUpperCase()}
        </SectionTitle>
        <div className="grid grid-cols-3 gap-y-3 gap-x-2">
          <Stat label="Sessions" value={summary.sessions} />
          <Stat label="Rounds" value={summary.rounds} />
          <Stat label="Sparring rds" value={summary.sparringRounds} />
          <Stat label="Roadwork" value={summary.roadwork} sub="sessions" />
          <Stat label="Hours" value={(summary.minutes / 60).toFixed(1)} />
          <Stat label="Avg RPE" value={summary.avgRpe ? summary.avgRpe.toFixed(1) : '—'} />
        </div>
      </Card>

      {byDate.length === 0 && <Empty>No sessions yet. Tap + Log after training.</Empty>}
      {byDate.map(([date, list]) => (
        <div key={date}>
          <div className="text-xs uppercase tracking-widest text-mute mb-2">{fmtDate(parseYmd(date), { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="space-y-2">
            {list.map((s) => {
              const spar = spars.find((r) => r.session_id === s.id)
              return (
                <Card key={s.id} onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <div className="flex items-center justify-between">
                    <div className="font-display uppercase text-xl">
                      {s.type}
                      {s._pending && <PendingDot />}
                    </div>
                    <div className="text-mute text-sm">
                      {[s.duration_min && `${s.duration_min} min`, s.rounds && `${s.rounds} rds`, s.rpe_1_10 && `RPE ${s.rpe_1_10}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {expanded === s.id && (
                    <div className="mt-3 space-y-2 text-sm" onClick={(e) => e.stopPropagation()}>
                      {spar && (
                        <div className="space-y-1">
                          {spar.partner && <p><span className="text-mute">Partner:</span> {spar.partner}</p>}
                          {spar.what_worked && <p><span className="text-mute">Worked:</span> {spar.what_worked}</p>}
                          {spar.what_didnt && <p><span className="text-mute">Didn't:</span> {spar.what_didnt}</p>}
                          {spar.damage_taken && <p><span className="text-mute">Damage:</span> {spar.damage_taken}</p>}
                        </div>
                      )}
                      {s.notes && <p className="whitespace-pre-wrap">{s.notes}</p>}
                      {s.video_url && (
                        <a href={s.video_url} target="_blank" rel="noreferrer" className="text-blood underline">
                          Watch video
                        </a>
                      )}
                      {!s._pending && (
                        <Button variant="danger" className="min-h-10 text-sm" onClick={() => remove(s.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}
      <SessionSheet open={open} onClose={() => setOpen(false)} />
    </Page>
  )
}
