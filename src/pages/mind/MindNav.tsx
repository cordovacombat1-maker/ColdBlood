import { useLocation } from 'react-router-dom'
import { SubNav } from '../../components/ui'

export default function MindNav() {
  const { pathname } = useLocation()
  return (
    <SubNav
      items={[
        { to: '/mind', label: 'Today', active: pathname === '/mind' },
        { to: '/mind/master-key', label: 'Master Key', active: pathname.startsWith('/mind/master-key') },
        { to: '/mind/affirmations', label: 'Affirmations', active: pathname === '/mind/affirmations' },
        { to: '/mind/journal', label: 'Journal', active: pathname === '/mind/journal' },
      ]}
    />
  )
}
