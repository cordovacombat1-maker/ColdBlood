import { describe, expect, it } from 'vitest'
import { splitParts, toMarkdown } from './import-master-key.mjs'

describe('Master Key importer', () => {
  it('splits parts, reflows lines, and pulls out the exercise', () => {
    const txt = `CONTENTS\nPART ONE\nPART TWO\n\nPART ONE\n\n1. The first para-\ngraph wraps\nacross lines.\n\n12\n\n2. For your exercise this week,\nsit still.\n\nStudy Questions\n\n1. What?\n\nPART TWO\n\nSecond part text.`
    const parts = splitParts(txt)
    expect(parts.filter(Boolean)).toHaveLength(2)
    const md = toMarkdown(0, parts[0])
    expect(md).toContain('# Part One')
    expect(md).toContain('1. The first paragraph wraps across lines.')
    expect(md).toContain('## Exercise\n\n2. For your exercise this week, sit still.')
    expect(md).toContain('### Study Questions')
    expect(md.split('## Exercise')[0]).not.toContain('sit still')
  })
})
