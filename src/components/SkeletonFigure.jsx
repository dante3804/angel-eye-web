// Angel-Eye 모티프: 관절(키포인트) 기반 인체 스켈레톤 라인
// 로고/배경 패턴/상세 placeholder 공용. animate=true면 키포인트가 은은히 점멸.
function SkeletonFigure({
  color = 'currentColor',
  strokeWidth = 2,
  animate = false,
  className = '',
}) {
  // 정규화된 관절 좌표 (viewBox 100x180)
  const joints = {
    head: [50, 18],
    neck: [50, 34],
    shoulderL: [34, 42],
    shoulderR: [66, 42],
    elbowL: [26, 66],
    elbowR: [74, 66],
    handL: [22, 90],
    handR: [78, 90],
    hip: [50, 92],
    hipL: [40, 96],
    hipR: [60, 96],
    kneeL: [38, 130],
    kneeR: [62, 130],
    footL: [36, 164],
    footR: [64, 164],
  }

  const bones = [
    ['neck', 'shoulderL'], ['neck', 'shoulderR'],
    ['shoulderL', 'elbowL'], ['elbowL', 'handL'],
    ['shoulderR', 'elbowR'], ['elbowR', 'handR'],
    ['neck', 'hip'],
    ['hip', 'hipL'], ['hip', 'hipR'],
    ['hipL', 'kneeL'], ['kneeL', 'footL'],
    ['hipR', 'kneeR'], ['kneeR', 'footR'],
  ]

  return (
    <svg
      className={`skeleton-figure ${className}`}
      viewBox="0 0 100 180"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
        {/* 머리 */}
        <circle cx={joints.head[0]} cy={joints.head[1]} r="9" />
        {bones.map(([a, b], i) => (
          <line
            key={i}
            x1={joints[a][0]} y1={joints[a][1]}
            x2={joints[b][0]} y2={joints[b][1]}
          />
        ))}
      </g>
      <g fill={color}>
        {Object.entries(joints).map(([name, [x, y]], i) =>
          name === 'head' ? null : (
            <circle
              key={name}
              cx={x} cy={y} r="2.6"
              style={
                animate
                  ? { animation: `breathe ${2 + (i % 4) * 0.4}s ease-in-out infinite` }
                  : undefined
              }
            />
          ),
        )}
      </g>
    </svg>
  )
}

export default SkeletonFigure
