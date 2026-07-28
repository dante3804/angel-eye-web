import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ElderDetail from './pages/ElderDetail'
import LivePoseEstimation from './pages/LivePoseEstimation'

// 시니어 전환(/elder/2/live → /elder/3/live) 시 컴포넌트가 재사용되면
// 이전 세션 통계(최대·평균·낙상 횟수)가 새 시니어로 이어질 수 있음.
// id를 key로 주어 강제 remount → useFallDetection 상태가 확실히 초기화되고
// usePoseDetection의 언마운트 정리로 카메라 스트림도 종료된다.
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
