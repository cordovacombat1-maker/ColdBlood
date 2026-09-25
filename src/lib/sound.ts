// Boxing-gym bells synthesized with Web Audio (no audio files to load).
let ctx: AudioContext | null = null

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Call from a tap handler so iOS allows sound later in the session.
export function unlockAudio() {
  audio()
}

function strike(at: number, volume = 0.9) {
  const ac = audio()
  // A bell is a few inharmonic partials with a fast attack and long decay.
  for (const [ratio, gain] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 830 * ratio
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(volume * gain, at + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
    osc.connect(g).connect(ac.destination)
    osc.start(at)
    osc.stop(at + 1.7)
  }
}

export function bell(times = 1, gap = 0.35) {
  const now = audio().currentTime
  for (let i = 0; i < times; i++) strike(now + i * gap)
}

// Sharp clacks for the 10-second warning.
export function clapper() {
  const ac = audio()
  const now = ac.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'square'
    osc.frequency.value = 1400
    const t = now + i * 0.18
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    osc.connect(g).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  }
}

export function softChime() {
  const now = audio().currentTime
  strike(now, 0.35)
}
