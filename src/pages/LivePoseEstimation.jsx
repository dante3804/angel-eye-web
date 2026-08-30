import { useCallback, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePoseDetection } from '../hooks/usePoseDetection'
import { useFallDetection, TUNABLE } from '../hooks/useFallDetection'
import AccelerationChart from '../components/AccelerationChart'
import StatusPulse from '../components/StatusPulse'
import SeniorSwitcher from '../components/SeniorSwitcher'
import { Icon } from '../components/Icon'
import { elders } from '../data/elders'
import { getStatusMeta } from '../data/status'
import { useMonitoring } from '../context/monitoring-store'
import './LivePoseEstimation.css'

function LivePoseEstimation() {
  const { id } = useParams()
  const rawElder = elders.find((e) => e.id === Number(id)) ?? elders[0]
  const { applyOverride, recordSession } = useMonitoring()
  const elder = applyOverride ? applyOverride(rawElder) : rawElder

  // 스트리밍 모드: 'webcam' (로컬 웹캠) | 'vm' (Jetson/VM 서버 스트림)
  const [streamSource, setStreamSource] = useState('webcam')
  const [vmIp, setVmIp] = useState('localhost')
  const [vmPort, setVmPort] = useState('5002')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [facingMode, setFacingMode] = useState('user')
  const [saved, setSaved] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)

  const fall = useFallDetection()
  const {
    pushFrame,
    activate,
    deactivate,
    reset,
    downloadCsv,
    getSessionSummary,
    tuning,
    setTuning,
    metrics,
    samples,
    stats,
  } = fall

  const onFrame = useCallback((frame) => pushFrame(frame), [pushFrame])
  const pose = usePoseDetection({ videoRef, canvasRef, onFrame, facingMode })

  const handleStart = async () => {
    reset()
    setSaved(false)
    activate()
    await pose.start()
  }

  const handleStop = () => {
    pose.stop()
    deactivate()

    const rawSummary = getSessionSummary()
    if (elder && rawSummary) {
      // ✅ mergeSession 규격에 맞춰 status와 measuredAt을 반드시 포함하여 저장
      const sessionData = {
        ...rawSummary,
        status: fall.status || 'normal',
        measuredAt: new Date().toISOString(),
      }
      recordSession(elder.id, sessionData)
      setSaved(true)
    }
  }

  const running = pose.status === 'running'
  const isLoading = pose.status === 'loading'
  const { label: statusLabel } = getStatusMeta(fall.status)
  const facingLabel = facingMode === 'user' ? '전면' : '후면'

  const velRatio = tuning.VELOCITY_FALL_THRESHOLD
    ? metrics.vy / tuning.VELOCITY_FALL_THRESHOLD
    : 0

  const vmStreamUrl = `http://${vmIp}:${vmPort}/video_feed`

  return (
    <div className={`live s-${fall.status} ${fall.status === 'danger' ? 'danger-pulse' : ''}`}>
      {/* ── 상단 헤더 ── */}
      <header className="live-header">
        <Link
          to={`/elder/${elder.id}`}
          className="back-btn"
          aria-label="어르신 상세 페이지로 돌아가기"
          title="어르신 상세 페이지로 돌아가기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div className="live-title">
          <div className="live-name-row">
            <h1>실시간 자세 추정 및 낙상 분석</h1>
            <StatusPulse status={fall.status} size="lg" />
          </div>
          <p className="live-meta">
            {elder.name} 어르신 · 카메라 AI 기반 움직임 정밀 분석
          </p>
        </div>
        <span className={`status-badge s-${fall.status}`}>{statusLabel}</span>
      </header>

      <SeniorSwitcher />

      {/* ── 위험 알림 배너 ── */}
      {fall.status === 'danger' && (
        <div className="fall-alert" role="alert">
          <Icon name="alert" size={20} />
          낙상 위험 감지! 급격한 하강 및 충격이 포착되었습니다.
        </div>
      )}

      <div className="live-grid">
        {/* ── 1. 카메라 & 영상 뷰어 패널 ── */}
        <section className="panel camera-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">실시간 카메라 영상</h2>
            
            {/* 소스 전환 탭 */}
            <div className="source-switcher-pills">
              <button
                type="button"
                className={`source-pill ${streamSource === 'webcam' ? 'is-active' : ''}`}
                onClick={() => setStreamSource('webcam')}
              >
                브라우저 웹캠
              </button>
              <button
                type="button"
                className={`source-pill ${streamSource === 'vm' ? 'is-active' : ''}`}
                onClick={() => setStreamSource('vm')}
              >
                Jetson / VM 스트림
              </button>
            </div>
          </div>

          {/* ── VM 주소 설정 바 ── */}
          {streamSource === 'vm' && (
            <div className="vm-config-bar">
              <span className="vm-label">VM IP:</span>
              <input
                type="text"
                className="vm-input"
                placeholder="예: 34.64.xxx.xxx 또는 localhost"
                value={vmIp}
                onChange={(e) => setVmIp(e.target.value)}
              />
              <span className="vm-colon">:</span>
              <input
                type="text"
                className="vm-port-input"
                value={vmPort}
                onChange={(e) => setVmPort(e.target.value)}
              />
              <span className="vm-path">/video_feed</span>
            </div>
          )}

          <div className="camera-stage">
            {streamSource === 'webcam' ? (
              <>
                <video
                  ref={videoRef}
                  className={`camera-video ${facingMode === 'user' ? 'mirror' : ''}`}
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className={`camera-canvas ${facingMode === 'user' ? 'mirror' : ''}`}
                />

                {!running && !isLoading && (
                  <div className="camera-overlay">
                    <p>카메라가 꺼져 있습니다</p>
                    <span>
                      {saved ? '측정 결과가 대시보드에 반영되었습니다' : '아래 버튼으로 실시간 분석을 시작하세요'}
                    </span>
                  </div>
                )}
                {isLoading && (
                  <div className="camera-overlay">
                    <p>AI 모델 초기화 중…</p>
                    <span>실시간 스켈레톤 추출 준비 중입니다</span>
                  </div>
                )}
                {pose.error && (
                  <div className="camera-overlay error">
                    <p>
                      <Icon name="alert" size={18} />
                      {pose.error}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <img
                src={vmStreamUrl}
                alt="Jetson VM AI Live Stream"
                className="vm-stream-img"
              />
            )}
          </div>

          {/* 웹캠 제어 버튼 */}
          {streamSource === 'webcam' && (
            <div className="camera-controls">
              {!running ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStart}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    '준비 중…'
                  ) : (
                    <>
                      <Icon name="play" size={16} />
                      카메라 분석 시작
                    </>
                  )}
                </button>
              ) : (
                <button type="button" className="btn btn-stop" onClick={handleStop}>
                  <Icon name="stop" size={16} />
                  측정 종료 및 결과 저장
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                disabled={running}
              >
                카메라: {facingLabel}
              </button>
            </div>
          )}
        </section>

        {/* ── 2. 지표 & 파형 차트 ── */}
        <div className="live-side-column">
          <section className="panel status-panel-card">
            <div className="panel-title-row">
              <h2 className="panel-title">실시간 움직임 지표</h2>
              <span className="info-badge">
                {velRatio >= 1 ? '급격한 하강 감지' : '안정 상태'}
              </span>
            </div>

            <div className="friendly-metric-grid">
              <div className={`metric-card ${velRatio >= 1 ? 'is-danger' : ''}`}>
                <span className="metric-title">하강 속도</span>
                <div className="metric-val-row">
                  <span className="metric-num">{metrics.vy.toFixed(2)}</span>
                  <span className="metric-unit">h/s</span>
                </div>
                <span className="metric-guide">
                  기준치 {tuning.VELOCITY_FALL_THRESHOLD.toFixed(2)} 이상 시 주의
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-title">순간 충격량</span>
                <div className="metric-val-row">
                  <span className="metric-num">{Math.abs(metrics.ay).toFixed(2)}</span>
                  <span className="metric-unit">G</span>
                </div>
                <span className="metric-guide">
                  기준치 {tuning.ACCEL_PEAK_THRESHOLD.toFixed(1)} 이상 시 위험
                </span>
              </div>
            </div>

            <div className="chart-wrapper">
              <div className="chart-header-row">
                <span className="chart-title">최근 5초 충격 파형 추이</span>
                <span className="chart-legend-text">빨간 점선: 낙상 기준선</span>
              </div>
              <AccelerationChart
                samples={samples}
                threshold={tuning.ACCEL_PEAK_THRESHOLD}
                warningThreshold={tuning.ACCEL_PEAK_THRESHOLD * 0.5}
                windowMs={tuning.GRAPH_WINDOW_MS}
              />
            </div>
          </section>

          {/* ── 3. 세션 요약 ── */}
          <section className="panel summary-panel-card">
            <div className="panel-title-row">
              <h2 className="panel-title">현재 측정 요약</h2>
              {saved && <span className="saved-pill">✓ 상태 반영 완료</span>}
            </div>

            <div className="session-summary-grid">
              <div className="summary-item">
                <span className="sum-label">최고 하강 속도</span>
                <strong className="sum-value">{stats.maxVelocity.toFixed(2)}</strong>
              </div>
              <div className="summary-item">
                <span className="sum-label">최대 충격량</span>
                <strong className="sum-value">{stats.maxAccel.toFixed(2)}</strong>
              </div>
              <div className="summary-item highlight">
                <span className="sum-label">낙상 의심 횟수</span>
                <strong className={`sum-value ${stats.fallCount > 0 ? 'danger-text' : ''}`}>
                  {stats.fallCount}회
                </strong>
              </div>
            </div>

            {/* 연구 도구 토글 */}
            <div className="dev-toggle-section">
              <button
                type="button"
                className="dev-toggle-btn"
                onClick={() => setShowDevTools((prev) => !prev)}
              >
                <span>{showDevTools ? '▴ 연구 및 파라미터 튜닝 도구 닫기' : '▾ 연구 및 파라미터 튜닝 도구 열기'}</span>
              </button>

              {showDevTools && (
                <div className="dev-tools-body">
                  <div className="tuning-sliders">
                    <p className="tuning-title">임계값 실시간 미세 조정</p>
                    {TUNABLE.map((t) => (
                      <label key={t.key} className="tuning-row">
                        <span className="tuning-label">{t.label}</span>
                        <input
                          type="range"
                          min={t.min}
                          max={t.max}
                          step={t.step}
                          value={tuning[t.key]}
                          onChange={(e) => setTuning({ [t.key]: Number(e.target.value) })}
                        />
                        <span className="tuning-value">
                          {Number(tuning[t.key]).toFixed(t.step < 1 ? 2 : 0)} {t.unit}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost full dev-csv-btn"
                    onClick={downloadCsv}
                  >
                    <Icon name="download" size={14} />
                    연구용 원본 데이터 (CSV) 다운로드
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default LivePoseEstimation