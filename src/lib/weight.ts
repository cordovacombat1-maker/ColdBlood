// Least-squares slope in lb/day over the given weigh-ins.
export function dailyRate(points: { t: number; v: number }[]): number | null {
  if (points.length < 2) return null
  const days = points.map((p) => p.t / 86_400_000)
  const n = points.length
  const mx = days.reduce((a, b) => a + b, 0) / n
  const my = points.reduce((a, p) => a + p.v, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (days[i] - mx) * (points[i].v - my)
    den += (days[i] - mx) ** 2
  }
  return den === 0 ? null : num / den
}
