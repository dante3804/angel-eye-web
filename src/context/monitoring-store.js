import { createContext, useContext } from 'react'

// =============================================================
// monitoring-store — MonitoringContext의 컨텍스트 객체 / 훅 / 병합 로직
// (컴포넌트가 아닌 export는 이 파일에 모아 fast-refresh 경고를 피한다.
//  Provider 컴포넌트는 MonitoringContext.jsx 참고)
// =============================================================

export const MonitoringContext = createContext(null)

export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error('useMonitoring must be used within MonitoringProvider')
  return ctx
}

// 세션 최종 상태 → 대시보드 riskScore 매핑
const RISK_BY_STATUS = { normal: 15, warning: 55, danger: 90 }
// 세션 결과를 24시간 그래프에 반영할 때의 활동 레벨
const LEVEL_BY_STATUS = { normal: 45, warning: 70, danger: 95 }

// 세션 결과(요약)를 정적 elder 데이터에 병합해 새 elder 객체 반환
export function mergeSession(elder, session) {
  if (!elder || !session) return elder

  const measured = new Date(session.measuredAt)
  const hour = measured.getHours()

  // 24시간 활동 배열에 이번 측정 시각(hour)을 반영
  const activity24h = elder.activity24h.map((slot) =>
    slot.hour === hour
      ? {
          ...slot,
          level: Math.max(slot.level, LEVEL_BY_STATUS[session.status] ?? slot.level),
          status: session.status,
        }
      : slot,
  )

  // 측정 결과 알림을 타임라인 맨 앞에 추가
  const alertMeta = {
    danger: {
      type: '낙상 감지',
      message: `라이브 측정 중 낙상 ${session.fallCount}회 감지 (수직속도 최대 ${session.maxVelocity.toFixed(2)} h/s)`,
    },
    warning: {
      type: '주의 감지',
      message: `라이브 측정 중 급격한 움직임 감지 (가속도 최대 ${session.maxAccel.toFixed(2)})`,
    },
    normal: { type: '측정 완료', message: '라이브 측정 결과 이상 없음' },
  }[session.status]

  const liveAlert = {
    id: `live-${session.measuredAt}`,
    time: session.measuredAt,
    status: session.status,
    type: alertMeta.type,
    message: alertMeta.message,
  }

  return {
    ...elder,
    status: session.status,
    riskScore: RISK_BY_STATUS[session.status] ?? elder.riskScore,
    lastDetectedAt: session.measuredAt,
    activity24h,
    alerts: [liveAlert, ...elder.alerts],
    liveSession: session, // 상세 화면에서 세부 표시용
  }
}
