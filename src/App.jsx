import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ElderDetail from './pages/ElderDetail'
import LivePoseEstimation from './pages/LivePoseEstimation'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/elder/:id" element={<ElderDetail />} />
      <Route path="/elder/:id/live" element={<LivePoseEstimation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
