import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SkeletonFigure from '../components/SkeletonFigure'
import { Icon } from '../components/Icon'
import { elders } from '../data/elders'
import { getStatusMeta, formatElapsed } from '../data/status'
import { useNow } from '../hooks/useNow'
import { useMonitoring } from '../context/monitoring-store'
import './ElderDetail.css'

// 00시부터 23시까지 24시간 풀 모의 데이터 생성
const generate24hData = (status) => {
  const isDanger = status === 'danger'
  const isWarning = status === 'warning'

  return Array.from({ length: 24 }, (_, h) => {
    let baseVal = 10
    let barStatus = 'normal'

    // 새벽 수면 시간대 (00~06시)
    if (h >= 0 && h < 6) {
      baseVal = [14, 10, 18, 8, 12, 28][h]
    }
    // 주간 활동 시간대 (06~18시)
    else if (h >= 6 && h < 18) {
      if (isWarning && (h === 12 || h === 13)) {
        baseVal = h === 12 ? 38 : 28
        barStatus = 'warning'
      } else if (isDanger && (h === 15 || h === 16)) {
        baseVal = h === 16 ? 96 : 42
        barStatus = 'danger'
      } else {
        const dayPattern = [45, 62, 78, 85, 72, 68, 65, 74, 82, 88, 66, 58]
        baseVal = dayPattern[h - 6]
      }
    }
    // 저녁 휴식/수면 준비 시간대 (18~24시)
    else {
      baseVal = [54, 46, 36, 26, 18, 12][h - 18]
    }

    return {
      hourNum: h,
      hour: `${String(h).padStart(2, '0')}시`,
      timeRange: `${String(h).padStart(2, '0')}:00 ~ ${String((h + 1) % 24).padStart(2, '0')}:00`,
      val: baseVal,
      status: barStatus,
      showLabel: h % 3 === 0,
    }
  })
}

// 최근 알림 이력 데이터
const getTimelineEvents = (name, status) => {
  if (status === 'danger') {
    return [
      { id: 1, type: 'danger', tag: '위험', title: '급격한 움직임 감지', desc: '화장실 바닥 전도 의심 피크', time: '02:43' },
      { id: 2, type: 'warning', tag: '주의', title: '보행 불균형', desc: '화장실 이동 중 중심 흔들림', time: '02:40' },
      { id: 3, type: 'normal', tag: '정상', title: '기상 감지', desc: '침실에서 기상 후 이동', time: '02:35' },
    ]
  }
  if (status === 'warning') {
    return [
      { id: 1, type: 'warning', tag: '주의', title: '장시간 정지', desc: '침대에서 1시간 이상 움직임 없음', time: '01:54' },
      { id: 2, type: 'normal', tag: '정상', title: '활동 감지', desc: '침실 내 보행 감지', time: '01:06' },
      { id: 3, type: 'normal', tag: '정상', title: '기상 패턴', desc: '정상 기상 및 안정', time: '어제 21:06' },
      { id: 4, type: 'warning', tag: '주의', title: '불안정 보행', desc: '거실에서 균형 흔들림 감지', time: '어제 13:06' },
    ]
  }
  return [
    { id: 1, type: 'normal', tag: '정상', title: '활동 감지', desc: '거실 내 안정적 보행 유지', time: '02:41' },
    { id: 2, type: 'normal', tag: '정상', title: '식사 추정', desc: '주방 테이블 착석 감지', time: '어제 18:20' },
    { id: 3, type: 'normal', tag: '정상', title: '기상 감지', desc: '정상 기상 패턴 확인', time: '어제 07:10' },
  ]
}

