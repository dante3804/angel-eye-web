import { getStatusMeta } from '../data/status'

// 펄스 애니메이션 + 상태 텍스트 병기 (색상에만 의존하지 않도록)
// 정상=잔잔한 호흡 / 주의=천천히 점멸 / 위험=빠른 깜빡임
function StatusPulse({ status, showLabel = true, size = 'md' }) {
  const { label, cssVar, anim } = getStatusMeta(status)

  return (
    <span className={`status-pulse size-${size}`} style={{ color: cssVar }}>
      <span className="status-pulse-ring" aria-hidden="true">
        <span className="status-pulse-core" style={{ animation: anim }} />
      </span>
      {showLabel && <span className="status-pulse-label">{label}</span>}
    </span>
  )
}

export default StatusPulse
