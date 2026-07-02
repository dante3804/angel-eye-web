import { useCallback, useMemo, useState } from 'react'
import { MonitoringContext, mergeSession } from './monitoring-store'

// =============================================================
// MonitoringProvider — 라이브 측정 결과의 전역 상태 관리
// -------------------------------------------------------------
// 라이브 자세추정 세션의 결과(최종 상태·낙상 횟수·최대 지표·측정 시각)를
// 노인 id별로 보관하고, 대시보드/상세 화면이 정적 더미데이터 위에
// "측정 결과를 덮어써" 반영하도록 한다.
//   ※ CLAUDE.md 규칙: localStorage 금지 → React Context(메모리)로만 관리.
//     새로고침 시 초기화됨 (추후 Firestore 연동 지점).
// (컨텍스트 객체/useMonitoring 훅/병합 로직은 monitoring-store.js)
// =============================================================
export function MonitoringProvider({ children }) {
  // { [elderId]: sessionSummary }
  const [sessions, setSessions] = useState({})

  // 라이브 세션 종료 시 호출 — 결과 저장
  const recordSession = useCallback((elderId, session) => {
    setSessions((prev) => ({ ...prev, [String(elderId)]: session }))
  }, [])

  // 정적 elder에 세션 결과를 병합해 반환 (없으면 원본 그대로)
  const applyOverride = useCallback(
    (elder) => (elder ? mergeSession(elder, sessions[String(elder.id)]) : elder),
    [sessions],
  )

  const getSession = useCallback((elderId) => sessions[String(elderId)], [sessions])

  const value = useMemo(
    () => ({ sessions, recordSession, applyOverride, getSession }),
    [sessions, recordSession, applyOverride, getSession],
  )

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}
