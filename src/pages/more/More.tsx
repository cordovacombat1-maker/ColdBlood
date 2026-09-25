import { Link } from 'react-router-dom'
import { signOut, useAuth } from '../../lib/auth'
import { usePendingCount } from '../../lib/data'
import { Button, Page } from '../../components/ui'

const LINKS = [
  { to: '/more/profile', label: 'Profile', sub: 'Name, record, units, weight target' },
  { to: '/more/fights', label: 'Fights', sub: 'Upcoming bouts, results, fight week checklist' },
  { to: '/more/contacts', label: 'Contacts', sub: 'Trainer, manager, cutman, promoter…' },
]

export default function More() {
  const { session } = useAuth()
  const pending = usePendingCount()
  return (
    <Page title="More">
      <ul className="space-y-2">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="flex items-center bg-panel border border-line rounded-2xl p-4 active:bg-raised">
              <span className="flex-1">
                <span className="font-display uppercase text-xl block">{l.label}</span>
                <span className="text-sm text-mute">{l.sub}</span>
              </span>
              <span className="text-mute text-xl">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-mute pt-4">
        Coming in phase 2: fight camp generator, nutrition, wellness and injuries, video library, Boxing IQ lessons, news, career and money, document vault, reminders.
      </p>
      <div className="pt-6 space-y-2">
        <p className="text-xs text-mute">Signed in as {session?.user.email}</p>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            if (pending && !confirm(`${pending} log(s) haven't synced yet. They'll stay on this phone and sync next time you sign in. Sign out?`)) return
            void signOut()
          }}
        >
          Sign out
        </Button>
      </div>
    </Page>
  )
}
