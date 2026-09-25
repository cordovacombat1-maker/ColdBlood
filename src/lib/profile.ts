import { useSingleton } from './data'
import type { Profile, Units } from './types'

export function useProfile() {
  const p = useSingleton<Profile>('profiles')
  const units: Units = p.row?.units ?? 'lb'
  return { ...p, profile: p.row, units }
}