function ElderDetail() {
  const { id } = useParams()
  const now = useNow(1000)
  const { applyOverride } = useMonitoring()
  const [hoveredBar, setHoveredBar] = useState(null)

  const currentId = Number(id) || 1
  const rawElder = elders.find((e) => e.id === currentId) ?? elders[0]
  const elder = applyOverride ? applyOverride(rawElder) : rawElder

  const { label, cssVar, tintVar } = getStatusMeta(elder.status)
  const isDanger = elder.status === 'danger'
  const isWarning = elder.status === 'warning'

  const riskScore = isDanger ? 88 : isWarning ? 54 : 12
  const timelineEvents = getTimelineEvents(elder.name, elder.status)
  const hourlyData = generate24hData(elder.status)
  const currentHour = now.getHours()

  // 게이지 둘레 계산
  const radius = 64
  const strokeWidth = 12
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (riskScore / 100) * circumference

  const getStatusKorean = (st) => {
    if (st === 'danger') return '위험'
    if (st === 'warning') return '주의'
    return '안정'
  }

  return (
    <div className="elder-detail-page">
      {/* ── 1. 상단 네비게이션 & 빠른 전환 바 ── */}
      <header className="detail-topbar">
        <div className="topbar-left">
          <Link to="/dashboard" className="detail-back-btn" title="대시보드로 돌아가기">
            <Icon name="arrow" size={16} />
          </Link>
          <div className="elder-title-group">
            <h1>{elder.name}</h1>
            <span className="status-badge-chip" style={{ '--s-color': cssVar, '--s-tint': tintVar }}>
              <span className="badge-dot" style={{ backgroundColor: cssVar }} />
              {label}
            </span>
          </div>
          <span className="elder-header-meta">
            {elder.age}세 · {elder.gender || '남성'} · 현재 위치 <strong>{elder.location}</strong>
          </span>
        </div>

        {/* 시니어 빠른 전환 탭 */}
        <div className="senior-switcher">
          <span className="switcher-label">시니어 전환</span>
          <div className="switcher-pills">
            {elders.map((e) => {
              const active = e.id === elder.id
              const meta = getStatusMeta(e.status)
              return (
                <Link
                  key={e.id}
                  to={`/elder/${e.id}`}
                  className={`switch-pill ${active ? 'is-active' : ''}`}
                >
                  <span className="switch-dot" style={{ backgroundColor: meta.cssVar }} />
                  <span>{e.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── 2. 메인 대시보드 그리드 ── */}
      <div className="detail-dashboard-layout">
        <div className="layout-main-col">
          {/* 상단 2분할 */}
          <div className="upper-card-row">
            {/* 위험도 게이지 */}
            <div className="detail-panel risk-panel">
              <div className="panel-head">
                <h3>실시간 위험도</h3>
              </div>
              <div className="risk-gauge-wrap">
                <svg className="gauge-svg" viewBox="0 0 160 95">
                  <path
                    d="M 16 80 A 64 64 0 0 1 144 80"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <path
                    d="M 16 80 A 64 64 0 0 1 144 80"
                    fill="none"
                    stroke={cssVar}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="gauge-center-stat">
                  <span className="gauge-num" style={{ color: cssVar }}>{riskScore}</span>
                  <span className="gauge-sub">위험도 %</span>
                  <strong className="gauge-status-text" style={{ color: cssVar }}>{label}</strong>
                </div>
              </div>
              <div className="panel-foot-meta">
                <span>마지막 감지 {formatElapsed(elder.lastDetectedAt, now)}</span>
              </div>
            </div>

            {/* 실시간 자세 추정 */}
            <div className="detail-panel pose-panel">
              <div className="panel-head">
                <h3>실시간 자세 추정</h3>
                <span className="panel-live-tag">LIVE ▶</span>
              </div>
              <Link to={`/elder/${elder.id}/live`} className="pose-interactive-box">
                <span className="hud-corner tl" />
                <span className="hud-corner tr" />
                <span className="hud-corner bl" />
                <span className="hud-corner br" />

                <div className="skeleton-canvas-box">
                  <SkeletonFigure color="var(--accent, #0284c7)" strokeWidth={3} animate />
                </div>
                <div className="pose-tap-guide">
                  <span>탭하여 웹캠 · 가속도 정밀 분석 시작</span>
                </div>
              </Link>
            </div>
          </div>

          {/* 하단: 24시간 활동 모니터링 히스토그램 */}
          <div className="detail-panel activity-24h-panel">
            <div className="panel-head">
              <div className="panel-head-title-row">
                <h3>24시간 활동 모니터링</h3>
                <span className="summary-pill">평균 활동지수 62%</span>
              </div>
              {/* 상단 범례에 기준선 안내 추가 */}
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot normal" /> 정상 활동</span>
                <span className="legend-item"><span className="legend-dot warn" /> 주의 (움직임 저하)</span>
                <span className="legend-item"><span className="legend-dot danger" /> 위험 (이상 감지)</span>
                <span className="legend-item"><span className="legend-line-sample" /> 권장 기준 (50%)</span>
              </div>
            </div>

            {/* 생활 주기 밴드 */}
            <div className="time-bands-header">
              <span className="time-band-tag sleep">🌙 수면 (00~06시)</span>
              <span className="time-band-tag active">☀️ 일상 활동 (06~18시)</span>
              <span className="time-band-tag rest">🛋️ 휴식/취침 (18~24시)</span>
            </div>

            <div className="histogram-container">
              {/* 차트 내부: 글씨 없이 깔끔한 점선만 표시 */}
              <div className="chart-baseline" />

              {/* 마우스 호버 플로팅 툴팁 */}
              {hoveredBar && (
                <div
                  className="hist-tooltip"
                  style={{ left: `${(hoveredBar.hourNum / 23) * 100}%` }}
                >
                  <div className="tt-time-tag">{hoveredBar.timeRange}</div>
                  <div className="tt-body">
                    <span>활동량: <strong>{hoveredBar.val}%</strong></span>
                    <span className={`tt-badge s-${hoveredBar.status}`}>
                      {getStatusKorean(hoveredBar.status)}
                    </span>
                  </div>
                </div>
              )}

              {/* 24시간 막대 트랙 */}
              <div className="bars-track">
                {hourlyData.map((item) => {
                  const isCurrent = item.hourNum === currentHour
                  return (
                    <div
                      key={item.hourNum}
                      className={`bar-group ${isCurrent ? 'is-current-time' : ''}`}
                      onMouseEnter={() => setHoveredBar(item)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <div className="bar-track-bg">
                        <div
                          className={`hist-bar bar-${item.status}`}
                          style={{ height: `${item.val}%` }}
                        />
                      </div>
                      {isCurrent && <span className="now-pin-dot" title="현재 시각" />}
                      {item.showLabel && <span className="bar-label">{item.hour}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 우측 영역 */}
        <aside className="layout-side-col">
          <div className="detail-panel timeline-panel">
            <div className="panel-head">
              <h3>최근 알림 이력</h3>
            </div>

            <div className="timeline-list">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className={`timeline-item type-${evt.type}`}>
                  <div className="timeline-bullet" />
                  <div className="timeline-body">
                    <div className="timeline-title-row">
                      <strong className="timeline-title">{evt.title}</strong>
                      <span className={`timeline-tag tag-${evt.type}`}>{evt.tag}</span>
                    </div>
                    <p className="timeline-desc">{evt.desc}</p>
                    <span className="timeline-time">{evt.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ElderDetail