// All "date" (yyyy-mm-dd) values are the fighter's local calendar day.

export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function startOfWeek(d: Date): Date {
  // Weeks start Monday.
  const s = startOfDay(d)
  return addDays(s, -((s.getDay() + 6) % 7))
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

export function fmtDate(s: string | Date, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  const d = typeof s === 'string' ? (s.length === 10 ? parseYmd(s) : new Date(s)) : s
  return d.toLocaleDateString(undefined, opts)
}

export function fmtTime(s: string | Date): string {
  const d = typeof s === 'string' ? new Date(s) : s
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Value for <input type="datetime-local"> from a Date, in local time.
export function toLocalInput(d: Date): string {
  return `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
