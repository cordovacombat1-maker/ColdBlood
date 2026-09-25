// Imports The Master Key System (Charles F. Haanel, 1916 — public domain in
// the US) from a plain-text public-domain transcription into
// src/content/master-key/part-NN.md.
//
// Usage: npm run mk:import -- path/to/master-key.txt
//
// Use an unannotated public-domain edition (e.g. the 1916/1917 text on
// Wikisource or Internet Archive). Do NOT use modern annotated editions.
// After importing, skim each part and fix any OCR errors the cleanup missed.
//
// Each output file has the form:
//   # Part One
//   <body markdown>
//   ## Exercise
//   <that week's exercise paragraph(s), shown as a checklist in the app>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const NUMS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE',
  'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY',
  'TWENTY-ONE', 'TWENTY-TWO', 'TWENTY-THREE', 'TWENTY-FOUR']
const title = (i) => 'Part ' + NUMS[i].toLowerCase().replace(/(^|-)([a-z])/g, (_, a, b) => a + b.toUpperCase())

export function clean(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/­/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2') // words hyphenated across line breaks
    .replace(/^\s*\d+\s*$/gm, '') // bare page numbers
    .replace(/[ \t]+/g, ' ')
}

// Re-flows hard-wrapped lines into paragraphs separated by blank lines.
export function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

export function splitParts(text) {
  const re = new RegExp(`^\\s*PART\\s+(${NUMS.join('|')})\\s*\\.?\\s*$`, 'gim')
  const marks = [...text.matchAll(re)]
  const parts = []
  for (let i = 0; i < marks.length; i++) {
    const n = NUMS.indexOf(marks[i][1].toUpperCase())
    const body = text.slice(marks[i].index + marks[i][0].length, marks[i + 1]?.index ?? text.length)
    // Keep the last occurrence (a table of contents lists every part first).
    parts[n] = body
  }
  return parts
}

export function toMarkdown(i, body) {
  const paras = paragraphs(clean(body))
  const qIdx = paras.findIndex((p) => /^(study questions|questions and answers|questions)\b/i.test(p))
  const main = qIdx >= 0 ? paras.slice(0, qIdx) : paras
  const exerciseIdx = main.map((p, j) => (/\bexercise\b/i.test(p) ? j : -1)).filter((j) => j >= 0).pop()
  const exercise = exerciseIdx != null ? [main[exerciseIdx]] : []
  const bodyParas = paras.filter((_, j) => j !== exerciseIdx).map((p) =>
    /^(study questions|questions and answers|questions)\b/i.test(p) ? `### ${p}` : p,
  )
  return [`# ${title(i)}`, '', bodyParas.join('\n\n'), '', '## Exercise', '', exercise.join('\n\n') || '_(Exercise not detected — copy it here from the text.)_', ''].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2]
  if (!src) {
    console.error('Usage: npm run mk:import -- path/to/master-key.txt')
    process.exit(1)
  }
  const parts = splitParts(readFileSync(src, 'utf8'))
  mkdirSync('src/content/master-key', { recursive: true })
  let written = 0
  parts.forEach((body, i) => {
    if (!body) return
    writeFileSync(`src/content/master-key/part-${String(i + 1).padStart(2, '0')}.md`, toMarkdown(i, body))
    written++
  })
  console.log(`Wrote ${written} of 24 parts.`)
  const missing = NUMS.map((_, i) => i).filter((i) => !parts[i]).map((i) => i + 1)
  if (missing.length) console.warn('Missing parts:', missing.join(', '), '— check the source file headings.')
}
