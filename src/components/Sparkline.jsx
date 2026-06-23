// 최근 활동량 미니 그래프 (의존성 없는 순수 SVG)
function Sparkline({ data, color = 'var(--accent)', width = 120, height = 36 }) {
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
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
