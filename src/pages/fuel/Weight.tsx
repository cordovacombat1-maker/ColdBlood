import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { deleteRow, useRows } from '../../lib/data'
import { useProfile } from '../../lib/profile'
import { nextFight, useFights } from '../../lib/fights'
import { addDays, daysBetween, fmtDate, fmtTime } from '../../lib/dates'
import { fmtWeight, toDisplay } from '../../lib/units'
import { dailyRate } from '../../lib/weight'
import type { WeighIn } from '../../lib/types'
import { Button, Card, Empty, Page, PendingDot, SectionTitle, Segmented, Stat } from '../../components/ui'
import { WeighInSheet } from '../../components/LogSheets'

type Range = '7' | '30' | '90' | 'all'

export default function Weight() {
  const { profile, units } = useProfile()
  const { rows: weighIns } = useRows<WeighIn>('weigh_ins', { order: 'taken_at' })
  const { rows: fights } = useFights()
  const [range, setRange] = useState<Range>('30')
  const [open, setOpen] = useState(false)

  const fight = nextFight(fights)
  const target = fight?.contract_weight ?? profile?.walk_around_target ?? null
  const latest = weighIns[0]

  const points = useMemo(() => {
    const cutoff = range === 'all' ? 0 : addDays(new Date(), -Number(range)).getTime()
    return weighIns
      .map((w) => ({ t: new Date(w.taken_at).getTime(), v: Number(w.weight) }))
      .filter((p) => p.t >= cutoff)
      .sort((a, b) => a.t - b.t)
  }, [weighIns, range])

  const recent = useMemo(() => {
    const cutoff = addDays(new Date(), -7).getTime()
    return weighIns.map((w) => ({ t: new Date(w.taken_at).getTime(), v: Number(w.weight) })).filter((p) => p.t >= cutoff)
  }, [weighIns])
  const rate = dailyRate(recent) // lb/day
  const toGo = latest && target ? Number(latest.weight) - target : null
  const daysOut = fight ? daysBetween(new Date(), new Date(fight.weigh_in_at ?? fight.date)) : null

  const chartData = points.map((p) => ({ t: p.t, v: Number(toDisplay(p.v, units).toFixed(1)) }))
  const vals = chartData.map((d) => d.v).concat(target ? [toDisplay(target, units)] : [])
  const lo = Math.floor(Math.min(...vals) - 2)
  const hi = Math.ceil(Math.max(...vals) + 2)

  return (
    <Page title="Fuel" actions={<Button onClick={() => setOpen(true)} className="min-h-10 px-4 text-base">+ Weigh-in</Button>}>
      <Card>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Current" value={latest ? fmtWeight(Number(latest.weight), units, false) : '—'} sub={units} />
          <Stat label={fight?.contract_weight ? 'Contract' : 'Target'} value={target ? fmtWeight(target, units, false) : '—'} sub={target ? units : 'set in Profile'} />
          <Stat
            label="To go"
            value={toGo != null ? (toGo > 0 ? toDisplay(toGo, units).toFixed(1) : '✓') : '—'}
            sub={toGo != null && toGo <= 0 ? `${Math.abs(toDisplay(toGo, units)).toFixed(1)} under` : units}
          />
        </div>
        <div className="mt-3 text-sm text-mute">
          {rate != null ? (
            <>
              7-day trend: <span className="text-bone font-semibold">{rate > 0 ? '+' : ''}{toDisplay(rate, units).toFixed(2)} {units}/day</span>
              {toGo != null && toGo > 0 && daysOut != null && daysOut > 0 && (
                <> · need {toDisplay(toGo / daysOut, units).toFixed(2)} {units}/day for {daysOut} days</>
              )}
            </>
          ) : (
            'Log a few weigh-ins this week to see your rate of change.'
          )}
        </div>
      </Card>

      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7d' },
          { value: '30', label: '30d' },
          { value: '90', label: '90d' },
          { value: 'all', label: 'All' },
        ]}
      />
      <Card className="p-2">
        {chartData.length < 2 ? (
          <Empty>Not enough weigh-ins in this range.</Empty>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => fmtDate(new Date(t))} stroke="#a09c94" fontSize={12} tickCount={4} />
                <YAxis domain={[lo, hi]} stroke="#a09c94" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#151515', border: '1px solid #2c2c2c', borderRadius: 12 }}
                  labelFormatter={(t) => fmtDate(new Date(Number(t)), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  formatter={(v) => [`${v} ${units}`, 'Weight']}
                />
                {target && <ReferenceLine y={Number(toDisplay(target, units).toFixed(1))} stroke="#f5f3ee" strokeDasharray="6 4" label={{ value: 'Target', fill: '#a09c94', fontSize: 11, position: 'insideTopRight' }} />}
                <Line type="monotone" dataKey="v" stroke="#e10600" strokeWidth={3} dot={{ r: 3, fill: '#e10600' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <p className="text-xs text-mute border border-line rounded-xl p-3">
        Weight cuts should be planned and supervised by your coach and a medical professional. This app tracks numbers; it doesn't prescribe a cut.
      </p>

      <section>
        <SectionTitle>HISTORY</SectionTitle>
        {weighIns.length === 0 && <Empty>No weigh-ins yet.</Empty>}
        <ul className="divide-y divide-line">
          {weighIns.slice(0, 60).map((w) => (
            <li key={w.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="font-display text-xl">
                  {fmtWeight(Number(w.weight), units)}
                  {w._pending && <PendingDot />}
                </div>
                <div className="text-xs text-mute">
                  {fmtDate(w.taken_at, { weekday: 'short', month: 'short', day: 'numeric' })} {fmtTime(w.taken_at)}
                  {w.time_of_day && ` · ${w.time_of_day}`}
                  {w.notes && ` · ${w.notes}`}
                </div>
              </div>
              {!w._pending && (
                <button type="button" className="w-11 h-11 text-mute" aria-label="Delete weigh-in" onClick={() => confirm('Delete this weigh-in?') && deleteRow('weigh_ins', w.id)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <SectionTitle>NUTRITION</SectionTitle>
        <p className="text-mute text-sm">Meals, water, and daily targets arrive in phase 2.</p>
      </Card>
      <WeighInSheet open={open} onClose={() => setOpen(false)} />
    </Page>
  )
}
