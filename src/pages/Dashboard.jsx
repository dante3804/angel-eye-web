import { Link } from 'react-router-dom'
import ElderCard from '../components/ElderCard'
import { Icon } from '../components/Icon'
import { elders } from '../data/elders'
import { STATUS_META, STATUS_ORDER } from '../data/status'
import { useNow } from '../hooks/useNow'
import { useMonitoring } from '../context/monitoring-store'
import './Dashboard.css'

function Dashboard() {
  const now = useNow(1000)
  const { applyOverride } = useMonitoring()

  // 라이브 측정 결과를 정적 데이터 위에 반영
  const liveElders = elders.map(applyOverride)

  const counts = liveElders.reduce(
    (acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }),
    {},
  )

  // 시계: "오전 03시 39분 21초"
  const pad = (n) => String(n).padStart(2, '0')
  const rawHours = now.getHours()
  const ampm = rawHours < 12 ? '오전' : '오후'
  const displayHours = pad(rawHours % 12 || 12)
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())
  const clock = `${ampm} ${displayHours}시 ${minutes}분 ${seconds}초`

  // 날짜: "2026.08.31 (월)"
  const weekday = now.toLocaleDateString('ko-KR', { weekday: 'short' })
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} (${weekday})`

  return (
    <div className="dashboard">
      <header className="topbar">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span
            className="brand-logo"
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Icon name="eye" size={20} />
          </span>
          <div className="brand-text">
            <h1>
              Angel<span className="brand-accent">·</span>Eye
            </h1>
            <p className="brand-sub">보호자 모니터링 대시보드</p>
          </div>
        </Link>

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
        <div className="summary-caption">
          <span className="summary-caption-title">상태 요약</span>
          <span className="summary-caption-sub">{liveElders.length}명 모니터링 중</span>
        </div>
        <div className="summary-status">
          {STATUS_ORDER.map((status) => {
            const { label, cssVar, tintVar } = STATUS_META[status]
            return (
              <span
                key={status}
                className="summary-pill"
                style={{ '--s-color': cssVar, '--s-tint': tintVar }}
              >
                <span className="summary-pill-dot" aria-hidden="true" />
                {label} {counts[status] ?? 0}
              </span>
            )
          })}
        </div>
      </section>

      <main className="elder-grid">
        {liveElders.map((elder) => (
          <ElderCard key={elder.id} elder={elder} />
        ))}
      </main>

      <footer className="dash-foot">
        <span className="dash-foot-note">감지 신호는 30초 간격으로 갱신됩니다.</span>
        <span className="dash-foot-note mono">
          카메라 {liveElders.length}대 연결 · 마지막 동기화 {clock}
        </span>
      </footer>
    </div>
  )
}

export default Dashboard