import { useState } from 'react'
import { insertRow } from '../lib/data'
import { useProfile } from '../lib/profile'
import { fromInput } from '../lib/units'
import { ymd } from '../lib/dates'
import { SESSION_TYPES, WEIGH_TIMES, type SessionType } from '../lib/types'
import { Button, Chips, ErrorText, Field, Input, Sheet, TextArea } from './ui'

function defaultTimeOfDay(): (typeof WEIGH_TIMES)[number] {
  const h = new Date().getHours()
  return h < 11 ? 'morning' : h < 16 ? 'midday' : 'evening'
}

export function WeighInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { units } = useProfile()
  const [weight, setWeight] = useState('')
  const [time, setTime] = useState<(typeof WEIGH_TIMES)[number]>(defaultTimeOfDay)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const v = parseFloat(weight)
    if (!v || v < 50 || v > 700) return setError(`Enter a weight in ${units}`)
    setBusy(true)
    try {
      await insertRow('weigh_ins', {
        weight: Math.round(fromInput(v, units) * 100) / 100,
        time_of_day: time,
        taken_at: new Date().toISOString(),
        notes: notes || null,
      })
      setWeight('')
      setNotes('')
      setError(null)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title="Weigh-in" onClose={onClose}>
      <Field label={`Weight (${units})`}>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          autoFocus
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="text-4xl font-display h-20 text-center"
          placeholder="0.0"
        />
      </Field>
      <Chips options={WEIGH_TIMES} value={time} onChange={setTime} />
      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="After roadwork, before breakfast…" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button onClick={save} disabled={busy} className="w-full">
        Save
      </Button>
    </Sheet>
  )
}

const DURATIONS = [30, 45, 60, 90, 120]
const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const DAMAGE = ['none', 'light', 'moderate', 'heavy'] as const

export function SessionSheet({ open, onClose, initialType }: { open: boolean; onClose: () => void; initialType?: SessionType }) {
  const [type, setType] = useState<SessionType | null>(initialType ?? null)
  const [duration, setDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [rounds, setRounds] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [date, setDate] = useState(ymd())
  const [notes, setNotes] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [partner, setPartner] = useState('')
  const [worked, setWorked] = useState('')
  const [didnt, setDidnt] = useState('')
  const [damage, setDamage] = useState<(typeof DAMAGE)[number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setType(initialType ?? null)
    setDuration(null)
    setCustomDuration('')
    setRounds('')
    setRpe(null)
    setDate(ymd())
    setNotes('')
    setVideoUrl('')
    setPartner('')
    setWorked('')
    setDidnt('')
    setDamage(null)
    setError(null)
  }

  const save = async () => {
    if (!type) return setError('Pick a session type')
    setBusy(true)
    try {
      const mins = customDuration ? parseInt(customDuration) : duration
      const session = await insertRow('training_sessions', {
        date,
        type,
        duration_min: mins || null,
        rounds: rounds ? parseInt(rounds) : null,
        rpe_1_10: rpe,
        notes: notes || null,
        video_url: videoUrl || null,
      })
      if (type === 'sparring' && (partner || worked || didnt || damage)) {
        await insertRow('sparring_rounds', {
          session_id: session.id,
          partner: partner || null,
          rounds: rounds ? parseInt(rounds) : null,
          what_worked: worked || null,
          what_didnt: didnt || null,
          damage_taken: damage,
        })
      }
      reset()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title="Log session" onClose={onClose}>
      <Chips options={SESSION_TYPES} value={type} onChange={setType} cols={4} />
      <Field label="Minutes">
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          <Chips
            options={DURATIONS}
            value={customDuration ? null : duration}
            onChange={(d) => {
              setDuration(d)
              setCustomDuration('')
            }}
            cols={5}
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Other"
            aria-label="Other minutes"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
          />
        </div>
      </Field>
      <Button onClick={save} disabled={busy || !type} className="w-full">
        Save session
      </Button>

      <details className="group border-t border-line pt-4">
        <summary className="cursor-pointer text-mute uppercase tracking-widest text-xs py-2">More detail (optional)</summary>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rounds">
              <Input type="number" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Effort (RPE 1–10)">
            <Chips options={RPE} value={rpe} onChange={setRpe} cols={5} />
          </Field>
          {type === 'sparring' && (
            <div className="space-y-4 border border-line rounded-2xl p-3">
              <h3 className="font-bold">Sparring</h3>
              <Field label="Partner">
                <Input value={partner} onChange={(e) => setPartner(e.target.value)} />
              </Field>
              <Field label="What worked">
                <TextArea value={worked} onChange={(e) => setWorked(e.target.value)} />
              </Field>
              <Field label="What didn't">
                <TextArea value={didnt} onChange={(e) => setDidnt(e.target.value)} />
              </Field>
              <Field label="Damage taken">
                <Chips options={DAMAGE} value={damage} onChange={setDamage} cols={4} />
              </Field>
            </div>
          )}
          <Field label="Video link">
            <Input type="url" inputMode="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button onClick={save} disabled={busy || !type} className="w-full">
            Save session
          </Button>
        </div>
      </details>
      <ErrorText>{error}</ErrorText>
    </Sheet>
  )
}
