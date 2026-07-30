// 최근 활동량 미니 그래프 (의존성 없는 순수 SVG)
// baselines: 상단 회색 점선 + 하단/중간 상태색 점선 기준선
// markPeak: 피크 지점에 속 빈 원형 마커(위험 카드 강조용)
function Sparkline({
  data,
  color = 'var(--accent)',
  width = 120,
  height = 36,
  baselines = false,
  markPeak = false,
}) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })

  const linePath = points.map(([x, y]) => `${x},${y}`).join(' ')
  // 면적 채우기 경로
  const areaPath =
    `M0,${height} ` +
    points.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${width},${height} Z`

  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`

  // 상단 회색 점선 / 하단·중간 상태색 점선 기준선 위치
  const yTop = 5
  const yMid = height * 0.62

  // 피크(최댓값) 좌표 — 속 빈 마커용
  const peakIdx = data.indexOf(Math.max(...data))
  const peak = points[peakIdx] ?? points[points.length - 1]

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="최근 1시간 활동량 추이"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* 기준선 — Dashboard/Live 차트와 동일한 점선 톤 (4 4) */}
      {baselines && (
        <>
          <line
            x1="0" y1={yTop} x2={width} y2={yTop}
            stroke="var(--ae-text-muted)" strokeWidth="1"
            strokeDasharray="4 4" opacity="0.55"
          />
          <line
            x1="0" y1={yMid} x2={width} y2={yMid}
            stroke={color} strokeWidth="1"
            strokeDasharray="4 4" opacity="0.5"
          />
        </>
      )}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 위험 카드: 피크 지점 속 빈 원형 마커 */}
      {markPeak && (
        <circle
          cx={peak[0]} cy={peak[1]} r="4"
          fill="var(--ae-bg-warm)" stroke={color} strokeWidth="2"
        />
      )}

      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}

export default Sparkline
