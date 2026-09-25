import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRows } from '../lib/data'
import { useProfile } from '../lib/profile'
import { nextFight, useFights } from '../lib/fights'
import { addDays, daysBetween, fmtDate, fmtTime, startOfDay, ymd } from '../lib/dates'
import { expandEvents } from '../lib/recurrence'
import { currentStreak } from '../lib/streaks'
import { affirmationOfDay } from '../lib/affirmation'
import { fmtWeight, toDisplay } from '../lib/units'
import type { Affirmation, CalEvent, MindSession, TrainingSession, WeighIn } from '../lib/types'
import { Card, SectionTitle, Stat } from '../components/ui'
import Sparkline from '../components/Sparkline'
import { SessionSheet, WeighInSheet } from '../components/LogSheets'
import { TYPE_COLORS } from './train/Schedule'

export default function Home() {
  const { profile, units } = useProfile()
  const { rows: fights } = useFights()
  const since90 = ymd(addDays(new Date(), -90))
  const { rows: weighIns } = useRows<WeighIn>('weigh_ins', { order: 'taken_at', since: { column: 'taken_at', value: since90 } })
  const { rows: sessions } = useRows<TrainingSession>('training_sessions', { order: 'date', since: { column: 'date', value: since90 } })
  const { rows: mind } = useRows<MindSession>('mind_sessions', { order: 'date', since: { column: 'date', value: since90 } })
  const { rows: events } = useRows<CalEvent>('events', { order: 'start_at', ascending: true })
  const { rows: affirmations } = useRows<Affirmation>('affirmations', { order: 'order', ascending: true })
  const [sheet, setSheet] = useState<'weigh' | 'session' | null>(null)

  const fight = nextFight(fights)
  const daysOut = fight ? daysBetween(new Date(), new Date(fight.date)) : null
  const fightWeek = daysOut != null && daysOut <= 7

  const latest = weighIns[0]
  const target = fight?.contract_weight ?? profile?.walk_around_target ?? null
  const spark = useMemo(() => {
    const cutoff = addDays(new Date(), -14).getTime()
    return weighIns
      .filter((w) => new Date(w.taken_at).getTime() >= cutoff)
      .map((w) => ({ t: new Date(w.taken_at).getTime(), v: toDisplay(Number(w.weight), units) }))
      .sort((a, b) => a.t - b.t)
  }, [weighIns, units])

  const today = startOfDay(new Date())
  const todays = expandEvents(events, today, addDays(today, 1))

  const streaks = {
    training: currentStreak(sessions.map((s) => s.date)),
    mk: currentStreak(mind.filter((m) => m.type === 'MK exercise').map((m) => m.date)),
    meditation: currentStreak(mind.filter((m) => m.type === 'meditation').map((m) => m.date)),
  }
  const affirmation = affirmationOfDay(affirmations)
  const name = profile?.nickname || profile?.fighter_name

  return (
    <div className="pb-28 px-4 safe-top">
      <header className="pt-5 pb-3 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-mute">{fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="text-3xl font-bold">{name ? name : 'COLD BLOOD'}</h1>
        </div>
        {profile && (
          <div className="text-right font-display text-lg text-mute">
            {profile.record_w}-{profile.record_l}-{profile.record_d}
            <span className="text-xs block">{profile.record_ko} KO</span>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {fight ? (
          <Link to="/more/fights" className={`block rounded-2xl p-5 ${fightWeek ? 'bg-blood text-white' : 'bg-panel border border-line'}`}>
            <div className="text-xs uppercase tracking-widest opacity-80">{fightWeek ? 'Fight week' : 'Next fight'}</div>
            <div className="flex items-end gap-3">
              <div className="font-display text-7xl font-bold leading-none">{Math.max(0, daysOut!)}</div>
              <div className="pb-2 font-display uppercase text-xl">{daysOut === 1 ? 'day' : 'days'}</div>
            </div>
            <div className="mt-2 font-semibold">vs {fight.opponent || 'TBA'}</div>
            <div className="text-sm opacity-80">
              {fmtDate(fight.date, { weekday: 'short', month: 'short', day: 'numeric' })}
              {fight.venue ? ` · ${fight.venue}` : ''}
              {fight.city ? `, ${fight.city}` : ''}
            </div>
            {fightWeek && fight.weigh_in_at && (
              <div className="mt-2 text-sm font-semibold">
                Weigh-in {fmtDate(fight.weigh_in_at, { weekday: 'short' })} {fmtTime(fight.weigh_in_at)} · {fmtWeight(fight.contract_weight, units)}
              </div>
            )}
          </Link>
        ) : (
          <Card>
            <div className="text-mute">No fight booked.</div>
            <Link to="/more/fights" className="text-blood font-semibold">
              Add a fight →
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setSheet('weigh')} className="min-h-20 rounded-2xl bg-blood text-white font-display uppercase text-xl tracking-wider active:bg-blood-dark">
            + Weigh-in
          </button>
          <button type="button" onClick={() => setSheet('session')} className="min-h-20 rounded-2xl bg-bone text-ink font-display uppercase text-xl tracking-wider active:opacity-80">
            + Session
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2" aria-label="Coming in phase 2">
          {['Meal', 'Water', 'Wellness'].map((l) => (
            <div key={l} className="min-h-12 rounded-xl border border-dashed border-line text-mute grid place-items-center text-sm">
              {l} <span className="text-[10px] uppercase tracking-widest -mt-2">soon</span>
            </div>
          ))}
        </div>

        <Card>
          <SectionTitle action={<Link to="/fuel" className="text-sm text-blood">Chart →</Link>}>WEIGHT</SectionTitle>
          <div className="flex items-end justify-between gap-4">
            <Stat label="Current" value={latest ? fmtWeight(Number(latest.weight), units, false) : '—'} sub={latest ? fmtDate(latest.taken_at) : 'no weigh-ins yet'} />
            <Stat
              label={fight?.contract_weight ? 'Contract' : 'Target'}
              value={target ? fmtWeight(target, units, false) : '—'}
              sub={
                latest && target
                  ? `${Math.abs(toDisplay(Number(latest.weight) - target, units)).toFixed(1)} ${units} ${Number(latest.weight) > target ? 'to cut' : 'under'}`
                  : target
                    ? units
                    : 'set in Profile'
              }
            />
          </div>
          <div className="mt-3">
            <Sparkline points={spark} target={target != null ? toDisplay(target, units) : null} />
          </div>
        </Card>

        <Card>
          <SectionTitle action={<Link to="/train/schedule" className="text-sm text-blood">Schedule →</Link>}>TODAY</SectionTitle>
          {todays.length === 0 ? (
            <p className="text-mute">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {todays.map((o) => (
                <li key={o.key} className="flex items-center gap-3">
                  <span className="w-1.5 self-stretch rounded-full" style={{ background: TYPE_COLORS[o.event.type] }} />
                  <span className="w-16 text-mute text-sm">{fmtTime(o.start)}</span>
                  <span className="flex-1 font-semibold">{o.event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>STREAKS</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Training" value={streaks.training} sub="days" />
            <Stat label="Master Key" value={streaks.mk} sub="days" />
            <Stat label="Meditation" value={streaks.meditation} sub="days" />
          </div>
        </Card>

        <Link to="/mind/affirmations" className="block rounded-2xl p-5 border border-blood/60 bg-gradient-to-br from-blood/20 to-transparent">
          <div className="text-xs uppercase tracking-widest text-mute mb-2">Today's affirmation</div>
          <p className="font-display text-2xl leading-snug">{affirmation ? affirmation.text : 'Add your first affirmation →'}</p>
        </Link>
      </div>

      <WeighInSheet open={sheet === 'weigh'} onClose={() => setSheet(null)} />
      <SessionSheet open={sheet === 'session'} onClose={() => setSheet(null)} />
    </div>
  )
}
