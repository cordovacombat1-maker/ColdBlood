import type { CalEvent } from './types'
import { addDays, parseYmd, startOfDay, ymd } from './dates'

export interface Occurrence {
  event: CalEvent
  start: Date
  end: Date | null
  key: string
}

// Expands one-off and repeating events into occurrences within [from, to).
export function expandEvents(events: CalEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  for (const ev of events) {
    const start = new Date(ev.start_at)
    const durMs = ev.end_at ? new Date(ev.end_at).getTime() - start.getTime() : null
    const push = (s: Date) =>
      out.push({ event: ev, start: s, end: durMs != null ? new Date(s.getTime() + durMs) : null, key: `${ev.id}:${ymd(s)}` })

    if (!ev.repeat) {
      if (start >= from && start < to) push(start)
      continue
    }
    const until = ev.repeat.until ? addDays(parseYmd(ev.repeat.until), 1) : null
    const last = until && until < to ? until : to
    let day = startOfDay(start > from ? start : from)
    while (day < last) {
      const s = new Date(day)
      s.setHours(start.getHours(), start.getMinutes(), 0, 0)
      const matches =
        ev.repeat.freq === 'daily' ||
        (ev.repeat.freq === 'weekly' && (ev.repeat.days?.length ? ev.repeat.days : [start.getDay()]).includes(day.getDay()))
      if (matches && s >= start && s >= from && s < last) push(s)
      day = addDays(day, 1)
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}
