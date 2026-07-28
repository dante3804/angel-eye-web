import { useCallback, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePoseDetection } from '../hooks/usePoseDetection'
import { useFallDetection, TUNABLE } from '../hooks/useFallDetection'
import AccelerationChart from '../components/AccelerationChart'
import StatusPulse from '../components/StatusPulse'
import SeniorSwitcher from '../components/SeniorSwitcher'
import { getElderById } from '../data/elders'
import { getStatusMeta } from '../data/status'
import { useMonitoring } from '../context/monitoring-store'
import './LivePoseEstimation.css'

// =============================================================
// LivePoseEstimation — 실시간 자세 추정 + 다중 지표 낙상 감지 MVP
// -------------------------------------------------------------
// 파이프라인:
//   웹캠 → MediaPipe Pose(33관절) → 몸통 중심 추적
//        → [주] 수직 속도 v_y + [보조] 가속도 a_y → 3단계 판정
//        → 상태/알림/그래프, 종료 시 결과를 대시보드에 반영
// (판정 근거: Bourke et al. 2008 — useFallDetection.js 주석 참고)
// =============================================================
function LivePoseEstimation() {
  const { id } = useParams()
  const elder = getElderById(id)
  const { recordSession } = useMonitoring()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [facingMode, setFacingMode] = useState('user') // 'user'(전면) | 'environment'(후면)
  const [saved, setSaved] = useState(false) // 결과 저장 여부 표시

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

  // MediaPipe 프레임 → 판정기로 전달 (pushFrame은 안정 참조)
  const onFrame = useCallback((frame) => pushFrame(frame), [pushFrame])

  const pose = usePoseDetection({ videoRef, canvasRef, onFrame, facingMode })

  const handleStart = async () => {
    reset() // 새 세션: 이전 기록 초기화
    setSaved(false)
    activate() // 감지 시작
    await pose.start()
  }

  const handleStop = () => {
    pose.stop()
    deactivate() // 감지 정지(기록은 유지 → CSV/결과 저장 가능)

    // 세션 결과를 대시보드/상세 화면에 반영 (측정이 실제로 있었을 때만)
    const summary = getSessionSummary()
    if (elder && summary.sampleCount > 0) {
      recordSession(elder.id, summary)
      setSaved(true)
    }
  }

  const running = pose.status === 'running'
  const isLoading = pose.status === 'loading'
  const { label: statusLabel } = getStatusMeta(fall.status)

  const facingLabel = facingMode === 'user' ? '전면' : '후면'

  // 수직 속도 임계 근접도 (readout 색상 힌트용)
  const velRatio = tuning.VELOCITY_FALL_THRESHOLD
    ? metrics.vy / tuning.VELOCITY_FALL_THRESHOLD
    : 0

  return (
    <div
      className={`live s-${fall.status} ${fall.status === 'danger' ? 'danger-pulse' : ''}`}
    >
      {/* ── 헤더 ── */}
      <header className="live-header">
        <Link
          to="/dashboard"
          className="back-btn"
          aria-label="대시보드로 돌아가기"
        >
          ←
        </Link>
        <div className="live-title">
          <div className="live-name-row">
            <h1>실시간 자세 추정</h1>
            <StatusPulse status={fall.status} size="lg" />
          </div>
          <p className="live-meta mono">
            {elder ? `${elder.name} · ` : ''}MediaPipe Pose · 수직속도 기반 낙상 감지
          </p>
        </div>
        <span className={`status-badge s-${fall.status}`}>{statusLabel}</span>
      </header>

      <SeniorSwitcher />

      {/* ── 위험 알림 배너 ── */}
      {fall.status === 'danger' && (
        <div className="fall-alert" role="alert">
          ⚠️ 낙상 위험 감지! 급격한 수직 하강(속도 임계 초과 + 가속도 스파이크)이 포착되었습니다.
        </div>
      )}

      <div className="live-grid">
        {/* ── 카메라 + 스켈레톤 오버레이 ── */}
        <section className="panel camera-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">웹캠 · 관절 오버레이</h2>
            <span className="panel-badge mono">
              {running ? `LIVE · ${pose.fps}fps` : 'IDLE'}
            </span>
          </div>

          <div className="camera-stage">
            {/* 좌우 반전(거울) — 전면 카메라 자연스럽게 */}
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
                <span className="mono">
                  {saved ? '측정 결과가 대시보드에 반영되었습니다' : '아래 버튼으로 시작하세요'}
                </span>
              </div>
            )}
            {isLoading && (
              <div className="camera-overlay">
                <p>모델 로딩 중…</p>
                <span className="mono">MediaPipe Pose 초기화</span>
              </div>
            )}
            {pose.error && (
              <div className="camera-overlay error">
                <p>⚠️ {pose.error}</p>
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          <div className="camera-controls">
            {!running ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
                disabled={isLoading}
              >
                {isLoading ? '로딩 중…' : '▶ 카메라 시작'}
              </button>
            ) : (
              <button type="button" className="btn btn-stop" onClick={handleStop}>
                ■ 정지 · 결과 저장
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
              disabled={running}
              title="모바일 후면 카메라 전환"
            >
              카메라: {facingLabel}
            </button>
          </div>
        </section>

        {/* ── 실시간 지표 (속도=주, 가속도=보조) + 그래프 ── */}
        <section className="panel accel-panel">
          <div className="panel-title-row">
            <h2 className="panel-title">낙상 지표 실시간</h2>
            <span className="panel-badge mono">
              v_y &gt; {tuning.VELOCITY_FALL_THRESHOLD.toFixed(2)} · |a_y| &gt; {tuning.ACCEL_PEAK_THRESHOLD.toFixed(1)}
            </span>
          </div>

          {/* 주 지표: 수직 속도 */}
          <div className="accel-readout">
            <div className="readout-main">
              <span
                className={`readout-value mono ${velRatio >= 1 ? 'danger-text' : ''}`}
              >
                {metrics.vy.toFixed(2)}
              </span>
              <span className="readout-unit mono">v_y (h/s) · 주 지표</span>
            </div>
            <div className="readout-sub mono">
              <span>a_y {metrics.ay.toFixed(2)}</span>
              <span>|a| {metrics.mag.toFixed(2)}</span>
            </div>
          </div>

          {/* 실시간 라인 차트 (최근 5초, a_y + 임계 밴드) */}
          <AccelerationChart
            samples={samples}
            threshold={tuning.ACCEL_PEAK_THRESHOLD}
            warningThreshold={tuning.ACCEL_PEAK_THRESHOLD * 0.5}
            windowMs={tuning.GRAPH_WINDOW_MS}
          />

          {/* 시연용 임계값 실시간 슬라이더 */}
          <div className="tuning-sliders">
            <p className="tuning-title mono">임계값 실시간 조정 (시연/튜닝용)</p>
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
                <span className="tuning-value mono">
                  {Number(tuning[t.key]).toFixed(t.step < 1 ? 2 : 0)} {t.unit}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── 세션 통계 + 로깅 ── */}
        <section className="panel stats-panel">
          <h2 className="panel-title">세션 기록 (검증용)</h2>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">최대 v_y</span>
              <span className="stat-value mono">{stats.maxVelocity.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">평균 v_y</span>
              <span className="stat-value mono">{stats.avgVy.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">최대 |a_y|</span>
              <span className="stat-value mono">{stats.maxAccel.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">평균 a_xy</span>
              <span className="stat-value mono">{stats.avgAxy.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">낙상 감지</span>
              <span className="stat-value mono danger-text">{stats.fallCount}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost full"
            onClick={downloadCsv}
          >
            ⬇ CSV 다운로드 (연구 분석용)
          </button>
          {saved && (
            <p className="save-note">
              ✓ 측정 결과({getStatusMeta(stats.worst).label})가 {elder?.name} 상태에 반영되었습니다.
            </p>
          )}
          <p className="hint mono">
            기본 임계값은 useFallDetection.js의 TUNING 상수에서 조정할 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  )
}

export default LivePoseEstimation
