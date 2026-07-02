import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from '@mediapipe/tasks-vision'

// =============================================================
// usePoseDetection — MediaPipe Pose Landmarker 웹캠 연동 훅
// -------------------------------------------------------------
// 책임:
//   1) MediaPipe WASM 런타임 + Pose 모델(.task) 로드
//   2) getUserMedia로 웹캠 스트림 확보 → <video> 연결
//   3) requestAnimationFrame 루프에서 detectForVideo() 호출
//   4) 33개 관절을 Canvas에 스켈레톤으로 렌더
//   5) 매 프레임 landmarks + timestamp를 onFrame 콜백으로 전달
//      (가속도 계산은 useFallDetection이 담당 — 관심사 분리)
// =============================================================

// 모델/런타임 CDN 경로. tasks-vision 0.10.x 기준.
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
// lite 모델: 가볍고 빠름 → 노트북 웹캠 30fps 목표에 적합
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// 스켈레톤 색상 (테마 액센트와 맞춤)
const SKELETON_COLOR = '#00d9ff'
const JOINT_COLOR = '#ffffff'

// 로딩/실행 상태
// 'idle' | 'loading' | 'ready' | 'running' | 'error'
export function usePoseDetection({ videoRef, canvasRef, onFrame, facingMode = 'user' }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [fps, setFps] = useState(0)

  const landmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const fpsRef = useRef({ frames: 0, last: performance.now() })
  // onFrame이 매 렌더마다 새 참조여도 루프를 재생성하지 않도록 ref로 고정
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  // ── 1) 모델 지연 로드 (최초 카메라 시작 시 1회) ──
  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setStatus('loading')
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO', // 연속 프레임(시계열) 모드
      numPoses: 1, // 1인 감지 (성능 우선)
    })
    landmarkerRef.current = landmarker
    return landmarker
  }, [])

  // ── 3~5) 프레임 루프 ──
  const renderLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    if (!video || !canvas || !landmarker) return

    // 새 프레임일 때만 추론 (중복 프레임 skip → 불필요한 연산 방지)
    if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
      lastVideoTimeRef.current = video.currentTime
      const nowMs = performance.now()

      // 캔버스를 비디오 해상도에 맞춤 (최초/변경 시)
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const result = landmarker.detectForVideo(video, nowMs)
      const ctx = canvas.getContext('2d')
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const landmarks = result.landmarks?.[0] ?? null
      if (landmarks) {
        const drawer = new DrawingUtils(ctx)
        // 연결선(뼈대) + 관절점
        drawer.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: SKELETON_COLOR,
          lineWidth: 3,
        })
        drawer.drawLandmarks(landmarks, {
          color: JOINT_COLOR,
          fillColor: SKELETON_COLOR,
          lineWidth: 1,
          radius: 4,
        })
      }
      ctx.restore()

      // 매 프레임 데이터를 소비자에게 전달 (가속도 계산은 외부에서)
      onFrameRef.current?.({ landmarks, timestampMs: nowMs })

      // FPS 측정 (1초마다 갱신)
      const f = fpsRef.current
      f.frames += 1
      if (nowMs - f.last >= 1000) {
        setFps(Math.round((f.frames * 1000) / (nowMs - f.last)))
        f.frames = 0
        f.last = nowMs
      }
    }

    rafRef.current = requestAnimationFrame(renderLoop)
  }, [videoRef, canvasRef])

  // ── 2) 카메라 시작 ──
  const start = useCallback(async () => {
    setError(null)
    try {
      const landmarker = await ensureLandmarker()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()

      lastVideoTimeRef.current = -1
      fpsRef.current = { frames: 0, last: performance.now() }
      setStatus('running')
      // landmarker 참조 확정 후 루프 시작
      landmarkerRef.current = landmarker
      rafRef.current = requestAnimationFrame(renderLoop)
    } catch (err) {
      // 권한 거부 / 카메라 없음 등 구분해 안내
      let message = '카메라를 시작할 수 없습니다.'
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        message = '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 권한을 허용해 주세요.'
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        message = '사용 가능한 카메라를 찾을 수 없습니다.'
      } else if (err?.name === 'NotReadableError') {
        message = '다른 앱이 카메라를 사용 중입니다. 해당 앱을 종료 후 다시 시도해 주세요.'
      } else if (err?.message) {
        message = `카메라 오류: ${err.message}`
      }
      setError(message)
      setStatus('error')
    }
  }, [ensureLandmarker, facingMode, videoRef, renderLoop])

  // ── 카메라 정지 ──
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) video.srcObject = null
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setFps(0)
    setStatus(landmarkerRef.current ? 'ready' : 'idle')
  }, [videoRef, canvasRef])

  // 언마운트 시 자원 정리 (카메라/rAF/모델)
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      landmarkerRef.current?.close?.()
      landmarkerRef.current = null
    }
  }, [])

  return { status, error, fps, start, stop }
}
