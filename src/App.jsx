import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ElderDetail from './pages/ElderDetail'
import LivePoseEstimation from './pages/LivePoseEstimation'

function LiveRoute() {
  const { id } = useParams()
  return <LivePoseEstimation key={id} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/elder/:id" element={<ElderDetail />} />
      <Route path="/elder/:id/live" element={<LiveRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App