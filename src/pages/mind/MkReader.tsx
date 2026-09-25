import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marked } from 'marked'
import { MK_PARTS } from '../../content/masterKey'
import { Page } from '../../components/ui'

type Theme = 'dark' | 'sepia'
const SIZES = [16, 18, 20, 23, 26]

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k)
    return v == null ? d : (JSON.parse(v) as T)
  } catch {
    return d
  }
}

export default function MkReader() {
  const n = Math.min(24, Math.max(1, Number(useParams().part) || 1))
  const part = MK_PARTS[n - 1]
  const [size, setSize] = useState(() => load('cb:reader:size', 1))
  const [theme, setTheme] = useState<Theme>(() => load('cb:reader:theme', 'dark'))
  const [rate, setRate] = useState(() => load('cb:reader:rate', 1))
  const [speaking, setSpeaking] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [current, setCurrent] = useState(-1)
  const queueRef = useRef<number>(0)

  useEffect(() => localStorage.setItem('cb:reader:size', JSON.stringify(size)), [size])
  useEffect(() => localStorage.setItem('cb:reader:theme', JSON.stringify(theme)), [theme])
  useEffect(() => localStorage.setItem('cb:reader:rate', JSON.stringify(rate)), [rate])

  const blocks = useMemo(() => {
    const md = `${part.body}\n\n## Exercise\n\n${part.exercise}`
    return md.split(/\n\s*\n/).filter((b) => b.trim())
  }, [part])
  const plain = useMemo(() => blocks.map((b) => b.replace(/[#*_>`]/g, '').trim()), [blocks])

  const tts = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Speak one block at a time: long utterances get cut off on some browsers.
  const speakFrom = (i: number) => {
    if (!tts) return
    speechSynthesis.cancel()
    const token = ++queueRef.current
    const next = (j: number) => {
      if (token !== queueRef.current) return
      if (j >= plain.length) {
        setSpeaking('idle')
        setCurrent(-1)
        return
      }
      setCurrent(j)
      document.getElementById(`mk-b${j}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const u = new SpeechSynthesisUtterance(plain[j])
      u.rate = rate
      u.onend = () => next(j + 1)
      speechSynthesis.speak(u)
    }
    setSpeaking('playing')
    next(i)
  }
  const stop = () => {
    queueRef.current++
    if (tts) speechSynthesis.cancel()
    setSpeaking('idle')
    setCurrent(-1)
  }
  // Stop narration when leaving the page or switching parts.
  useEffect(() => () => {
    queueRef.current++
    if (tts) speechSynthesis.cancel()
  }, [n, tts])

  const togglePause = () => {
    if (speaking === 'playing') {
      speechSynthesis.pause()
      setSpeaking('paused')
    } else if (speaking === 'paused') {
      speechSynthesis.resume()
      setSpeaking('playing')
    } else speakFrom(0)
  }

  return (
    <Page title={part.title} back="/mind/master-key">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="min-h-11 px-3 rounded-lg bg-raised" onClick={() => setSize(Math.max(0, size - 1))} aria-label="Smaller text">
          A−
        </button>
        <button type="button" className="min-h-11 px-3 rounded-lg bg-raised text-lg" onClick={() => setSize(Math.min(SIZES.length - 1, size + 1))} aria-label="Larger text">
          A+
        </button>
        <button type="button" className="min-h-11 px-3 rounded-lg bg-raised" onClick={() => setTheme(theme === 'dark' ? 'sepia' : 'dark')}>
          {theme === 'dark' ? 'Sepia' : 'Dark'}
        </button>
        {tts && (
          <>
            <button type="button" className="min-h-11 px-4 rounded-lg bg-blood text-white font-semibold" onClick={togglePause}>
              {speaking === 'playing' ? '❚❚ Pause' : speaking === 'paused' ? '▶ Resume' : '▶ Listen'}
            </button>
            {speaking !== 'idle' && (
              <button type="button" className="min-h-11 px-3 rounded-lg bg-raised" onClick={stop}>
                ■
              </button>
            )}
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="min-h-11 rounded-lg bg-raised px-2" aria-label="Speech speed">
              {[0.8, 0.9, 1, 1.1, 1.25, 1.5].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <article className={`prose-mk rounded-2xl p-5 -mx-1 ${theme === 'sepia' ? 'reader-sepia' : 'bg-panel'}`} style={{ fontSize: SIZES[size] }}>
        {blocks.map((b, i) => (
          <div
            key={i}
            id={`mk-b${i}`}
            onDoubleClick={() => tts && speakFrom(i)}
            className={i === current ? 'bg-blood/15 -mx-2 px-2 rounded' : ''}
            dangerouslySetInnerHTML={{ __html: marked.parse(b, { async: false }) }}
          />
        ))}
      </article>
      {tts && <p className="text-xs text-mute text-center">Tip: double-tap a paragraph to start listening from there.</p>}

      <div className="flex justify-between">
        {n > 1 ? <Link className="min-h-12 px-4 grid place-items-center text-mute" to={`/mind/master-key/${n - 1}`}>‹ Part {n - 1}</Link> : <span />}
        {n < 24 && <Link className="min-h-12 px-4 grid place-items-center text-mute" to={`/mind/master-key/${n + 1}`}>Part {n + 1} ›</Link>}
      </div>
    </Page>
  )
}
