import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { insertRow, useRows } from '../../lib/data'
import { useMk } from '../../lib/mk'
import { fmtClock, ymd } from '../../lib/dates'
import { softChime, unlockAudio } from '../../lib/sound'
import { useWakeLock } from '../../lib/wakeLock'
import type { MindSession } from '../../lib/types'
import { MK_PARTS } from '../../content/masterKey'
import { Button, Card, Page, SectionTitle, Select, Sheet, TextArea } from '../../components/ui'
import MindNav from './MindNav'

export default function MasterKey() {
  const { progress, save, dayOfWeek, weekDone } = useMk()
  const { rows: sessions } = useRows<MindSession>('mind_sessions', { order: 'date' })
  const [timerOpen, setTimerOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const n = progress?.current_part ?? 1
  const part = MK_PARTS[n - 1]
  const checks = progress?.checks?.[String(n)] ?? Array(7).fill(false)
  const [notes, setNotes] = useState('')
  const savedNotes = progress?.notes?.[String(n)] ?? ''
  useEffect(() => setNotes(savedNotes), [savedNotes])

  const toggle = (i: number) => {
    if (!progress) return
    const next = [...checks]
    next[i] = !next[i]
    void save({ checks: { ...progress.checks, [String(n)]: next } })
  }
  const saveNotes = () => {
    if (progress && notes !== (progress.notes?.[String(n)] ?? '')) void save({ notes: { ...progress.notes, [String(n)]: notes } })
  }
  const goTo = (p: number) => {
    void save({ current_part: p, part_started_at: ymd() })
    setJumpOpen(false)
  }
  const sittingsThisPart = sessions.filter((s) => s.type === 'MK exercise' && s.mk_part === n).length

  const onSessionLogged = () => {
    if (!progress) return
    const next = [...checks]
    next[dayOfWeek - 1] = true
    void save({ checks: { ...progress.checks, [String(n)]: next } })
  }

  return (
    <Page title="Master Key">
      <MindNav />
      <div>
        <div className="flex justify-between text-xs uppercase tracking-widest text-mute mb-1">
          <span>Part {n} of 24</span>
          <span>{Math.round((n / 24) * 100)}%</span>
        </div>
        <div className="h-2 bg-raised rounded-full overflow-hidden">
          <div className="h-full bg-blood" style={{ width: `${(n / 24) * 100}%` }} />
        </div>
      </div>

      <Card>
        <div className="text-xs uppercase tracking-widest text-mute">This week · day {dayOfWeek} of 7</div>
        <h2 className="text-3xl font-bold mt-1">{part.title}</h2>
        <div className="flex gap-2 mt-3">
          <Link to={`/mind/master-key/${n}`} className="flex-1 min-h-12 grid place-items-center rounded-xl border border-line font-display uppercase tracking-wider text-lg active:bg-raised">
            Read
          </Link>
          <Button onClick={() => setTimerOpen(true)} className="flex-1">
            Sit · timer
          </Button>
        </div>
        {weekDone && n < 24 && (
          <Button variant="subtle" onClick={() => goTo(n + 1)} className="w-full mt-3">
            Start part {n + 1} →
          </Button>
        )}
      </Card>

      <Card>
        <SectionTitle>THIS WEEK'S EXERCISE</SectionTitle>
        <div className="prose-mk text-sm" dangerouslySetInnerHTML={{ __html: marked.parse(part.exercise || '_See the text._', { async: false }) }} />
        <div className="grid grid-cols-7 gap-1 mt-3">
          {checks.map((c: boolean, i: number) => (
            <button
              type="button"
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={c}
              aria-label={`Day ${i + 1} ${c ? 'done' : 'not done'}`}
              className={`min-h-12 rounded-lg text-sm font-display ${c ? 'bg-blood text-white' : i === dayOfWeek - 1 ? 'bg-raised border border-blood text-bone' : 'bg-raised text-mute'}`}
            >
              {c ? '✓' : `D${i + 1}`}
            </button>
          ))}
        </div>
        <p className="text-xs text-mute mt-2">{sittingsThisPart} sitting{sittingsThisPart === 1 ? '' : 's'} logged for this part.</p>
      </Card>

      <Card>
        <SectionTitle>MY NOTES · PART {n}</SectionTitle>
        <TextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="What stood out this week…" />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={() => setJumpOpen(true)}>
          Jump to part
        </Button>
        <Button variant="ghost" onClick={() => confirm('Restart the course from Part One?') && goTo(1)}>
          Restart
        </Button>
      </div>

      <Sheet open={jumpOpen} title="Jump to part" onClose={() => setJumpOpen(false)}>
        <div className="grid grid-cols-4 gap-2">
          {MK_PARTS.map((p) => (
            <Button key={p.n} variant={p.n === n ? 'primary' : 'subtle'} onClick={() => goTo(p.n)}>
              {p.n}
            </Button>
          ))}
        </div>
        <p className="text-xs text-mute">Jumping starts that part's week today.</p>
      </Sheet>
      {timerOpen && <SitTimer part={n} onClose={() => setTimerOpen(false)} onLogged={onSessionLogged} />}
    </Page>
  )
}

const MINUTES = [5, 10, 15, 20, 30, 45, 60]

function SitTimer({ part, onClose, onLogged }: { part: number; onClose: () => void; onLogged: () => void }) {
  const [minutes, setMinutes] = useState(() => Number(localStorage.getItem('cb:mk:minutes') ?? 15))
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [saved, setSaved] = useState(false)
  const finished = useRef(false)
  useWakeLock(startedAt != null && !saved)

  useEffect(() => {
    if (startedAt == null) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startedAt])

  const elapsed = startedAt ? (now - startedAt) / 1000 : 0
  const remaining = minutes * 60 - elapsed

  const log = async (secs: number) => {
    if (saved) return
    setSaved(true)
    await insertRow('mind_sessions', { type: 'MK exercise', duration_min: Math.round((secs / 60) * 10) / 10, mk_part: part, date: ymd() })
    onLogged()
  }

  const timeUp = startedAt != null && remaining <= 0
  useEffect(() => {
    if (timeUp && !finished.current) {
      finished.current = true
      softChime()
      setTimeout(softChime, 1200)
      void log(minutes * 60)
    }
  })

  const start = () => {
    unlockAudio()
    localStorage.setItem('cb:mk:minutes', String(minutes))
    softChime()
    setStartedAt(Date.now())
  }

  if (startedAt == null) {
    return (
      <Sheet open title="Sitting" onClose={onClose}>
        <p className="text-mute text-sm">Same room, same chair, same position. Sit still and follow this week's exercise.</p>
        <Select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
        <Button onClick={start} className="w-full min-h-16 text-2xl">
          Begin
        </Button>
      </Sheet>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink flex flex-col items-center justify-center gap-10 safe-top safe-bottom">
      <div className="text-xs uppercase tracking-widest text-mute">Master Key · Part {part}</div>
      <div className="font-display text-8xl tabular-nums text-bone/90">{saved && remaining <= 0 ? 'Done' : fmtClock(remaining)}</div>
      {saved ? (
        <Button onClick={onClose}>Close</Button>
      ) : (
        <button
          type="button"
          className="text-mute underline min-h-12 px-4"
          onClick={async () => {
            if (elapsed >= 60) await log(elapsed)
            onClose()
          }}
        >
          {elapsed >= 60 ? 'End & log early' : 'Cancel'}
        </button>
      )}
    </div>
  )
}
