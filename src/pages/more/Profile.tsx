import { useEffect, useState } from 'react'
import { useProfile } from '../../lib/profile'
import { fromInput, toDisplay } from '../../lib/units'
import type { Profile, Units } from '../../lib/types'
import { Button, Chips, ErrorText, Field, Input, Page, Segmented } from '../../components/ui'

type Form = Record<string, string>

const text = (v: unknown) => (v == null ? '' : String(v))
const num = (v: string) => (v.trim() === '' ? null : Number(v))

export default function ProfilePage() {
  const { profile, save } = useProfile()
  const [form, setForm] = useState<Form>({})
  const [units, setUnits] = useState<Units>('lb')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setUnits(profile.units)
    setForm({
      fighter_name: text(profile.fighter_name),
      nickname: text(profile.nickname),
      weight_class: text(profile.weight_class),
      stance: text(profile.stance),
      height_cm: text(profile.height_cm),
      reach_cm: text(profile.reach_cm),
      gym: text(profile.gym),
      record_w: text(profile.record_w),
      record_l: text(profile.record_l),
      record_d: text(profile.record_d),
      record_ko: text(profile.record_ko),
      walk_around_target: profile.walk_around_target ? toDisplay(profile.walk_around_target, profile.units).toFixed(1) : '',
    })
  }, [profile?.id]) // load once per profile

  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const onSave = async () => {
    const target = num(form.walk_around_target)
    const patch: Partial<Profile> = {
      fighter_name: form.fighter_name || null,
      nickname: form.nickname || null,
      weight_class: form.weight_class || null,
      stance: (form.stance || null) as Profile['stance'],
      height_cm: num(form.height_cm),
      reach_cm: num(form.reach_cm),
      gym: form.gym || null,
      record_w: num(form.record_w) ?? 0,
      record_l: num(form.record_l) ?? 0,
      record_d: num(form.record_d) ?? 0,
      record_ko: num(form.record_ko) ?? 0,
      units,
      walk_around_target: target == null ? null : Math.round(fromInput(target, units) * 100) / 100,
    }
    try {
      await save(patch)
      setError(null)
      setStatus('Saved')
      setTimeout(() => setStatus(null), 2000)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const switchUnits = (u: Units) => {
    // Convert the target field in place so the same weight is kept.
    const t = num(form.walk_around_target)
    if (t != null) setForm({ ...form, walk_around_target: toDisplay(fromInput(t, units), u).toFixed(1) })
    setUnits(u)
  }

  if (!profile) return <Page title="Profile" back="/more"><p className="text-mute">Loading…</p></Page>

  return (
    <Page title="Profile" back="/more">
      <Field label="Fighter name">
        <Input value={form.fighter_name ?? ''} onChange={set('fighter_name')} autoComplete="name" />
      </Field>
      <Field label="Nickname">
        <Input value={form.nickname ?? ''} onChange={set('nickname')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight class">
          <Input value={form.weight_class ?? ''} onChange={set('weight_class')} placeholder="Heavyweight" />
        </Field>
        <Field label="Gym">
          <Input value={form.gym ?? ''} onChange={set('gym')} />
        </Field>
      </div>
      <Field label="Stance">
        <Chips options={['orthodox', 'southpaw', 'switch'] as const} value={(form.stance || null) as 'orthodox' | null} onChange={(v) => setForm({ ...form, stance: v })} cols={3} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Height (cm)">
          <Input type="number" inputMode="decimal" value={form.height_cm ?? ''} onChange={set('height_cm')} />
        </Field>
        <Field label="Reach (cm)">
          <Input type="number" inputMode="decimal" value={form.reach_cm ?? ''} onChange={set('reach_cm')} />
        </Field>
      </div>
      <Field label="Pro record">
        <div className="grid grid-cols-4 gap-2">
          {(['record_w', 'record_l', 'record_d', 'record_ko'] as const).map((k) => (
            <div key={k}>
              <Input type="number" inputMode="numeric" min={0} value={form[k] ?? ''} onChange={set(k)} className="text-center" aria-label={k} />
              <div className="text-center text-xs text-mute mt-1">{k.split('_')[1].toUpperCase()}</div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Units">
        <Segmented value={units} onChange={switchUnits} options={[{ value: 'lb', label: 'Pounds' }, { value: 'kg', label: 'Kilograms' }]} />
      </Field>
      <Field label={`Walk-around target (${units})`} hint="Used on the dashboard when no fight is booked. A booked fight's contract weight takes over.">
        <Input type="number" inputMode="decimal" step="0.1" value={form.walk_around_target ?? ''} onChange={set('walk_around_target')} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button onClick={onSave} className="w-full">
        {status ?? 'Save profile'}
      </Button>
    </Page>
  )
}
