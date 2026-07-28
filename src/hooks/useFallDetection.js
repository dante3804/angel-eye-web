import { useCallback, useEffect, useRef, useState } from 'react'
import {
  bodyCenter,
  movingAverage,
  derivative,
  verticalVelocity,
  magnitude,
} from '../utils/kinematics'

// =============================================================
// useFallDetection — 다중 지표 낙상 위험 감지 훅 (논문 기반 개선판)
// -------------------------------------------------------------
// [설계 근거]
//   Bourke et al. 2008, "Evaluation of a threshold-based tri-axial
//   accelerometer fall detection algorithm" — 낙상 impact 직전 수직 속도가
//   약 -1.3 m/s에 도달함을 보고. 가속도 단독 판정은 노이즈(2차 미분) 때문에
//   순간 스파이크로만 잡혀 "연속 초과" 조건을 만족하기 어렵다.
//
//   → 개선: "수직 속도"를 주 지표(1차 미분, 지속성 있음)로,
//           "가속도 스파이크"를 보조/동반 지표로 사용하는 3단계 판정.
//
// [3단계 판정]
//   정상 : 속도·가속도 모두 낮음
//   주의 : |a_y| 스파이크가 1회라도 임계 초과 (peak, 단발 감지)
//   위험 : v_y가 VELOCITY_FALL_THRESHOLD를 2프레임 연속 초과(완화)
//          AND 최근 ACCEL_ACCOMPANY_WINDOW_MS 내 가속도 스파이크 동반
//
// [성능] 감지는 30fps로 ref만 갱신, UI는 PUBLISH_INTERVAL마다 flush.
// =============================================================

// ── 튜닝 상수 (실험하며 조정. 시연 중 슬라이더로도 실시간 조정 가능) ──
export const TUNING = {
  // ── 주 지표: 수직 하강 속도 (Bourke et al. 2008) ──
  // 정규화 좌표라 m/s 대신 "화면 높이 대비 상대 속도(frame-height/s)".
  // 낙상 시 몸통 중심이 초당 화면 높이의 이 비율 이상으로 하강하면 위험 후보.
  VELOCITY_FALL_THRESHOLD: 0.7, // frame-height/s (하강), 실측 튜닝값
  // ── 보조 지표: 가속도 스파이크 (peak) ──
  // 단발 스파이크 1회만으로 "주의" 판정. (기존 2.5 유지, 단발성으로 사용)
  ACCEL_PEAK_THRESHOLD: 2.5, // |a_y| norm/s²
  // 속도 임계 확정에 필요한 연속 프레임 수 (기존 3 → 2로 완화)
  CONSECUTIVE_FRAMES: 2,
  // 가속도 스파이크가 낙상 "동반 증거"로 인정되는 시간창(ms)
  ACCEL_ACCOMPANY_WINDOW_MS: 400,
  // 관절 좌표 이동평균 윈도우(프레임 수) — 노이즈 스무딩
  SMOOTHING_WINDOW: 5,
  // 위험 상태 유지 시간(ms): 트리거 후 잠시 danger 표시(펄스 지속)
  DANGER_HOLD_MS: 2500,
  // 실시간 그래프에 담을 시간 범위(ms)
  GRAPH_WINDOW_MS: 5000,
  // 관절 신뢰도 최소치 (이하면 프레임 무시)
  MIN_VISIBILITY: 0.5,
}

// 슬라이더로 실시간 조정 가능한 임계값 정의 (min/max/step/label)
export const TUNABLE = [
  { key: 'VELOCITY_FALL_THRESHOLD', label: '수직 속도 임계 (주)', min: 0.2, max: 2.0, step: 0.05, unit: 'h/s' },
  { key: 'ACCEL_PEAK_THRESHOLD', label: '가속도 스파이크 임계 (보조)', min: 0.5, max: 6.0, step: 0.1, unit: 'norm/s²' },
  { key: 'CONSECUTIVE_FRAMES', label: '속도 연속 프레임', min: 1, max: 6, step: 1, unit: 'frame' },
]

