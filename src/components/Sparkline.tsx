import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts'

export default function Sparkline({ points, target }: { points: { t: number; v: number }[]; target?: number | null }) {
  if (points.length < 2) return <div className="h-14 grid place-items-center text-xs text-mute">Log 2+ weigh-ins to see a trend</div>
  const vals = points.map((p) => p.v).concat(target != null ? [target] : [])
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = Math.max(1, (max - min) * 0.15)
  return (
    <div className="h-14" aria-label="14-day weight trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          {target != null && <ReferenceLine y={target} stroke="#a09c94" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="v" stroke="#e10600" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
