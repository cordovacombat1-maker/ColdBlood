import { useState } from 'react'
import { deleteRow, insertRow, updateRow, useRows } from '../../lib/data'
import { useFights } from '../../lib/fights'
import { useProfile } from '../../lib/profile'
import { daysBetween, fmtDate, fmtTime, toLocalInput } from '../../lib/dates'
import { fmtWeight, fromInput, toDisplay } from '../../lib/units'
import type { Contact, Fight, FightContact, FightStatus } from '../../lib/types'
import { Button, Card, Chips, Empty, ErrorText, Field, Input, Page, SectionTitle, Select, Sheet, TextArea } from '../../components/ui'

const STATUSES: FightStatus[] = ['upcoming', 'won', 'lost', 'draw', 'NC']
export const CHECKLIST = [
  { key: 'medicals', label: 'Medicals submitted' },
  { key: 'gear', label: 'Gear packed' },
  { key: 'travel', label: 'Travel confirmed' },
  { key: 'weighin', label: 'Weigh-in time & location confirmed' },
  { key: 'cutman', label: 'Cutman confirmed' },
]

export default function Fights() {
  const { rows: fights } = useFights()
  const { units } = useProfile()
  const [editing, setEditing] = useState<Fight | 'new' | null>(null)
  const upcoming = fights.filter((f) => f.status === 'upcoming')
  const past = fights.filter((f) => f.status !== 'upcoming').reverse()
  const tally = past.reduce(
    (t, f) => {
      if (f.status === 'won') t.w++
      if (f.status === 'lost') t.l++
      if (f.status === 'draw') t.d++
      if (f.status === 'won' && /ko|tko|stoppage/i.test(f.method ?? '')) t.ko++
      return t
    },
    { w: 0, l: 0, d: 0, ko: 0 },
  )

  return (
    <Page title="Fights" back="/more" actions={<Button onClick={() => setEditing('new')} className="min-h-10 px-4 text-base">+ Fight</Button>}>
      <section className="space-y-2">
        <SectionTitle>UPCOMING</SectionTitle>
        {upcoming.length === 0 && <Empty>No fights booked.</Empty>}
        {upcoming.map((f) => (
          <FightCard key={f.id} fight={f} units={units} onEdit={() => setEditing(f)} />
        ))}
      </section>
      <section className="space-y-2">
        <SectionTitle>
          RECORD IN APP · {tally.w}-{tally.l}-{tally.d} ({tally.ko} KO)
        </SectionTitle>
        {past.length === 0 && <p className="text-mute text-sm">Finished fights you log here show up in your record. Set your full pro record in Profile.</p>}
        {past.map((f) => (
          <Card key={f.id} onClick={() => setEditing(f)}>
            <div className="flex justify-between">
              <span className="font-semibold">vs {f.opponent || 'TBA'}</span>
              <span className={`font-display uppercase ${f.status === 'won' ? 'text-green-400' : f.status === 'lost' ? 'text-blood' : 'text-mute'}`}>{f.status}</span>
            </div>
            <div className="text-sm text-mute">
              {fmtDate(f.date, { month: 'short', day: 'numeric', year: 'numeric' })}
              {f.method && ` · ${f.method}`}
              {f.round_ended && ` R${f.round_ended}`}
              {f.venue && ` · ${f.venue}`}
            </div>
          </Card>
        ))}
      </section>
      {editing && <FightSheet fight={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function FightCard({ fight, units, onEdit }: { fight: Fight; units: 'lb' | 'kg'; onEdit: () => void }) {
  const days = daysBetween(new Date(), new Date(fight.date))
  const fightWeek = days <= 7
  const checklist = fight.checklist ?? {}
  const toggle = (k: string) => updateRow('fights', fight.id, { checklist: { ...checklist, [k]: !checklist[k] } })
  return (
    <Card className={fightWeek ? 'border-blood' : ''}>
      <button type="button" onClick={onEdit} className="w-full text-left">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-display uppercase text-2xl">vs {fight.opponent || 'TBA'}</div>
            <div className="text-sm text-mute">
              {fmtDate(fight.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {fight.venue && ` · ${fight.venue}`}
              {fight.city && `, ${fight.city}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-blood leading-none">{Math.max(0, days)}</div>
            <div className="text-xs text-mute">days</div>
          </div>
        </div>
        <div className="text-sm mt-2 text-mute">
          {[fight.contract_weight && `Contract ${fmtWeight(fight.contract_weight, units)}`, fight.rounds && `${fight.rounds} rds`, fight.commission].filter(Boolean).join(' · ')}
        </div>
        {fight.weigh_in_at && (
          <div className="text-sm mt-1">
            Weigh-in {fmtDate(fight.weigh_in_at, { weekday: 'short', month: 'short', day: 'numeric' })} {fmtTime(fight.weigh_in_at)}
          </div>
        )}
      </button>
      {fightWeek && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="text-xs uppercase tracking-widest text-mute mb-2">Fight week checklist</div>
          <ul className="space-y-1">
            {CHECKLIST.map((c) => (
              <li key={c.key}>
                <button type="button" onClick={() => toggle(c.key)} className="flex items-center gap-3 min-h-11 w-full text-left">
                  <span className={`w-6 h-6 rounded border-2 grid place-items-center text-sm ${checklist[c.key] ? 'bg-blood border-blood text-white' : 'border-line'}`}>{checklist[c.key] ? '✓' : ''}</span>
                  <span className={checklist[c.key] ? 'line-through text-mute' : ''}>{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function FightSheet({ fight, onClose }: { fight: Fight | null; onClose: () => void }) {
  const { units } = useProfile()
  const { rows: contacts } = useRows<Contact>('contacts', { order: 'name', ascending: true })
  const { rows: links } = useRows<FightContact>('fight_contacts')
  const init = (d: string | null | undefined) => (d ? toLocalInput(new Date(d)) : '')
  const [f, setF] = useState({
    date: init(fight?.date) || toLocalInput(new Date(new Date().setHours(19, 0, 0, 0))),
    opponent: fight?.opponent ?? '',
    venue: fight?.venue ?? '',
    city: fight?.city ?? '',
    commission: fight?.commission ?? '',
    weigh_in_at: init(fight?.weigh_in_at),
    contract_weight: fight?.contract_weight ? toDisplay(fight.contract_weight, units).toFixed(1) : '',
    rounds: fight?.rounds?.toString() ?? '',
    purse: fight?.purse?.toString() ?? '',
    status: fight?.status ?? ('upcoming' as FightStatus),
    method: fight?.method ?? '',
    round_ended: fight?.round_ended?.toString() ?? '',
    notes: fight?.notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const n = (v: string) => (v.trim() ? Number(v) : null)

  const save = async () => {
    if (!f.date) return setError('Set the fight date')
    const cw = n(f.contract_weight)
    const row = {
      date: new Date(f.date).toISOString(),
      opponent: f.opponent || null,
      venue: f.venue || null,
      city: f.city || null,
      commission: f.commission || null,
      weigh_in_at: f.weigh_in_at ? new Date(f.weigh_in_at).toISOString() : null,
      contract_weight: cw == null ? null : Math.round(fromInput(cw, units) * 100) / 100,
      rounds: n(f.rounds),
      purse: n(f.purse),
      status: f.status,
      method: f.method || null,
      round_ended: n(f.round_ended),
      notes: f.notes || null,
    }
    try {
      if (fight) await updateRow('fights', fight.id, row)
      else await insertRow('fights', row)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const team = fight ? links.filter((l) => l.fight_id === fight.id) : []
  const addTeam = async (contactId: string) => {
    if (!fight || !contactId) return
    const c = contacts.find((x) => x.id === contactId)
    await insertRow('fight_contacts', { fight_id: fight.id, contact_id: contactId, role: c?.role ?? null })
  }

  return (
    <Sheet open title={fight ? 'Edit fight' : 'New fight'} onClose={onClose}>
      <Field label="Fight night">
        <Input type="datetime-local" value={f.date} onChange={set('date')} />
      </Field>
      <Field label="Opponent">
        <Input value={f.opponent} onChange={set('opponent')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Venue">
          <Input value={f.venue} onChange={set('venue')} />
        </Field>
        <Field label="City">
          <Input value={f.city} onChange={set('city')} />
        </Field>
      </div>
      <Field label="Commission">
        <Input value={f.commission} onChange={set('commission')} />
      </Field>
      <Field label="Weigh-in">
        <Input type="datetime-local" value={f.weigh_in_at} onChange={set('weigh_in_at')} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Contract (${units})`}>
          <Input type="number" inputMode="decimal" step="0.1" value={f.contract_weight} onChange={set('contract_weight')} />
        </Field>
        <Field label="Rounds">
          <Input type="number" inputMode="numeric" value={f.rounds} onChange={set('rounds')} />
        </Field>
        <Field label="Purse ($)">
          <Input type="number" inputMode="decimal" value={f.purse} onChange={set('purse')} />
        </Field>
      </div>
      <Field label="Status">
        <Chips options={STATUSES} value={f.status} onChange={(s) => setF({ ...f, status: s })} cols={5} />
      </Field>
      {f.status !== 'upcoming' && (
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Method">
            <Input value={f.method} onChange={set('method')} placeholder="KO, TKO, UD, SD, MD…" />
          </Field>
          <Field label="Round">
            <Input type="number" inputMode="numeric" value={f.round_ended} onChange={set('round_ended')} />
          </Field>
        </div>
      )}
      <Field label="Notes">
        <TextArea value={f.notes} onChange={set('notes')} />
      </Field>

      {fight && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-mute">Team for this fight</div>
          {team.map((l) => {
            const c = contacts.find((x) => x.id === l.contact_id)
            return (
              <div key={l.id} className="flex items-center justify-between bg-raised rounded-xl px-3 min-h-12">
                <span>
                  {c?.name ?? 'Contact'} <span className="text-mute text-sm capitalize">· {l.role}</span>
                </span>
                <button type="button" className="w-10 h-10 text-mute" aria-label="Remove" onClick={() => deleteRow('fight_contacts', l.id)}>
                  ×
                </button>
              </div>
            )
          })}
          <Select value="" onChange={(e) => addTeam(e.target.value)}>
            <option value="">+ Add contact…</option>
            {contacts
              .filter((c) => !team.some((l) => l.contact_id === c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
          </Select>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <Button onClick={save} className="w-full">
        Save
      </Button>
      {fight && (
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (confirm('Delete this fight?')) {
              await deleteRow('fights', fight.id)
              onClose()
            }
          }}
        >
          Delete
        </Button>
      )}
    </Sheet>
  )
}
