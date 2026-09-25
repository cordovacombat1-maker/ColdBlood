import { useLocation } from 'react-router-dom'
import { SubNav } from '../../components/ui'

export default function TrainNav() {
  const { pathname } = useLocation()
  return (
    <SubNav
      items={[
        { to: '/train', label: 'Log', active: pathname === '/train' },
        { to: '/train/timer', label: 'Round timer', active: pathname === '/train/timer' },
        { to: '/train/schedule', label: 'Schedule', active: pathname === '/train/schedule' },
      ]}
    />
  )
}
