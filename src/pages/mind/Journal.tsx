import { useEffect, useRef, useState } from 'react'
import { currentUserId, notifyChange, useRows } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { fmtDate, parseYmd, ymd } from '../../lib/dates'
import type { JournalEntry } from '../../lib/types'
import { Card, Empty, ErrorText, Field, Input, Page, SectionTitle, TextArea } from '../../components/ui'
import MindNav from './MindNav'

type Key = 'gratitude' | 'intention' | 'reflection'
const FIELDS: { key: Key; label: string; placeholder: string }[] = [
  { key: 'intention', label: "Today's intention", placeholder: 'Today I will…' },
  { key: 'gratitude', label: 'Gratitude', placeholder: "I'm grateful for…" },
  { key: 'reflection', label: 'Evening reflection', placeholder: 'What went well, what to sharpen tomorrow…' },
]

export default function Journal() {
  const { rows } = useRows<JournalEntry>('journal_entries', { order: 'date' })
  const [date, setDate] = useState(ymd())
  const [draft, setDraft] = useState<Record<Key, string>>({ gratitude: '', intention: '', reflection: '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const entry = rows.find((r) => r.date === date)
  // Load the saved entry when switching days (or when it first arrives), but
  // never overwrite what's being typed after a save round-trips.
  const loaded = useRef<string | null>(null)
  useEffect(() => {
    const fromEntry = { gratitude: entry?.gratitude ?? '', intention: entry?.intention ?? '', reflection: entry?.reflection ?? '' }
    if (loaded.current !== date) {
      loaded.current = date
      setDraft(fromEntry)
    } else if (entry) {
      // Entry arrived after the day was opened: fill in only if nothing typed yet.
      setDraft((d) => (FIELDS.some((f) => d[f.key]) ? d : fromEntry))
    }
  }, [date, entry])

  const save = async () => {
    if (entry && FIELDS.every((f) => (entry[f.key] ?? '') === draft[f.key])) return
    if (!entry && FIELDS.every((f) => !draft[f.key])) return
    setStatus('saving')
    const { error } = await supabase.from('journal_entries').upsert(
      {
        user_id: await currentUserId(),
        date,
        gratitude: draft.gratitude || null,
        intention: draft.intention || null,
        reflection: draft.reflection || null,
      },
      { onConflict: 'user_id,date' },
    )
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else {
      setError(null)
      setStatus('saved')
      notifyChange('journal_entries')
    }
  }

  const query = q.trim().toLowerCase()
  const history = rows.filter(
    (r) => r.date !== date && (!query || [r.gratitude, r.intention, r.reflection].some((t) => t?.toLowerCase().includes(query))),
  )

  return (
    <Page title="Journal">
      <MindNav />
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <Input type="date" value={date} max={ymd()} onChange={(e) => setDate(e.target.value || ymd())} className="w-auto" />
          <span className="text-xs text-mute">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>
        </div>
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <TextArea
                value={draft[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => {
                  setDraft({ ...draft, [f.key]: e.target.value })
                  setStatus('idle')
                }}
                onBlur={save}
              />
            </Field>
          ))}
        </div>
        <ErrorText>{error}</ErrorText>
      </Card>

      <section className="space-y-3">
        <SectionTitle>HISTORY</SectionTitle>
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries" />
        {history.length === 0 && <Empty>{query ? 'No matches.' : 'Past entries will show here.'}</Empty>}
        {history.map((r) => (
          <Card key={r.id} onClick={() => setDate(r.date)}>
            <div className="text-xs uppercase tracking-widest text-mute mb-1">{fmtDate(parseYmd(r.date), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            {FIELDS.map((f) =>
              r[f.key] ? (
                <p key={f.key} className="text-sm line-clamp-2">
                  <span className="text-mute">{f.label}: </span>
                  {r[f.key]}
                </p>
              ) : null,
            )}
          </Card>
        ))}
      </section>
    </Page>
  )
}
