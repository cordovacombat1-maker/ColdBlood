export interface VCardContact {
  name: string
  phone: string | null
  email: string | null
  company: string | null
  city: string | null
  notes: string | null
}

// Minimal vCard 2.1/3.0/4.0 reader: FN/N, TEL, EMAIL, ORG, ADR locality, NOTE.
export function parseVCards(text: string): VCardContact[] {
  // Unfold continuation lines (RFC 6350 §3.2).
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out: VCardContact[] = []
  let cur: (VCardContact & { n?: string }) | null = null

  const unescape = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

  for (const raw of lines) {
    const line = raw.trim()
    if (/^BEGIN:VCARD$/i.test(line)) {
      cur = { name: '', phone: null, email: null, company: null, city: null, notes: null }
      continue
    }
    if (/^END:VCARD$/i.test(line)) {
      if (cur) {
        const name = cur.name || cur.n || cur.company || cur.email || cur.phone
        if (name) out.push({ name, phone: cur.phone, email: cur.email, company: cur.company, city: cur.city, notes: cur.notes })
      }
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).split(';')[0].split('.').pop()!.toUpperCase()
    const value = line.slice(idx + 1)
    switch (key) {
      case 'FN':
        cur.name = unescape(value)
        break
      case 'N': {
        const [family = '', given = ''] = value.split(';').map(unescape)
        cur.n = [given, family].filter(Boolean).join(' ')
        break
      }
      case 'TEL':
        cur.phone ??= unescape(value.replace(/^tel:/i, ''))
        break
      case 'EMAIL':
        cur.email ??= unescape(value)
        break
      case 'ORG':
        cur.company ??= unescape(value.split(';')[0])
        break
      case 'ADR':
        cur.city ??= unescape(value.split(';')[3] ?? '') || null
        break
      case 'NOTE':
        cur.notes = unescape(value)
        break
    }
  }
  return out
}
