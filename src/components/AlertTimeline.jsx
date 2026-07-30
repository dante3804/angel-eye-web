import { getStatusMeta, formatClock } from '../data/status'

// 최근 알림 이력 타임라인
function AlertTimeline({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return <p className="timeline-empty">최근 알림이 없습니다.</p>
  }

  return (
    <ul className="alert-timeline">
      {alerts.map((a) => {
        const { cssVar, tintVar, label } = getStatusMeta(a.status)
        const d = new Date(a.time)
        const isToday = new Date().toDateString() === d.toDateString()
        return (
          <li key={a.id} className="alert-item" style={{ '--s-color': cssVar, '--s-tint': tintVar }}>
            <span className="alert-marker" aria-hidden="true" />
            <div className="alert-body">
              <div className="alert-head">
                <span className="alert-type">{a.type}</span>
                <span className="alert-tag" style={{ color: cssVar }}>
                  {label}
                </span>
              </div>
              <p className="alert-msg">{a.message}</p>
              <span className="alert-time mono">
                {isToday ? '오늘' : '어제'} {formatClock(a.time)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default AlertTimeline
