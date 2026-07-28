import { useRef } from 'react'
import { usePoseDetection } from '../hooks/usePoseDetection'

// =============================================================
// SkeletonPreview — 랜딩 히어로용 경량 라이브 스켈레톤 위젯
// -------------------------------------------------------------
// LivePoseEstimation의 카메라+오버레이 코어만 떼어낸 재사용 컴포넌트.
// 낙상 판정(useFallDetection)은 붙이지 않음 → onFrame 생략, 순수 33관절 추적.
// 페이지 로드 시 카메라를 켜지 않고, 사용자가 버튼을 눌러야 권한을 요청한다.
// =============================================================
export default function SkeletonPreview({ height = 320 }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  // onFrame 없이 훅 사용 → 스켈레톤만 그리고 판정 로직은 실행하지 않음
  const pose = usePoseDetection({ videoRef, canvasRef })

  const running = pose.status === 'running'
  const isLoading = pose.status === 'loading'

  return (
    <div className="ae-sp" style={{ height }}>
      <video ref={videoRef} className="ae-sp-video" playsInline muted />
      <canvas ref={canvasRef} className="ae-sp-canvas" />

      {!running && !isLoading && !pose.error && (
        <div className="ae-sp-overlay">
          <button
            type="button"
            className="ae-btn ae-btn-primary"
            onClick={() => pose.start()}
          >
            <span className="ae-sp-dot" />
            카메라 시작
          </button>
          <p className="ae-sp-hint">
            버튼을 누르면 카메라 권한을 요청합니다. 영상은 브라우저 안에서만
            처리되며 어디로도 전송되지 않습니다.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="ae-sp-overlay">
          <p className="ae-sp-loading">모델 로딩 중…</p>
          <span className="ae-sp-hint">MediaPipe Pose 초기화</span>
        </div>
      )}

      {pose.error && (
        <div className="ae-sp-overlay ae-sp-error">
          <p>⚠️ {pose.error}</p>
          <button
            type="button"
            className="ae-btn ae-btn-ghost"
            onClick={() => pose.start()}
          >
            다시 시도
          </button>
        </div>
      )}

      {running && (
        <>
          <span className="ae-sp-badge">LIVE · {pose.fps}fps · 33관절</span>
          <button
            type="button"
            className="ae-sp-stop"
            onClick={() => pose.stop()}
          >
            ■ 정지
          </button>
        </>
      )}
    </div>
  )
}
