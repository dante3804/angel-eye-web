import { Link } from 'react-router-dom'
import StatusPulse from './StatusPulse'
import Sparkline from './Sparkline'
import { getStatusMeta, formatElapsed, formatClock } from '../data/status'
import { useNow } from '../hooks/useNow'

function ElderCard({ elder }) {
  const now = useNow(1000)
  const { cssVar, glowVar } = getStatusMeta(elder.status)

  return (
    <Link
      to={`/elder/${elder.id}`}
      className={`elder-card s-${elder.status}`}
      style={{ '--s-color': cssVar, '--s-glow': glowVar }}
      aria-label={`${elder.name} 상세 모니터링 보기, 현재 상태 ${getStatusMeta(elder.status).label}`}
    >
      <span className="card-scanline" aria-hidden="true" />

      <div className="elder-card-top">
        <div className="elder-id">
          <span className="elder-name">{elder.name}</span>
          <span className="elder-meta mono">
            CAM-{String(elder.id).padStart(2, '0')} · {elder.location}
          </span>
        </div>
        <StatusPulse status={elder.status} />
      </div>

      <div className="elder-spark">
        <Sparkline data={elder.activity1h} color={cssVar} width={240} height={44} />
        <span className="spark-caption mono">최근 1시간 활동</span>
      </div>

      <div className="elder-card-foot">
        <div className="foot-block">
          <span className="foot-label">마지막 감지</span>
          <span className="foot-value mono">{formatElapsed(elder.lastDetectedAt, now)}</span>
        </div>
        <div className="foot-block align-end">
          <span className="foot-label">감지 시각</span>
          <span className="foot-value mono">{formatClock(elder.lastDetectedAt)}</span>
        </div>
      </div>
    </Link>
  )
}

export default ElderCard
