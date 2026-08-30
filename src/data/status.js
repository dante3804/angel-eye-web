// 상태별 라벨/색상 단일 정의 — 색상 컨벤션: 정상=초록, 주의=노랑, 위험=빨강
// 색상 값 자체는 theme.css의 CSS 변수에서 가져온다 (var 참조).
// tintVar: pill 배지 공용 배경(상태색 옅은 틴트) — 앱 전역 배지 톤 통일에 사용
export const STATUS_META = {
  normal: {
    label: '정상',
    cssVar: 'var(--status-normal)',
    glowVar: 'var(--status-normal-glow)',
    tintVar: 'var(--ae-status-normal-tint)',
    anim: 'breathe 3.2s ease-in-out infinite',
  },
  warning: {
    label: '주의',
    cssVar: 'var(--status-warning)',
    glowVar: 'var(--status-warning-glow)',
    tintVar: 'var(--ae-status-warning-tint)',
    anim: 'blink-slow 1.6s ease-in-out infinite',
  },
  danger: {
    label: '위험',
    cssVar: 'var(--status-danger)',
    glowVar: 'var(--status-danger-glow)',
    tintVar: 'var(--ae-status-danger-tint)',
    anim: 'blink-fast 0.9s ease-in-out infinite',
  },
}

export const STATUS_ORDER = ['normal', 'warning', 'danger']

export function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.normal
}

// 실시간 경과 카운터: "방금 전 / N초 전 / N분 전 / N시간 전"
// 1분 이상은 초를 생략해 분 단위로 축약(3분 0초 전 → 3분 전).
export function formatElapsed(isoString, now = new Date()) {
  const diffSec = Math.max(0, Math.floor((now - new Date(isoString)) / 1000))

  if (diffSec < 3) return '방금 전'
  if (diffSec < 60) return `${diffSec}초 전`

  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}분 전`

  const hr = Math.floor(min / 60)
  return `${hr}시간 ${min % 60}분 전`
}

// 절대 시각 HH:MM
export function formatClock(isoString) {
  const d = new Date(isoString)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// 상단 헤더 실시간 라이브 시계 포맷팅 (오전/오후 HH시 MM분 SS초)
export function formatLiveClock(date = new Date()) {
  const d = new Date(date)
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const ampm = hours < 12 ? '오전' : '오후'
  const displayHours = String(hours % 12 || 12).padStart(2, '0')

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayName = dayNames[d.getDay()]

  return {
    ampm,
    timeString: `${ampm} ${displayHours}시 ${minutes}분 ${seconds}초`,
    dateString: `${year}.${month}.${day} (${dayName})`,
  }
}