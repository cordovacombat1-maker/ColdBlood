import { NavLink, Outlet } from 'react-router-dom'
import { usePendingCount } from '../lib/data'
import { useEffect, useState } from 'react'

const tabs = [
  { to: '/', label: 'Home', icon: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { to: '/train', label: 'Train', icon: 'M6 4h7a5 5 0 0 1 5 5v5a4 4 0 0 1-4 4H9a3 3 0 0 1-3-3zM6 9h8M18 12h2v5h-2' },
  { to: '/fuel', label: 'Fuel', icon: 'M5 20h14l-2-12H7zM9 8V6a3 3 0 0 1 6 0v2M12 12v4' },
  { to: '/mind', label: 'Mind', icon: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M15 3l6 0 0 6M21 3l-8 8' },
  { to: '/more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export default function Layout() {
  const pending = usePendingCount()
  const online = useOnline()
  return (
    <div className="mx-auto max-w-md min-h-dvh relative">
      {(!online || pending > 0) && (
        <div className="bg-amber-500 text-ink text-sm font-semibold text-center py-1 safe-top">
          {online ? `Syncing ${pending} log${pending === 1 ? '' : 's'}…` : `Offline${pending ? ` · ${pending} log${pending === 1 ? '' : 's'} saved on this phone` : ' · logs will sync later'}`}
        </div>
      )}
      <Outlet />
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-ink/95 backdrop-blur border-t border-line safe-bottom">
        <div className="mx-auto max-w-md grid grid-cols-5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-16 gap-1 ${isActive ? 'text-blood' : 'text-mute'}`
              }
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={t.icon} />
              </svg>
              <span className="font-display uppercase text-xs tracking-wider">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
