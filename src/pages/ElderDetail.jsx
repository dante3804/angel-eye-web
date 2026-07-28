import { useParams, useNavigate, Link } from 'react-router-dom'
import RiskGauge from '../components/RiskGauge'
import ActivityBars from '../components/ActivityBars'
import AlertTimeline from '../components/AlertTimeline'
import StatusPulse from '../components/StatusPulse'
import SkeletonFigure from '../components/SkeletonFigure'
import SeniorSwitcher from '../components/SeniorSwitcher'
import { getElderById } from '../data/elders'
import { getStatusMeta, formatElapsed, formatClock } from '../data/status'
import { useNow } from '../hooks/useNow'
import { useMonitoring } from '../context/monitoring-store'
import './ElderDetail.css'

const GENDER_LABEL = { female: '여성', male: '남성' }

function ElderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const now = useNow(1000)
  const { applyOverride } = useMonitoring()
  // 라이브 측정 결과를 반영한 elder (없으면 원본)
  const elder = applyOverride(getElderById(id))

  if (!elder) {
    return (
      <div className="detail not-found">
        <p>해당 노인 정보를 찾을 수 없습니다.</p>
        <Link to="/dashboard" className="back-link">← 대시보드로 돌아가기</Link>
      </div>
    )
  }

  const { cssVar, glowVar } = getStatusMeta(elder.status)

  return (
    <div
      className={`detail s-${elder.status}`}
      style={{ '--s-color': cssVar, '--s-glow': glowVar }}
    >
      {/* ── 헤더 ── */}
      <header className="detail-header">
        <Link
          to="/dashboard"
          className="back-btn"
          aria-label="대시보드로 돌아가기"
        >
          ←
        </Link>
        <div className="detail-title">
          <div className="detail-name-row">
            <h1>{elder.name}</h1>
            <StatusPulse status={elder.status} size="lg" />
          </div>
          <p className="detail-meta mono">
            {elder.age}세 · {GENDER_LABEL[elder.gender] ?? '-'} · 현재 위치 {elder.location}
          </p>
        </div>
      </header>

      <SeniorSwitcher />

      <div className="detail-grid">
        {/* ── 위험도 게이지 ── */}
        <section className="panel gauge-panel">
          <h2 className="panel-title">실시간 위험도</h2>
          <RiskGauge score={elder.riskScore} status={elder.status} />
          <p className="gauge-note mono">
            마지막 감지 {formatElapsed(elder.lastDetectedAt, now)} ({formatClock(elder.lastDetectedAt)})
          </p>
        </section>

        {/* ── Skeleton 시각화 → 실시간 자세 추정 화면 진입 ── */}
        <section
          className="panel skeleton-panel skeleton-panel-live"
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/elder/${elder.id}/live`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate(`/elder/${elder.id}/live`)
            }
          }}
          aria-label="실시간 자세 추정 화면 열기"
        >
          <div className="panel-title-row">
            <h2 className="panel-title">실시간 자세 추정</h2>
            <span className="panel-badge mono">LIVE ▶</span>
          </div>
          <div className="skeleton-stage">
            <span className="skeleton-grid" aria-hidden="true" />
            <SkeletonFigure
              className="skeleton-pose"
              color="var(--accent)"
              strokeWidth={2.5}
              animate
            />
            <span className="skeleton-scan" aria-hidden="true" />
            <p className="skeleton-placeholder-text">
              탭하여 웹캠 · 가속도 낙상 감지 시작
            </p>
          </div>
        </section>

        {/* ── 알림 타임라인 ── */}
        <section className="panel timeline-panel">
          <h2 className="panel-title">최근 알림 이력</h2>
          <AlertTimeline alerts={elder.alerts} />
        </section>

        {/* ── 24시간 활동 그래프 ── */}
        <section className="panel activity-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">24시간 활동</h2>
            <div className="legend">
              {[
                ['정상', 'var(--status-normal)'],
                ['주의', 'var(--status-warning)'],
                ['위험', 'var(--status-danger)'],
              ].map(([t, c]) => (
                <span key={t} className="legend-item">
                  <span className="legend-dot" style={{ background: c }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <ActivityBars data={elder.activity24h} />
        </section>
      </div>
    </div>
  )
}

export default ElderDetail
