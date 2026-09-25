import { useRef, useState } from 'react'
import { deleteRow, insertRow, updateRow, useRows } from '../../lib/data'
import { parseVCards } from '../../lib/vcard'
import { CONTACT_ROLES, type Contact, type ContactRole } from '../../lib/types'
import { Button, Chips, Empty, ErrorText, Field, Input, Page, Select, Sheet, TextArea } from '../../components/ui'

export default function Contacts() {
  const { rows } = useRows<Contact>('contacts', { order: 'name', ascending: true })
  const [q, setQ] = useState('')
  const [role, setRole] = useState<ContactRole | 'all'>('all')
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const query = q.trim().toLowerCase()
  const list = rows
    .filter((c) => role === 'all' || c.role === role)
    .filter((c) => !query || [c.name, c.company, c.city, c.email, c.phone, c.notes].some((v) => v?.toLowerCase().includes(query)))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  const rolesInUse = CONTACT_ROLES.filter((r) => rows.some((c) => c.role === r))

  const importVcf = async (file: File) => {
    const cards = parseVCards(await file.text())
    const existing = new Set(rows.map((c) => c.name.toLowerCase()))
    let added = 0
    for (const c of cards) {
      if (existing.has(c.name.toLowerCase())) continue
      await insertRow('contacts', { ...c, role: 'other', favorite: false })
      added++
    }
    setImportMsg(`Imported ${added} contact${added === 1 ? '' : 's'}${cards.length - added ? ` (${cards.length - added} already here)` : ''}. Set their roles below.`)
  }

  return (
    <Page title="Contacts" back="/more" actions={<Button onClick={() => setEditing('new')} className="min-h-10 px-4 text-base">+ Add</Button>}>
      <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, city…" />
      {rolesInUse.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {(['all', ...rolesInUse] as const).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`shrink-0 min-h-10 px-4 rounded-full border capitalize text-sm ${role === r ? 'bg-bone text-ink border-bone' : 'border-line text-mute'}`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {importMsg && <p className="text-sm">{importMsg}</p>}
      {list.length === 0 && <Empty>{rows.length ? 'No matches.' : 'Add your trainer, manager, cutman, promoter…'}</Empty>}
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className="bg-panel border border-line rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => updateRow('contacts', c.id, { favorite: !c.favorite })} className={`w-10 h-10 text-xl ${c.favorite ? 'text-blood' : 'text-line'}`} aria-label={c.favorite ? 'Unfavorite' : 'Favorite'}>
                ★
              </button>
              <button type="button" className="flex-1 text-left min-h-10" onClick={() => setEditing(c)}>
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-mute capitalize">
                  {c.role}
                  {c.company && <span className="normal-case"> · {c.company}</span>}
                  {c.city && <span className="normal-case"> · {c.city}</span>}
                </div>
              </button>
            </div>
            {(c.phone || c.email) && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <ActionLink href={c.phone ? `tel:${c.phone}` : null} label="Call" />
                <ActionLink href={c.phone ? `sms:${c.phone}` : null} label="Text" />
                <ActionLink href={c.email ? `mailto:${c.email}` : null} label="Email" />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="pt-4">
        <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" className="hidden" onChange={(e) => e.target.files?.[0] && importVcf(e.target.files[0])} />
        <Button variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
          Import vCard (.vcf)
        </Button>
        <p className="text-xs text-mute mt-2">Export a contact from your phone's Contacts app (Share → vCard), then import it here.</p>
      </div>
      {editing && <ContactSheet contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function ActionLink({ href, label }: { href: string | null; label: string }) {
  return href ? (
    <a href={href} className="min-h-11 rounded-xl bg-raised grid place-items-center font-display uppercase tracking-wider active:bg-line">
      {label}
    </a>
  ) : (
    <span className="min-h-11 rounded-xl border border-line/50 grid place-items-center font-display uppercase tracking-wider text-line">{label}</span>
  )
}

function ContactSheet({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const [c, setC] = useState({
    name: contact?.name ?? '',
    role: contact?.role ?? ('trainer' as ContactRole),
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    company: contact?.company ?? '',
    city: contact?.city ?? '',
    notes: contact?.notes ?? '',
    favorite: contact?.favorite ?? false,
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof c) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value })

  const save = async () => {
    if (!c.name.trim()) return setError('Add a name')
    const row = {
      ...c,
      name: c.name.trim(),
      phone: c.phone || null,
      email: c.email || null,
      company: c.company || null,
      city: c.city || null,
      notes: c.notes || null,
    }
    try {
      if (contact) await updateRow('contacts', contact.id, row)
      else await insertRow('contacts', row)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Sheet open title={contact ? 'Edit contact' : 'New contact'} onClose={onClose}>
      <Field label="Name">
        <Input value={c.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field label="Role">
        <Select value={c.role} onChange={(e) => setC({ ...c, role: e.target.value as ContactRole })} className="capitalize">
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input type="tel" inputMode="tel" value={c.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email">
          <Input type="email" inputMode="email" value={c.email} onChange={set('email')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company">
          <Input value={c.company} onChange={set('company')} />
        </Field>
        <Field label="City">
          <Input value={c.city} onChange={set('city')} />
        </Field>
      </div>
      <Field label="Notes">
        <TextArea value={c.notes} onChange={set('notes')} />
      </Field>
      <Chips options={['Favorite'] as const} value={c.favorite ? 'Favorite' : null} onChange={() => setC({ ...c, favorite: !c.favorite })} />
      <ErrorText>{error}</ErrorText>
      <Button onClick={save} className="w-full">
        Save
      </Button>
      {contact && (
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (confirm(`Delete ${contact.name}?`)) {
              await deleteRow('contacts', contact.id)
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
