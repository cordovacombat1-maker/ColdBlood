import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { supabaseConfigured } from './lib/supabase'
import { startSync } from './lib/data'
import Layout from './components/Layout'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Home from './pages/Home'
import TrainLog from './pages/train/TrainLog'
import RoundTimer from './pages/train/RoundTimer'
import Schedule from './pages/train/Schedule'
import Weight from './pages/fuel/Weight'
import MindHome from './pages/mind/MindHome'
import MasterKey from './pages/mind/MasterKey'
import MkReader from './pages/mind/MkReader'
import Affirmations from './pages/mind/Affirmations'
import Journal from './pages/mind/Journal'
import More from './pages/more/More'
import ProfilePage from './pages/more/Profile'
import Fights from './pages/more/Fights'
import Contacts from './pages/more/Contacts'

export default function App() {
  const { session, loading } = useAuth()

  useEffect(() => {
    if (session) startSync()
  }, [session])

  if (!supabaseConfigured) return <Setup />
  if (loading) return <div className="min-h-dvh grid place-items-center font-display text-3xl text-blood">COLD BLOOD</div>
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="train" element={<TrainLog />} />
        <Route path="train/timer" element={<RoundTimer />} />
        <Route path="train/schedule" element={<Schedule />} />
        <Route path="fuel" element={<Weight />} />
        <Route path="mind" element={<MindHome />} />
        <Route path="mind/master-key" element={<MasterKey />} />
        <Route path="mind/master-key/:part" element={<MkReader />} />
        <Route path="mind/affirmations" element={<Affirmations />} />
        <Route path="mind/journal" element={<Journal />} />
        <Route path="more" element={<More />} />
        <Route path="more/profile" element={<ProfilePage />} />
        <Route path="more/fights" element={<Fights />} />
        <Route path="more/contacts" element={<Contacts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
