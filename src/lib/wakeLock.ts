import { useEffect } from 'react'

// Keeps the screen on while `active` (round timer, MK session).
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        /* denied or unsupported */
      }
    }
    void acquire()
    // The lock is dropped when the tab is hidden; re-take it on return.
    const onVis = () => document.visibilityState === 'visible' && void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [active])
}
