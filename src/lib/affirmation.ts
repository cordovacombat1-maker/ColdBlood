import type { Affirmation } from './types'
import { ymd } from './dates'

// Same affirmation all day, the next one tomorrow.
export function affirmationOfDay(list: Affirmation[], day = new Date()): Affirmation | null {
  const active = list.filter((a) => a.active).sort((a, b) => a.order - b.order)
  if (!active.length) return null
  const dayNum = Math.floor(new Date(ymd(day) + 'T12:00:00Z').getTime() / 86_400_000)
  return active[dayNum % active.length]
}
