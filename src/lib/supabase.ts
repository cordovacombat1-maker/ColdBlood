import { createClient } from '@supabase/supabase-js'

// Tolerate values pasted with surrounding spaces or quotes.
const clean = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '').trim() : '')

const url = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
const anonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseEnv = {
  hasUrl: Boolean(url),
  urlValid: /^https:\/\/[^/]+$/.test(url),
  hasKey: Boolean(anonKey),
}

export const supabaseConfigured = supabaseEnv.hasUrl && supabaseEnv.urlValid && supabaseEnv.hasKey

// A placeholder client keeps the app bootable (showing a setup screen)
// when env vars are missing, instead of crashing on import.
export const supabase = createClient(supabaseConfigured ? url : 'http://localhost', anonKey || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
