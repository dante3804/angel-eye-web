import { createContext, useContext } from 'react'

export const MonitoringContext = createContext(null)

export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error('useMonitoring must be used within MonitoringProvider')
  return ctx
}

const RISK_BY_STATUS = { normal: 15, warning: 55, danger: 90 }
const LEVEL_BY_STATUS = { normal: 45, warning: 70, danger: 95 }

export function mergeSession(elder, session) {
  if (!elder) return elder
  if (!session) return elder

  const measuredStr = session.measuredAt || new Date().toISOString()
  const measured = new Date(measuredStr)
  const hour = isNaN(measured.getHours()) ? new Date().getHours() : measured.getHours()

  const maxVel = typeof session.maxVelocity === 'number' ? session.maxVelocity : 0
  const maxAcc = typeof session.maxAccel === 'number' ? session.maxAccel : 0
  const fallCnt = typeof session.fallCount === 'number' ? session.fallCount : 0
  const status = session.status || 'normal'

  // 1. activity24h 안전 병합
  const originalActivity = Array.isArray(elder.activity24h) ? elder.activity24h : []
  const activity24h = originalActivity.map((slot) => {
    if (slot && slot.hour === hour) {
      return {
        ...slot,
        level: Math.max(slot.level ?? 0, LEVEL_BY_STATUS[status] ?? slot.level ?? 40),
        status: status,
      }
    }
    return slot
  })

  // 2. 알림 메시지 생성
  const alertMeta = {
    danger: {
      type: '낙상 감지',
      message: `라이브 측정 중 낙상 ${fallCnt}회 감지 (수직속도 최대 ${maxVel.toFixed(2)} h/s)`,
    },
    warning: {
      type: '주의 감지',
      message: `라이브 측정 중 급격한 움직임 감지 (가속도 최대 ${maxAcc.toFixed(2)})`,
    },
    normal: { type: '측정 완료', message: '라이브 측정 결과 이상 없음' },
  }[status] || { type: '측정 완료', message: '라이브 측정 결과 이상 없음' }

  const liveAlert = {
    id: `live-${Date.now()}`,
    time: measuredStr,
    status: status,
    type: alertMeta.type,
    message: alertMeta.message,
  }

  const originalAlerts = Array.isArray(elder.alerts) ? elder.alerts : []

  return {
    ...elder,
    status: status,
    riskScore: RISK_BY_STATUS[status] ?? elder.riskScore ?? 20,
    lastDetectedAt: measuredStr,
    activity24h: activity24h.length > 0 ? activity24h : elder.activity24h,
    alerts: [liveAlert, ...originalAlerts],
    liveSession: session,
  }
}