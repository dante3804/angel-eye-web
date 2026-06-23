import ElderCard from '../components/ElderCard'
import SkeletonFigure from '../components/SkeletonFigure'
import { elders } from '../data/elders'
import { STATUS_META, STATUS_ORDER } from '../data/status'
import { useNow } from '../hooks/useNow'
import './Dashboard.css'

function Dashboard() {
  const now = useNow(1000)

  const counts = elders.reduce(
    (acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }),
    {},
  )

  const clock = now.toLocaleTimeString('ko-KR', { hour12: false })
  const date = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="dashboard">
      {/* 배경 모티프 */}
      <SkeletonFigure className="bg-motif" color="var(--accent)" strokeWidth={1.5} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">
            <SkeletonFigure color="var(--accent)" strokeWidth={3} animate />
          </span>
          <div className="brand-text">
            <h1>
              Angel<span className="brand-accent">·</span>Eye
            </h1>
            <p className="brand-sub">보호자 모니터링 대시보드</p>
          </div>
        </div>

        <div className="topbar-status">
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" />
            LIVE
          </span>
          <div className="clock-block">
            <span className="clock mono">{clock}</span>
            <span className="clock-date">{date}</span>
          </div>
        </div>
      </header>

      <section className="summary" aria-label="모니터링 요약">
        <div className="summary-total">
          <span className="summary-total-num mono">{elders.length}</span>
          <span className="summary-total-label">명 모니터링 중</span>
        </div>
        <div className="summary-status">
          {STATUS_ORDER.map((status) => {
            const { label, cssVar } = STATUS_META[status]
            return (
              <div key={status} className="summary-pill" style={{ '--s-color': cssVar }}>
                <span className="summary-pill-num mono">{counts[status] ?? 0}</span>
                <span className="summary-pill-label">{label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <main className="elder-grid">
        {elders.map((elder) => (
          <ElderCard key={elder.id} elder={elder} />
        ))}
      </main>
    </div>
  )
}

export default Dashboard
