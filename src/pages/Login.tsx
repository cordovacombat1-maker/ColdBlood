import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Button, ErrorText, Field, Input, Segmented } from '../components/ui'

type Mode = 'signin' | 'signup' | 'link'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const redirect = window.location.origin
    const res =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'signup'
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })
          : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
    setBusy(false)
    if (res.error) return setError(res.error.message)
    if (mode === 'link') setMessage('Check your email for a sign-in link.')
    else if (mode === 'signup' && !res.data.session) setMessage('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="mx-auto max-w-md min-h-dvh px-6 flex flex-col justify-center gap-8 safe-top safe-bottom">
      <div>
        <h1 className="text-6xl font-bold leading-none">
          COLD <span className="text-blood">BLOOD</span>
        </h1>
        <p className="text-mute mt-2">Train. Make weight. Stay composed.</p>
      </div>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'signin', label: 'Sign in' },
          { value: 'signup', label: 'Sign up' },
          { value: 'link', label: 'Email link' },
        ]}
      />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode !== 'link' && (
          <Field label="Password">
            <Input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <ErrorText>{error}</ErrorText>
        {message && <p className="text-sm text-bone">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? '…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}
        </Button>
      </form>
    </div>
  )
}
