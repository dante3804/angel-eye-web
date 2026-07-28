// 더미 데이터 — 추후 Firestore 연동으로 대체 예정
// status: 'normal'(정상) | 'warning'(주의) | 'danger'(위험)

// 실제 라이브 모니터링처럼 보이도록 타임스탬프를 "현재 기준 상대시간"으로 생성.
// (모듈 로드 시점 기준 1회 계산 → 대시보드는 "3분 전"처럼, 타임라인은 오늘/어제로 표시)
const NOW = Date.now()
const agoMin = (m) => new Date(NOW - m * 60000).toISOString()
const agoHr = (h) => new Date(NOW - h * 3600000).toISOString()

// 24시간 활동 그래프용 데이터 생성 헬퍼
// 각 시간(0~23시)의 활동량(level 0~100)과 그 시간대 상태를 부여
function makeActivity24h(pattern) {
  return pattern.map((p, hour) => ({
    hour,
    level: p.level,
    status: p.status ?? 'normal',
  }))
}

// 평탄한 정상 패턴 (수면시간 낮음, 활동시간 높음)
const baseDay = Array.from({ length: 24 }, (_, h) => {
  if (h >= 0 && h < 6) return { level: 8 + ((h * 5) % 10), status: 'normal' }
  if (h >= 6 && h < 9) return { level: 45 + h * 2, status: 'normal' }
  if (h >= 9 && h < 18) return { level: 55 + ((h * 7) % 35), status: 'normal' }
  if (h >= 18 && h < 22) return { level: 40 - (h - 18) * 5, status: 'normal' }
  return { level: 12, status: 'normal' }
})

export const elders = [
  {
    id: 1,
    name: '김순자',
    age: 78,
    gender: 'female',
    status: 'normal',
    riskScore: 12,
    lastDetectedAt: agoMin(3),
    location: '거실',
    // 최근 1시간 sparkline (5분 간격 12포인트)
    activity1h: [22, 28, 25, 30, 27, 33, 31, 29, 35, 32, 28, 30],
    activity24h: makeActivity24h(baseDay),
    alerts: [
      { id: 'a1', time: agoMin(3), status: 'normal', type: '활동 감지', message: '거실에서 정상 보행 감지' },
      { id: 'a2', time: agoMin(48), status: 'normal', type: '식사 추정', message: '주방 활동 20분 지속' },
      { id: 'a3', time: agoHr(3), status: 'normal', type: '기상', message: '침실에서 거실로 이동' },
      { id: 'a4', time: agoHr(11), status: 'normal', type: '취침', message: '침실 진입 후 활동 감소' },
      { id: 'a5', time: agoHr(23), status: 'warning', type: '장시간 정지', message: '소파에서 40분간 움직임 적음' },
    ],
  },
  {
    id: 2,
    name: '박영수',
    age: 81,
    gender: 'male',
    status: 'warning',
    riskScore: 54,
    lastDetectedAt: agoMin(12),
    location: '침실',
    activity1h: [40, 18, 12, 8, 6, 5, 7, 4, 6, 9, 5, 3],
    activity24h: makeActivity24h(
      baseDay.map((d, h) =>
        h >= 12 && h <= 14
          ? { level: 18, status: 'warning' }
          : d,
      ),
    ),
    alerts: [
      { id: 'b1', time: agoMin(12), status: 'warning', type: '장시간 정지', message: '침대에서 1시간 이상 움직임 없음' },
      { id: 'b2', time: agoHr(1), status: 'normal', type: '활동 감지', message: '침실 내 보행 감지' },
      { id: 'b3', time: agoHr(5), status: 'normal', type: '기상', message: '정상 기상 패턴' },
      { id: 'b4', time: agoHr(13), status: 'warning', type: '불안정 보행', message: '거실에서 균형 흔들림 감지' },
      { id: 'b5', time: agoHr(21), status: 'normal', type: '식사 추정', message: '주방 활동 감지' },
    ],
  },
  {
    id: 3,
    name: '이말순',
    age: 84,
    gender: 'female',
    status: 'danger',
    riskScore: 88,
    lastDetectedAt: agoMin(1),
    location: '화장실',
    activity1h: [30, 35, 28, 40, 95, 88, 12, 5, 3, 2, 4, 2],
    activity24h: makeActivity24h(
      baseDay.map((d, h) => {
        if (h === 14) return { level: 95, status: 'danger' }
        if (h === 13) return { level: 60, status: 'warning' }
        return d
      }),
    ),
    alerts: [
      { id: 'c1', time: agoMin(1), status: 'danger', type: '낙상 의심', message: '화장실에서 급격한 자세 붕괴 감지' },
      { id: 'c2', time: agoMin(16), status: 'warning', type: '불안정 보행', message: '복도에서 비틀거림 감지' },
      { id: 'c3', time: agoHr(2), status: 'normal', type: '활동 감지', message: '거실 정상 활동' },
      { id: 'c4', time: agoHr(6), status: 'warning', type: '장시간 정지', message: '의자에서 50분간 정지' },
      { id: 'c5', time: agoHr(20), status: 'normal', type: '취침', message: '정상 취침 패턴' },
    ],
  },
]

export function getElderById(id) {
  return elders.find((e) => String(e.id) === String(id))
}
