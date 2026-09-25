export interface TimerConfig {
  rounds: number
  roundSec: number
  restSec: number
  warnSec: number
  prepSec: number
}

export type Phase = 'prep' | 'round' | 'rest' | 'done'

export interface TimerState {
  phase: Phase
  round: number // 1-based; during rest, the round just finished
  remaining: number // seconds left in this phase
  phaseLength: number
}

// Pure function of elapsed time, so the display never drifts even if the
// tab is throttled in the background.
export function timerAt(cfg: TimerConfig, elapsedSec: number): TimerState {
  let t = elapsedSec
  if (t < cfg.prepSec) return { phase: 'prep', round: 1, remaining: cfg.prepSec - t, phaseLength: cfg.prepSec }
  t -= cfg.prepSec
  for (let r = 1; r <= cfg.rounds; r++) {
    if (t < cfg.roundSec) return { phase: 'round', round: r, remaining: cfg.roundSec - t, phaseLength: cfg.roundSec }
    t -= cfg.roundSec
    if (r === cfg.rounds) break
    if (t < cfg.restSec) return { phase: 'rest', round: r, remaining: cfg.restSec - t, phaseLength: cfg.restSec }
    t -= cfg.restSec
  }
  return { phase: 'done', round: cfg.rounds, remaining: 0, phaseLength: 0 }
}

export function totalSeconds(cfg: TimerConfig): number {
  return cfg.prepSec + cfg.rounds * cfg.roundSec + Math.max(0, cfg.rounds - 1) * cfg.restSec
}

// Elapsed time at which the current phase ends (used by "skip").
export function phaseEnd(cfg: TimerConfig, elapsedSec: number): number {
  const s = timerAt(cfg, elapsedSec)
  return s.phase === 'done' ? elapsedSec : elapsedSec + s.remaining
}
