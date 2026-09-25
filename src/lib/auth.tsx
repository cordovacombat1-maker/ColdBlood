import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }))
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export async function signOut() {
  // Clear cached lists so the next account never sees them. Unsynced offline
  // logs stay queued; they only replay when their owner signs back in.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cb:cache:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
  await supabase.auth.signOut()
}
