// The Master Key System by Charles F. Haanel (1916), public domain in the US.
// Bundled with the app so it reads offline. See scripts/import-master-key.mjs.
const files = import.meta.glob('./master-key/part-*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface MkPart {
  n: number
  title: string
  body: string // markdown without the title and exercise sections
  exercise: string // markdown
  imported: boolean
}

export function parsePart(n: number, raw: string): MkPart {
  const titleMatch = raw.match(/^#\s+(.+)$/m)
  const [before, exercise = ''] = raw.split(/^##\s+Exercise\s*$/m)
  const body = before.replace(/^#\s+.+$/m, '').trim()
  return {
    n,
    title: titleMatch?.[1].trim() ?? `Part ${n}`,
    body,
    exercise: exercise.trim(),
    imported: !/has not been imported yet/.test(body),
  }
}

export const MK_PARTS: MkPart[] = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1
  const raw = files[`./master-key/part-${String(n).padStart(2, '0')}.md`] ?? `# Part ${n}\n`
  return parsePart(n, raw)
})
