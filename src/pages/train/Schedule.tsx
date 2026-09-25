import { useState } from 'react'
import { deleteRow, insertRow, updateRow, useRows } from '../../lib/data'
import { addDays, fmtDate, fmtTime, startOfDay, startOfWeek, toLocalInput, ymd } from '../../lib/dates'
import { expandEvents, type Occurrence } from '../../lib/recurrence'
import { EVENT_TYPES, type CalEvent, type EventType, type Repeat } from '../../lib/types'
import { Button, Chips, Empty, ErrorText, Field, Input, Page, Segmented, Select, Sheet } from '../../components/ui'
import TrainNav from './TrainNav'

export const TYPE_COLORS: Record<EventType, string> = {
  training: '#e10600',
  sparring: '#ff7a00',
  'weigh-in': '#f5c400',
  medical: '#3fb4ff',
  media: '#b36bff',
  travel: '#35d49a',
  other: '#a09c94',
}

type View = 'day' | 'week' | 'list'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Schedule() {
  const { rows: events } = useRows<CalEvent>('events', { order: 'start_at', ascending: true })
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [editing, setEditing] = useState<CalEvent | 'new' | null>(null)

  const range: [Date, Date] =
    view === 'day' ? [anchor, addDays(anchor, 1)] : view === 'week' ? [startOfWeek(anchor), addDays(startOfWeek(anchor), 7)] : [startOfDay(new Date()), addDays(startOfDay(new Date()), 30)]
  const occ = expandEvents(events, range[0], range[1])
  const step = view === 'day' ? 1 : 7

  const days: Date[] = view === 'day' ? [anchor] : view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(range[0], i)) : []

  return (
    <Page title="Schedule" actions={<Button onClick={() => setEditing('new')} className="min-h-10 px-4 text-base">+ Event</Button>}>
      <TrainNav />
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'list', label: 'Next 30' },
        ]}
      />
      {view !== 'list' && (
        <div className="flex items-center justify-between">
          <button type="button" className="w-12 h-12 text-2xl text-mute" onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Previous">‹</button>
          <button type="button" className="font-display uppercase tracking-wider" onClick={() => setAnchor(startOfDay(new Date()))}>
            {view === 'day' ? fmtDate(anchor, { weekday: 'long', month: 'short', day: 'numeric' }) : `${fmtDate(range[0])} – ${fmtDate(addDays(range[1], -1))}`}
          </button>
          <button type="button" className="w-12 h-12 text-2xl text-mute" onClick={() => setAnchor(addDays(anchor, step))} aria-label="Next">›</button>
        </div>
      )}

      {view === 'list' ? (
        occ.length ? <OccList occ={occ} showDate onPick={setEditing} /> : <Empty>Nothing in the next 30 days.</Empty>
      ) : (
        days.map((d) => {
          const list = occ.filter((o) => ymd(o.start) === ymd(d))
          const isToday = ymd(d) === ymd(new Date())
          return (
            <div key={ymd(d)}>
              <div className={`text-xs uppercase tracking-widest mb-2 ${isToday ? 'text-blood font-semibold' : 'text-mute'}`}>
                {fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              {list.length ? <OccList occ={list} onPick={setEditing} /> : <p className="text-mute/60 text-sm pb-2">—</p>}
            </div>
          )
        })
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="text-xs text-mute flex items-center gap-1 capitalize">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[t] }} />
            {t}
          </span>
        ))}
      </div>
      {editing && <EventSheet event={editing === 'new' ? null : editing} defaultDay={anchor} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function OccList({ occ, showDate, onPick }: { occ: Occurrence[]; showDate?: boolean; onPick: (e: CalEvent) => void }) {
  return (
    <ul className="space-y-2">
      {occ.map((o) => (
        <li key={o.key}>
          <button type="button" onClick={() => onPick(o.event)} className="w-full text-left flex items-stretch gap-3 bg-panel border border-line rounded-xl p-3 active:bg-raised">
            <span className="w-1.5 rounded-full" style={{ background: TYPE_COLORS[o.event.type] }} />
            <span className="w-20 text-sm text-mute">
              {showDate && <span className="block">{fmtDate(o.start, { weekday: 'short', day: 'numeric' })}</span>}
              {fmtTime(o.start)}
              {o.end && <span className="block">{fmtTime(o.end)}</span>}
            </span>
            <span className="flex-1">
              <span className="font-semibold block">{o.event.title}</span>
              {o.event.location && <span className="text-sm text-mute">{o.event.location}</span>}
              {o.event.repeat && <span className="text-xs text-mute block">↻ repeats</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

type RepeatMode = 'none' | 'daily' | 'weekly'

function EventSheet({ event, defaultDay, onClose }: { event: CalEvent | null; defaultDay: Date; onClose: () => void }) {
  const initialStart = event ? new Date(event.start_at) : (() => {
    const d = new Date(defaultDay)
    d.setHours(new Date().getHours() + 1, 0, 0, 0)
    return d
  })()
  const [title, setTitle] = useState(event?.title ?? '')
  const [type, setType] = useState<EventType>(event?.type ?? 'training')
  const [start, setStart] = useState(toLocalInput(initialStart))
  const [durationMin, setDurationMin] = useState(
    event?.end_at ? String(Math.round((new Date(event.end_at).getTime() - initialStart.getTime()) / 60000)) : '60',
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [reminder, setReminder] = useState(event?.reminder_min != null ? String(event.reminder_min) : '')
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(event?.repeat?.freq ?? 'none')
  const [days, setDays] = useState<number[]>(event?.repeat?.days ?? [initialStart.getDay()])
  const [until, setUntil] = useState(event?.repeat?.until ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!title.trim()) return setError('Add a title')
    const s = new Date(start)
    const mins = parseInt(durationMin)
    const repeat: Repeat | null =
      repeatMode === 'none' ? null : { freq: repeatMode, days: repeatMode === 'weekly' ? days : undefined, until: until || null }
    const row = {
      title: title.trim(),
      type,
      start_at: s.toISOString(),
      end_at: mins ? new Date(s.getTime() + mins * 60000).toISOString() : null,
      location: location || null,
      reminder_min: reminder ? parseInt(reminder) : null,
      repeat,
    }
    try {
      if (event) await updateRow('events', event.id, row)
      else await insertRow('events', row)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const remove = async () => {
    if (event && confirm(event.repeat ? 'Delete this event and all its repeats?' : 'Delete this event?')) {
      await deleteRow('events', event.id)
      onClose()
    }
  }

  return (
    <Sheet open title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Roadwork, Sparring, Media day…" />
      </Field>
      <Chips options={EVENT_TYPES} value={type} onChange={setType} cols={4} />
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Starts">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Minutes">
          <Input type="number" inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        </Field>
      </div>
      <Field label="Location">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field label="Repeat">
        <Segmented
          value={repeatMode}
          onChange={setRepeatMode}
          options={[
            { value: 'none', label: 'Once' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </Field>
      {repeatMode === 'weekly' && (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <button
              type="button"
              key={w}
              aria-pressed={days.includes(i)}
              onClick={() => setDays(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort())}
              className={`min-h-12 rounded-lg text-sm ${days.includes(i) ? 'bg-blood text-white' : 'bg-raised text-mute'}`}
            >
              {w[0]}
            </button>
          ))}
        </div>
      )}
      {repeatMode !== 'none' && (
        <Field label="Until (optional)">
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      )}
      <Field label="Reminder" hint="Saved now; phone notifications arrive in phase 2.">
        <Select value={reminder} onChange={(e) => setReminder(e.target.value)}>
          <option value="">None</option>
          <option value="10">10 min before</option>
          <option value="30">30 min before</option>
          <option value="60">1 hour before</option>
          <option value="1440">1 day before</option>
        </Select>
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button onClick={save} className="w-full">
        Save
      </Button>
      {event && (
        <Button variant="danger" onClick={remove} className="w-full">
          Delete
        </Button>
      )}
    </Sheet>
  )
}
