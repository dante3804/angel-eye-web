import { Link } from 'react-router-dom'
import StatusPulse from './StatusPulse'
import Sparkline from './Sparkline'
import { getStatusMeta, formatElapsed, formatClock } from '../data/status'
import { useNow } from '../hooks/useNow'

function ElderCard({ elder }) {
  const now = useNow(1000)
  const { cssVar, glowVar, tintVar } = getStatusMeta(elder.status)
  const isDanger = elder.status === 'danger'
  // 활동 정보 배지 톤: 정상=중립 회색 / 주의=앰버 / 위험=레드
  const badgeTone =
    elder.status === 'warning' ? 'warn' : elder.status === 'danger' ? 'danger' : 'neutral'

  return (
    <Link
      to={`/elder/${elder.id}`}
      className={`elder-card s-${elder.status}`}
      style={{ '--s-color': cssVar, '--s-glow': glowVar, '--s-tint': tintVar }}
      aria-label={`${elder.name} 상세 모니터링 보기, 현재 상태 ${getStatusMeta(elder.status).label}`}
    >
      <div className="elder-card-top">
        <div className="elder-id">
          <span className="elder-name">{elder.name}</span>
          <span className="elder-meta mono">
            CAM-{String(elder.id).padStart(2, '0')} · {elder.location}
          </span>
        </div>
        <div className="elder-badges">
          {isDanger && <span className="attention-badge">확인 필요</span>}
          <StatusPulse status={elder.status} />
        </div>
      </div>

      <div className="elder-spark">
        <Sparkline
          data={elder.activity1h}
          color={cssVar}
          width={240}
          height={44}
          baselines
          markPeak={isDanger}
        />
        <div className="spark-axis mono">
          <span>-60분</span>
          <span>지금</span>
        </div>
        <div className="spark-caption-row">
          <span className="spark-caption mono">최근 1시간 활동</span>
          {elder.activityBadge && (
            <span className={`spark-badge ${badgeTone}`}>{elder.activityBadge}</span>
          )}
        </div>
      </div>

      <div className="elder-card-foot">
        <div className="foot-block">
          <span className="foot-label">마지막 감지</span>
          <span className={`foot-value mono ${isDanger ? 'danger-time' : ''}`}>
            {formatElapsed(elder.lastDetectedAt, now)}
          </span>
        </div>
        <div className="foot-block align-end">
          <span className="foot-label">감지 시각</span>
          <span className={`foot-value mono ${isDanger ? 'danger-time' : ''}`}>
            {formatClock(elder.lastDetectedAt)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ElderCard
