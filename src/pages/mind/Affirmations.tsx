import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteRow, insertRow, updateRow, useRows } from '../../lib/data'
import { affirmationOfDay } from '../../lib/affirmation'
import type { Affirmation } from '../../lib/types'
import { Button, Card, Empty, Input, Page, SectionTitle } from '../../components/ui'
import MindNav from './MindNav'

const STARTERS = [
  'I am calm under pressure. The harder it gets, the colder I get.',
  'I outwork everyone in every session, every round, every day.',
  'I make weight with discipline, not desperation.',
  'My jab controls the fight. My mind controls my jab.',
  'I am a world champion in the making, and I act like it today.',
  'Every hard round in camp is a round I have already won on fight night.',
]

export default function Affirmations() {
  const { rows } = useRows<Affirmation>('affirmations', { order: 'order', ascending: true })
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const today = affirmationOfDay(rows)
  const reading = params.get('read') === '1'

  const add = async (t = text) => {
    if (!t.trim()) return
    const max = rows.reduce((m, r) => Math.max(m, r.order), -1)
    await insertRow('affirmations', { text: t.trim(), order: max + 1, active: true })
    setText('')
  }
  const addStarters = async () => {
    for (const [i, t] of STARTERS.entries()) await insertRow('affirmations', { text: t, order: i, active: true })
  }
  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i]
    const b = rows[i + dir]
    if (!a || !b) return
    await updateRow('affirmations', a.id, { order: b.order })
    await updateRow('affirmations', b.id, { order: a.order === b.order ? a.order + dir : a.order })
  }

  if (reading) return <ReadAll list={rows.filter((r) => r.active)} onDone={() => setParams({})} />

  return (
    <Page title="Affirmations">
      <MindNav />
      {today && (
        <div className="rounded-2xl p-5 border border-blood/60 bg-gradient-to-br from-blood/20 to-transparent">
          <div className="text-xs uppercase tracking-widest text-mute mb-2">Today</div>
          <p className="font-display text-2xl leading-snug">{today.text}</p>
        </div>
      )}
      <Button onClick={() => setParams({ read: '1' })} disabled={!rows.some((r) => r.active)} className="w-full">
        Read all · morning routine
      </Button>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="I am…" />
        <Button type="submit" className="shrink-0">Add</Button>
      </form>
      {rows.length === 0 && (
        <Card>
          <Empty>No affirmations yet.</Empty>
          <Button variant="ghost" className="w-full" onClick={addStarters}>
            Add starter set
          </Button>
        </Card>
      )}
      <section>
        {rows.length > 0 && <SectionTitle>ALL ({rows.length})</SectionTitle>}
        <ul className="space-y-2">
          {rows.map((a, i) => (
            <li key={a.id} className={`bg-panel border border-line rounded-2xl p-3 ${a.active ? '' : 'opacity-50'}`}>
              {editing === a.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    await updateRow('affirmations', a.id, { text: editText.trim() })
                    setEditing(null)
                  }}
                >
                  <Input value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <Button type="submit" className="shrink-0">Save</Button>
                </form>
              ) : (
                <button type="button" className="text-left w-full min-h-10" onClick={() => { setEditing(a.id); setEditText(a.text) }}>
                  {a.text}
                </button>
              )}
              <div className="flex gap-1 mt-2 text-sm text-mute">
                <button type="button" className="min-h-10 px-3 rounded-lg bg-raised" onClick={() => updateRow('affirmations', a.id, { active: !a.active })}>
                  {a.active ? 'Active' : 'Paused'}
                </button>
                <span className="flex-1" />
                <button type="button" className="w-10 h-10 rounded-lg bg-raised disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className="w-10 h-10 rounded-lg bg-raised disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className="w-10 h-10 rounded-lg bg-raised" onClick={() => confirm('Delete this affirmation?') && deleteRow('affirmations', a.id)} aria-label="Delete">×</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  )
}

function ReadAll({ list, onDone }: { list: Affirmation[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const done = i >= list.length
  return (
    <button type="button" onClick={() => (done ? onDone() : setI(i + 1))} className="fixed inset-0 z-50 bg-ink flex flex-col items-center justify-center p-8 text-center safe-top safe-bottom">
      <div className="absolute top-6 inset-x-0 text-xs uppercase tracking-widest text-mute">
        {done ? '' : `${i + 1} / ${list.length}`}
      </div>
      <p className="font-display text-4xl leading-tight">{done ? 'Now go to work.' : list[i].text}</p>
      <div className="absolute bottom-10 inset-x-0 text-sm text-mute">{done ? 'Tap to finish' : 'Say it out loud. Tap for next.'}</div>
    </button>
  )
}
