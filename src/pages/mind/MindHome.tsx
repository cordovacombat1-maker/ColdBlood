import { Link } from 'react-router-dom'
import { useRows } from '../../lib/data'
import { useMk } from '../../lib/mk'
import { affirmationOfDay } from '../../lib/affirmation'
import { ymd } from '../../lib/dates'
import type { Affirmation, JournalEntry, MindSession } from '../../lib/types'
import { MK_PARTS } from '../../content/masterKey'
import { Card, Page, SectionTitle } from '../../components/ui'
import MindNav from './MindNav'

export default function MindHome() {
  const { progress, dayOfWeek } = useMk()
  const { rows: affirmations } = useRows<Affirmation>('affirmations', { order: 'order', ascending: true })
  const today = ymd()
  const { rows: journal } = useRows<JournalEntry>('journal_entries', { order: 'date', since: { column: 'date', value: today } })
  const { rows: sessions } = useRows<MindSession>('mind_sessions', { order: 'date', since: { column: 'date', value: today } })
  const aff = affirmationOfDay(affirmations)
  const entry = journal.find((j) => j.date === today)
  const mkDone = sessions.some((s) => s.type === 'MK exercise' && s.date === today)
  const part = MK_PARTS[(progress?.current_part ?? 1) - 1]

  const items = [
    { label: 'Read affirmations', done: false, to: '/mind/affirmations?read=1', sub: aff?.text },
    { label: `Master Key · ${part.title}`, done: mkDone, to: '/mind/master-key', sub: `Day ${dayOfWeek} of 7 · sit for your exercise` },
    { label: "Set today's intention", done: Boolean(entry?.intention), to: '/mind/journal', sub: entry?.intention ?? undefined },
    { label: 'Gratitude', done: Boolean(entry?.gratitude), to: '/mind/journal' },
    { label: 'Evening reflection', done: Boolean(entry?.reflection), to: '/mind/journal' },
  ]

  return (
    <Page title="Mind">
      <MindNav />
      <SectionTitle>TODAY'S ROUTINE</SectionTitle>
      <div className="space-y-2">
        {items.map((i) => (
          <Link key={i.label} to={i.to} className="flex items-center gap-3 bg-panel border border-line rounded-2xl p-4 active:bg-raised">
            <span className={`w-7 h-7 shrink-0 rounded-full border-2 grid place-items-center ${i.done ? 'bg-blood border-blood text-white' : 'border-line'}`}>{i.done ? '✓' : ''}</span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold block">{i.label}</span>
              {i.sub && <span className="text-sm text-mute block truncate">{i.sub}</span>}
            </span>
            <span className="text-mute">›</span>
          </Link>
        ))}
      </div>
      <Card>
        <p className="text-sm text-mute">Dream board, visualization, meditation and breathwork, goals, and custom routines arrive in phase 2.</p>
      </Card>
    </Page>
  )
}
