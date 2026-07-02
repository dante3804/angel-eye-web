// =============================================================
// kinematics.js — 운동학(속도/가속도) 순수 계산 함수 모음
// -------------------------------------------------------------
// [가설] 낙상 = 몸통 중심점의 "급격한 수직 하강".
//   위치 → (미분) → 속도 → (미분) → 가속도.
//   가속도의 수직 성분(a_y)이 순간적으로 치솟는 것을 포착한다.
//
// 좌표계 주의:
//   - MediaPipe landmark의 x,y는 0~1로 정규화된 값.
//   - y축은 화면 위(0) → 아래(1) 로 증가한다.
//     즉, 몸이 아래로 떨어지면 y가 커지고 a_y는 큰 "양수"가 된다.
//
// 의존성 없는 순수 함수만 둔다 (테스트/재사용 용이).
// =============================================================

// MediaPipe Pose의 33개 랜드마크 중 몸통 중심 계산에 쓰는 인덱스
export const LANDMARK = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

// 두 점의 중점 (midpoint)
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// 벡터 크기 (magnitude) — a_x, a_y를 하나의 스칼라로 볼 때 사용
export function magnitude(v) {
  return Math.hypot(v.x, v.y)
}

// -------------------------------------------------------------
// 몸통 중심점(C) 계산
//   C_shoulder = midpoint(왼어깨, 오른어깨)
//   C_hip      = midpoint(왼엉덩이, 오른엉덩이)
//   C          = midpoint(C_shoulder, C_hip)
// 어깨/엉덩이 4점을 평균내므로 팔·다리 흔들림 노이즈에 강하다.
// 필요한 관절의 visibility가 낮으면 null (신뢰 불가) 반환.
// -------------------------------------------------------------
export function bodyCenter(landmarks, minVisibility = 0.5) {
  if (!landmarks || landmarks.length < 25) return null

  const ls = landmarks[LANDMARK.LEFT_SHOULDER]
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER]
  const lh = landmarks[LANDMARK.LEFT_HIP]
  const rh = landmarks[LANDMARK.RIGHT_HIP]

  // visibility가 있는 경우(웹캠 실측)엔 신뢰도 체크. 없으면 통과.
  const pts = [ls, rs, lh, rh]
  for (const p of pts) {
    if (!p) return null
    if (p.visibility != null && p.visibility < minVisibility) return null
  }

  const shoulderC = midpoint(ls, rs)
  const hipC = midpoint(lh, rh)
  return midpoint(shoulderC, hipC)
}

// -------------------------------------------------------------
// 이동평균 필터 (moving average) — 관절 좌표 스무딩용
//   최근 windowSize개 점의 평균을 반환한다.
//   프레임 단위로 튀는 좌표(노이즈)를 완만하게 만들어
//   미분(속도/가속도) 시 폭발적인 튐값을 억제한다.
// -------------------------------------------------------------
export function movingAverage(points, windowSize) {
  if (!points || points.length === 0) return null
  const w = Math.min(windowSize, points.length)
  const recent = points.slice(-w)
  const sum = recent.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / w, y: sum.y / w }
}

// -------------------------------------------------------------
// 속도 v = (현재위치 - 이전위치) / dt      (단위: 정규화좌표/초)
// 가속도 a = (현재속도 - 이전속도) / dt     (단위: 정규화좌표/초²)
//   dt(초)가 0 이하이거나 입력이 없으면 0 벡터.
// -------------------------------------------------------------
export function derivative(curr, prev, dt) {
  if (!curr || !prev || !dt || dt <= 0) return { x: 0, y: 0 }
  return {
    x: (curr.x - prev.x) / dt,
    y: (curr.y - prev.y) / dt,
  }
}

// -------------------------------------------------------------
// 수직 속도 v_y — 낙상 감지의 "주 지표"
// -------------------------------------------------------------
// [근거] Bourke et al. 2008, "Evaluation of a threshold-based tri-axial
//   accelerometer fall detection algorithm" (Medical Engineering & Physics).
//   → 낙상 impact 직전 몸통의 수직 속도가 약 -1.3 m/s에 도달함을 보고.
//   가속도(2차 미분)는 노이즈가 제곱으로 증폭돼 순간 스파이크로만 나타나
//   "연속 초과" 판정이 어렵지만, 속도(1차 미분)는 노이즈가 적고 실제 낙하가
//   여러 프레임 지속되므로 임계 판정이 안정적이다.
//
//   단, MediaPipe 좌표는 0~1로 정규화돼 있어 m/s를 직접 쓸 수 없다.
//   대신 "화면 높이 대비 상대 속도(frame-height per second)"로 환산해 사용한다.
//   화면 y축은 아래로 갈수록 증가 → 하강(낙상)은 양(+)의 v_y로 나타난다.
// -------------------------------------------------------------
export function verticalVelocity(curr, prev, dt) {
  if (!curr || !prev || !dt || dt <= 0) return 0
  return (curr.y - prev.y) / dt // 양수 = 화면 아래로 하강
}