// 상태 심각도 순위 (worst 계산용)
const SEVERITY = { normal: 0, warning: 1, danger: 2 }

// UI state flush 주기(ms). 감지(30fps)와 렌더(≈13Hz)를 분리.
const PUBLISH_INTERVAL_MS = 75

export function useFallDetection() {
  // ── 튜닝 값 (state + ref 동시 관리: UI 반영 + 프레임 루프 즉시 반영) ──
  const [tuning, setTuningState] = useState(TUNING)
  const tuningRef = useRef(TUNING)
  const setTuning = useCallback((patch) => {
    const next = { ...tuningRef.current, ...patch }
    tuningRef.current = next
    setTuningState(next)
  }, [])

  // ── 감지 내부 상태 (ref: 리렌더 없이 매 프레임 갱신) ──
  const posHistoryRef = useRef([]) // 최근 몸통 중심 원좌표 (이동평균용)
  const prevSmoothedRef = useRef(null) // 직전 스무딩 위치
  const prevVelRef = useRef(null) // 직전 속도 (가속도 계산용)
  const prevTimeRef = useRef(null) // 직전 프레임 timestamp(ms)
  const velConsecRef = useRef(0) // 수직 속도 임계 연속 초과 프레임 수
  const lastAccelSpikeAtRef = useRef(0) // 마지막 가속도 스파이크 시각(ms)
  const lastDangerAtRef = useRef(0) // 마지막 위험 트리거 시각(ms)
  const inDangerEventRef = useRef(false) // 위험 이벤트 진행중(중복 카운트 방지)

  const samplesRef = useRef([]) // 그래프용 { t, ax, ay, vy, mag }
  const logRef = useRef([]) // CSV용 전체 기록
  const metricsRef = useRef({ ax: 0, ay: 0, vy: 0, mag: 0 })
  const statusRef = useRef('normal')
  // 세션 통계: 최대 가속도/최대 속도/낙상 횟수/최악 상태
  //   + 평균 계산용 누적합(sumVy·sumAxy)과 프레임 카운트(count)
  const statsRef = useRef({
    maxAccel: 0,
    maxVelocity: 0,
    fallCount: 0,
    worst: 'normal',
    sumVy: 0, // v_y 누적합
    sumAxy: 0, // a_xy(가속도 xy 크기 |a|) 누적합
    count: 0, // 평균 분모(집계된 프레임 수)
  })
  const activeRef = useRef(false) // 세션 활성 여부

  // ── UI용 published state (throttled) ──
  const [metrics, setMetrics] = useState({ ax: 0, ay: 0, vy: 0, mag: 0 })
  const [samples, setSamples] = useState([])
  const [status, setStatus] = useState('normal')
  const [stats, setStats] = useState({
    maxAccel: 0,
    maxVelocity: 0,
    fallCount: 0,
    worst: 'normal',
    avgVy: 0,
    avgAxy: 0,
  })

  // worst 상태 갱신 헬퍼
  const escalate = (next) => {
    if (SEVERITY[next] > SEVERITY[statsRef.current.worst]) {
      statsRef.current.worst = next
    }
  }

  // -----------------------------------------------------------
  // 매 프레임 호출 — 위치→속도→가속도 계산 및 3단계 위험 판정
  // -----------------------------------------------------------
  const pushFrame = useCallback(({ landmarks, timestampMs }) => {
    if (!activeRef.current) return
    const T = tuningRef.current // 최신 튜닝값 (슬라이더 반영)

    // 1) 몸통 중심점 추출 (어깨중심·엉덩이중심의 평균)
    const center = bodyCenter(landmarks, T.MIN_VISIBILITY)
    if (!center) {
      // 사람이 안 보이면 미분 연속성 끊고 대기
      prevTimeRef.current = null
      velConsecRef.current = 0
      return
    }

    // 2) 이동평균 필터로 좌표 스무딩
    const hist = posHistoryRef.current
    hist.push(center)
    if (hist.length > T.SMOOTHING_WINDOW) hist.shift()
    const smoothed = movingAverage(hist, T.SMOOTHING_WINDOW)

    const prevTime = prevTimeRef.current
    const dt = prevTime != null ? (timestampMs - prevTime) / 1000 : 0 // 초

    if (prevSmoothedRef.current && dt > 0) {
      // 3) 주 지표: 수직 속도 v_y (양수 = 하강)
      const vy = verticalVelocity(smoothed, prevSmoothedRef.current, dt)
      const vel = derivative(smoothed, prevSmoothedRef.current, dt)

      let ax = 0
      let ay = 0
      let mag = 0
      // 4) 보조 지표: 가속도 (2차 미분)
      if (prevVelRef.current) {
        const acc = derivative(vel, prevVelRef.current, dt)
        ax = acc.x
        ay = acc.y
        mag = magnitude(acc)
      }
      metricsRef.current = { ax, ay, vy, mag }

      // 그래프 버퍼 적재 + 윈도우 밖 제거
      samplesRef.current.push({ t: timestampMs, ax, ay, vy, mag })
      const cutoff = timestampMs - T.GRAPH_WINDOW_MS
      while (samplesRef.current.length && samplesRef.current[0].t < cutoff) {
        samplesRef.current.shift()
      }

      // CSV 로그
      logRef.current.push({
        t: timestampMs,
        iso: new Date().toISOString(),
        ax,
        ay,
        vy,
        mag,
      })

      // 세션 최댓값 갱신 + 평균용 누적 (동일 지점에서 함께 집계)
      if (Math.abs(ay) > statsRef.current.maxAccel) statsRef.current.maxAccel = Math.abs(ay)
      if (vy > statsRef.current.maxVelocity) statsRef.current.maxVelocity = vy
      statsRef.current.sumVy += vy // 평균 v_y용
      statsRef.current.sumAxy += mag // 평균 a_xy용 (|a| = √(ax²+ay²))
      statsRef.current.count += 1

      // ── 판정 로직 ──
      // (보조) 가속도 스파이크: 1회라도 임계 초과 → 시각 기록 + "주의" 후보
      const accelSpike = Math.abs(ay) > T.ACCEL_PEAK_THRESHOLD
      if (accelSpike) lastAccelSpikeAtRef.current = timestampMs

      // (주) 수직 하강 속도 임계 연속 초과 카운트
      if (vy > T.VELOCITY_FALL_THRESHOLD) {
        velConsecRef.current += 1
      } else {
        velConsecRef.current = 0
      }

      // 가속도 스파이크가 최근 시간창 내에 있었는지 (동반 증거)
      const accelAccompany =
        lastAccelSpikeAtRef.current > 0 &&
        timestampMs - lastAccelSpikeAtRef.current <= T.ACCEL_ACCOMPANY_WINDOW_MS

      // (위험) 속도 지속 초과 + 가속도 동반 → 낙상 확정
      const fallConfirmed =
        velConsecRef.current >= T.CONSECUTIVE_FRAMES && accelAccompany

      if (fallConfirmed) {
        lastDangerAtRef.current = timestampMs
        if (!inDangerEventRef.current) {
          statsRef.current.fallCount += 1 // 낙상 이벤트당 1회 카운트
          inDangerEventRef.current = true
        }
      }

      // 현재 상태 산정 (위험 유지시간 우선)
      const sinceDanger = timestampMs - lastDangerAtRef.current
      if (lastDangerAtRef.current && sinceDanger < T.DANGER_HOLD_MS) {
        statusRef.current = 'danger'
        escalate('danger')
      } else {
        inDangerEventRef.current = false // 유지시간 종료 → 다음 낙상 카운트 허용
        // 주의: 가속도 스파이크(동반 여부 무관)가 최근에 있었으면 주의
        if (accelAccompany) {
          statusRef.current = 'warning'
          escalate('warning')
        } else {
          statusRef.current = 'normal'
        }
      }

      prevVelRef.current = vel // 다음 프레임 가속도 계산용
    }

    prevSmoothedRef.current = smoothed
    prevTimeRef.current = timestampMs
  }, [])

  // 세션 시작/종료 제어
  const activate = useCallback(() => {
    activeRef.current = true
  }, [])

  // 감지만 멈춤 (기록/통계는 유지 → 정지 후에도 CSV/결과 저장 가능)
  const deactivate = useCallback(() => {
    activeRef.current = false
    prevTimeRef.current = null
    prevVelRef.current = null
    velConsecRef.current = 0
    statusRef.current = 'normal'
    setStatus('normal')
  }, [])

  const reset = useCallback(() => {
    activeRef.current = false
    posHistoryRef.current = []
    prevSmoothedRef.current = null
    prevVelRef.current = null
    prevTimeRef.current = null
    velConsecRef.current = 0
    lastAccelSpikeAtRef.current = 0
    lastDangerAtRef.current = 0
    inDangerEventRef.current = false
    samplesRef.current = []
    logRef.current = []
    metricsRef.current = { ax: 0, ay: 0, vy: 0, mag: 0 }
    statusRef.current = 'normal'
    statsRef.current = {
      maxAccel: 0,
      maxVelocity: 0,
      fallCount: 0,
      worst: 'normal',
      sumVy: 0,
      sumAxy: 0,
      count: 0,
    }
    setMetrics({ ax: 0, ay: 0, vy: 0, mag: 0 })
    setSamples([])
    setStatus('normal')
    setStats({ maxAccel: 0, maxVelocity: 0, fallCount: 0, worst: 'normal', avgVy: 0, avgAxy: 0 })
  }, [])

  // 세션 요약 스냅샷 (ref 직접 읽음 → throttle 지연 없이 최신값)
  const getSessionSummary = useCallback(() => {
    const s = statsRef.current
    // 최종 상태: 낙상 있으면 위험, 아니면 세션 중 최악 상태
    const finalStatus = s.fallCount > 0 ? 'danger' : s.worst
    return {
      status: finalStatus,
      fallCount: s.fallCount,
      maxAccel: s.maxAccel,
      maxVelocity: s.maxVelocity,
      avgVy: s.count ? s.sumVy / s.count : 0,
      avgAxy: s.count ? s.sumAxy / s.count : 0,
      sampleCount: logRef.current.length,
      measuredAt: new Date().toISOString(),
    }
  }, [])

  // ── UI flush 루프 (throttle) : ref 스냅샷 → state ──
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(metricsRef.current)
      setSamples(samplesRef.current.slice())
      setStatus(statusRef.current)
      const s = statsRef.current
      setStats({
        ...s,
        avgVy: s.count ? s.sumVy / s.count : 0,
        avgAxy: s.count ? s.sumAxy / s.count : 0,
      })
    }, PUBLISH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // ── CSV 다운로드 (연구 분석용) ──
  const downloadCsv = useCallback(() => {
    const rows = logRef.current
    if (rows.length === 0) return
    const t0 = rows[0].t
    const header = 'elapsed_s,timestamp_iso,accel_x,accel_y,vel_y,accel_magnitude\n'
    const body = rows
      .map(
        (r) =>
          `${((r.t - t0) / 1000).toFixed(3)},${r.iso},${r.ax.toFixed(4)},${r.ay.toFixed(4)},${r.vy.toFixed(4)},${r.mag.toFixed(4)}`,
      )
      .join('\n')
    // 세션 요약(평균/최대/낙상횟수) — raw 데이터 뒤에 별도 요약 행으로 추가.
    // 열 정렬 유지: vel_y 열=v_y 지표, accel_magnitude 열=a_xy(|a|) 지표.
    const s = statsRef.current
    const avgVy = s.count ? s.sumVy / s.count : 0
    const avgAxy = s.count ? s.sumAxy / s.count : 0
    const summary =
      '\n\n# session summary (aggregate)' +
      `\naverage,,,,${avgVy.toFixed(4)},${avgAxy.toFixed(4)}` +
      `\nmaximum,,,${s.maxAccel.toFixed(4)},${s.maxVelocity.toFixed(4)},` +
      `\nfall_count,${s.fallCount},,,,` +
      `\nframe_count,${s.count},,,,`

    const blob = new Blob([header + body + summary], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `angel-eye-fall-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return {
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
    status,
    stats,
  }
}
