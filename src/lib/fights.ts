import { useRows } from './data'
import type { Fight } from './types'

export function useFights() {
  return useRows<Fight>('fights', { order: 'date', ascending: true })
}

export function nextFight(fights: Fight[], now = new Date()): Fight | null {
  // A fight stays "next" until the end of fight day.
  const cutoff = now.getTime() - 24 * 3600_000
  return fights.find((f) => f.status === 'upcoming' && new Date(f.date).getTime() > cutoff) ?? null
}
