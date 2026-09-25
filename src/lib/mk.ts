import { useSingleton } from './data'
import type { MkProgress } from './types'
import { daysBetween, parseYmd } from './dates'

export function useMk() {
  const s = useSingleton<MkProgress>('mk_progress')
  const p = s.row
  const dayOfWeek = p ? Math.min(7, Math.max(1, daysBetween(parseYmd(p.part_started_at), new Date()) + 1)) : 1
  const weekDone = p ? daysBetween(parseYmd(p.part_started_at), new Date()) >= 7 : false
  return { ...s, progress: p, dayOfWeek, weekDone }
}
