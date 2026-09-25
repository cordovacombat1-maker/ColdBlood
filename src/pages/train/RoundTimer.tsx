import { useEffect, useRef, useState } from 'react'
import { Button, Chips, Page } from '../../components/ui'
import { bell, clapper, unlockAudio } from '../../lib/sound'
import { phaseEnd, timerAt, totalSeconds, type Phase, type TimerConfig } from '../../lib/timer'
import { useWakeLock } from '../../lib/wakeLock'
import { fmtClock } from '../../lib/dates'
import TrainNav from './TrainNav'

const PRESETS: { name: string; cfg: TimerConfig }[] = [
  { name: 'Pro 12×3', cfg: { rounds: 12, roundSec: 180, restSec: 60, warnSec: 10, prepSec: 10 } },
  { name: 'Sparring 6×3', cfg: { rounds: 6, roundSec: 180, restSec: 60, warnSec: 10, prepSec: 10 } },
  { name: 'Bag 8×3', cfg: { rounds: 8, roundSec: 180, restSec: 30, warnSec: 10, prepSec: 10 } },
  { name: 'Am 3×3', cfg: { rounds: 3, roundSec: 180, restSec: 60, warnSec: 10, prepSec: 10 } },
]
const KEY = 'cb:timer:cfg'

function loadCfg(): TimerConfig {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerConfig | null
    if (c && c.rounds > 0) return c
  } catch {
    /* ignore */
  }
  return PRESETS[0].cfg
}

const phaseStyle: Record<Phase, string> = {
  prep: 'bg-raised text-bone',
  round: 'bg-blood text-white',
  rest: 'bg-panel text-bone',
  done: 'bg-panel text-bone',
}

export default function RoundTimer() {
  const [cfg, setCfg] = useState<TimerConfig>(loadCfg)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  // Wall-clock anchor: elapsed = (now - startedAt) / 1000 while running.
  const startedAt = useRef(0)
  const lastState = useRef<{ phase: Phase; round: number; warned: boolean }>({ phase: 'prep', round: 1, warned: false })

  useWakeLock(started)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg))
    } catch {
      /* ignore */
    }
  }, [cfg])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 100)
    return () => window.clearInterval(id)
  }, [running])

  const state = timerAt(cfg, elapsed)

  // Sounds on phase transitions.
  useEffect(() => {
    if (!started) return
    const prev = lastState.current
    if (state.phase !== prev.phase || state.round !== prev.round) {
      if (state.phase === 'round') bell(1)
      else if (state.phase === 'rest' || state.phase === 'done') bell(3)
      if ('vibrate' in navigator) navigator.vibrate(state.phase === 'round' ? 400 : [200, 100, 200, 100, 200])
      lastState.current = { phase: state.phase, round: state.round, warned: false }
      if (state.phase === 'done') setRunning(false)
    } else if (!prev.warned && state.phase === 'round' && state.remaining <= cfg.warnSec && cfg.roundSec > cfg.warnSec) {
      clapper()
      lastState.current = { ...prev, warned: true }
    } else if (!prev.warned && state.phase === 'rest' && state.remaining <= 5) {
      clapper()
      lastState.current = { ...prev, warned: true }
    }
  }, [state.phase, state.round, state.remaining, started, cfg.warnSec, cfg.roundSec])

  const start = () => {
    unlockAudio()
    startedAt.current = Date.now() - elapsed * 1000
    if (!started) lastState.current = { phase: 'prep', round: 1, warned: false }
    setStarted(true)
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setStarted(false)
    setElapsed(0)
  }
  const skip = () => {
    const to = phaseEnd(cfg, elapsed) + 0.01
    startedAt.current = Date.now() - to * 1000
    setElapsed(to)
  }

  if (started) {
    const warn = state.phase === 'round' && state.remaining <= cfg.warnSec
    const pct = state.phaseLength ? 1 - state.remaining / state.phaseLength : 1
    return (
      <div className={`fixed inset-0 z-50 flex flex-col safe-top safe-bottom ${phaseStyle[state.phase]} ${warn ? 'animate-pulse' : ''}`}>
        <div className="flex justify-between items-center px-5 pt-4 font-display uppercase tracking-widest text-xl">
          <span>{state.phase === 'prep' ? 'Get ready' : state.phase === 'rest' ? 'Rest' : state.phase === 'done' ? 'Done' : 'Round'}</span>
          <span>
            {state.phase === 'done' ? cfg.rounds : state.phase === 'rest' ? state.round + 1 : state.round} / {cfg.rounds}
          </span>
        </div>
        <div className="flex-1 grid place-items-center">
          <div className="font-display font-bold tabular-nums leading-none" style={{ fontSize: 'min(38vw, 30vh)' }}>
            {fmtClock(state.remaining)}
          </div>
        </div>
        <div className="h-2 bg-black/30 mx-5 rounded-full overflow-hidden">
          <div className="h-full bg-white/80" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          <button type="button" onClick={reset} className="min-h-16 rounded-2xl bg-black/30 font-display uppercase text-xl">
            {state.phase === 'done' ? 'Close' : 'Stop'}
          </button>
          {state.phase !== 'done' && (
            <button type="button" onClick={running ? pause : start} className="min-h-16 rounded-2xl bg-white text-ink font-display uppercase text-xl">
              {running ? 'Pause' : 'Resume'}
            </button>
          )}
          {state.phase !== 'done' && (
            <button type="button" onClick={skip} className="min-h-16 rounded-2xl bg-black/30 font-display uppercase text-xl">
              Skip
            </button>
          )}
        </div>
      </div>
    )
  }

  const num = (k: keyof TimerConfig, v: number) => setCfg((c) => ({ ...c, [k]: v }))
  const total = totalSeconds(cfg)

  return (
    <Page title="Round timer">
      <TrainNav />
      <Chips
        options={PRESETS.map((p) => p.name)}
        value={PRESETS.find((p) => JSON.stringify(p.cfg) === JSON.stringify(cfg))?.name ?? null}
        onChange={(n) => setCfg(PRESETS.find((p) => p.name === n)!.cfg)}
        cols={2}
      />
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Rounds" value={cfg.rounds} step={1} min={1} max={15} fmt={String} onChange={(v) => num('rounds', v)} />
        <Stepper label="Round" value={cfg.roundSec} step={30} min={30} max={600} fmt={fmtClock} onChange={(v) => num('roundSec', v)} />
        <Stepper label="Rest" value={cfg.restSec} step={15} min={0} max={300} fmt={fmtClock} onChange={(v) => num('restSec', v)} />
        <Stepper label="Warning" value={cfg.warnSec} step={5} min={0} max={30} fmt={(v) => `${v}s`} onChange={(v) => num('warnSec', v)} />
      </div>
      <p className="text-mute text-sm text-center">Total {fmtClock(total)} · screen stays awake · turn your volume up</p>
      <Button onClick={start} className="w-full min-h-20 text-3xl">
        Start
      </Button>
    </Page>
  )
}

function Stepper({ label, value, step, min, max, fmt, onChange }: { label: string; value: number; step: number; min: number; max: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-mute mb-1">{label}</div>
      <div className="flex items-center bg-raised border border-line rounded-xl">
        <button type="button" aria-label={`Less ${label}`} className="w-14 h-14 text-2xl" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <div className="flex-1 text-center font-display text-2xl tabular-nums">{fmt(value)}</div>
        <button type="button" aria-label={`More ${label}`} className="w-14 h-14 text-2xl" onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  )
}
