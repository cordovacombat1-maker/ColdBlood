import { addDays, ymd } from './dates'

// Consecutive days (ending today, or yesterday if today isn't logged yet)
// that appear in `dates`.
export function currentStreak(dates: Iterable<string>, today: Date = new Date()): number {
  const set = new Set(dates)
  let day = set.has(ymd(today)) ? today : addDays(today, -1)
  let n = 0
  while (set.has(ymd(day))) {
    n++
    day = addDays(day, -1)
  }
  return n
}
