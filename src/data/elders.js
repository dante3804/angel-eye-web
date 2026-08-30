export const elders = [
  {
    id: 1,
    name: '김순자',
    location: '거실',
    status: 'normal',
    activity1h: [0.55, 0.68, 0.62, 0.65, 0.72, 0.69, 0.78, 0.73, 0.71, 0.75],
    activityBadge: '정상 범위 (0.70)',
    lastDetectedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    age: 79,
    careLevel: '장기요양 3등급',
    guardian: '김민수 (아들)',
    phone: '010-3456-7890',
  },
  {
    id: 2,
    name: '박영수',
    location: '침실',
    status: 'warning',
    activity1h: [0.82, 0.45, 0.38, 0.35, 0.32, 0.36, 0.39, 0.38, 0.35, 0.31],
    activityBadge: '활동 저하 감지',
    lastDetectedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    age: 84,
    careLevel: '장기요양 2등급',
    guardian: '박지현 (딸)',
    phone: '010-9876-5432',
  },
  {
    id: 3,
    name: '이말순',
    location: '화장실',
    status: 'danger',
    activity1h: [0.35, 0.38, 0.34, 0.42, 0.88, 0.75, 0.28, 0.25, 0.26, 0.24],
    activityBadge: '급격한 움직임 감지 · 02:43',
    lastDetectedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    age: 81,
    careLevel: '장기요양 1등급',
    guardian: '이동훈 (아들)',
    phone: '010-5555-1234',
  },
]

export function getElderById(id) {
  const numId = Number(id)
  return elders.find((e) => e.id === numId) || elders[0]
}

export default elders