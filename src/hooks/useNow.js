import { useEffect, useState } from 'react'

// 일정 간격으로 현재 시각을 갱신하는 훅 (실시간 카운터/시계용)
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
