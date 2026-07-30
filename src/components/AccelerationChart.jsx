// =============================================================
// AccelerationChart — 실시간 수직 가속도(a_y) 라인 차트
// -------------------------------------------------------------
// 연구기관 어필용 시각화:
//   - 최근 GRAPH_WINDOW_MS(기본 5초)의 a_y 추이를 라인으로 표시
//   - ±임계값 라인을 그려, 넘는 영역을 빨간 밴드로 강조
//   - 넘는 구간의 포인트는 빨간색으로 → "낙상 순간" 이 눈에 보임
// 의존성 없는 순수 SVG (Sparkline과 동일 톤).
// =============================================================
function AccelerationChart({
  samples,
  threshold,
  warningThreshold,
  windowMs,
  width = 600,
  height = 200,
}) {
  const now = samples.length ? samples[samples.length - 1].t : performance.now()
  const t0 = now - windowMs

  // Y축 범위: 임계값보다 넉넉하게, 실측 최대에 맞춰 자동 확장
  const observedMax = samples.reduce((m, s) => Math.max(m, Math.abs(s.ay)), 0)
  const yRange = Math.max(threshold * 1.4, observedMax * 1.1, 0.5)

  const padX = 44
  const padY = 12
  const plotW = width - padX
  const plotH = height - padY * 2

  // 좌표 변환 헬퍼
  const xOf = (t) => padX + ((t - t0) / windowMs) * plotW
  const yOf = (v) => padY + plotH / 2 - (v / yRange) * (plotH / 2)

  const yThreshPos = yOf(threshold)
  const yThreshNeg = yOf(-threshold)
  const yWarnPos = yOf(warningThreshold)
  const yWarnNeg = yOf(-warningThreshold)
  const yZero = yOf(0)

  // a_y 라인 포인트
  const pts = samples
    .filter((s) => s.t >= t0)
    .map((s) => `${xOf(s.t).toFixed(1)},${yOf(s.ay).toFixed(1)}`)
    .join(' ')

  // 임계값 초과 포인트 (빨간 강조 마커)
  const overPts = samples.filter((s) => s.t >= t0 && Math.abs(s.ay) > threshold)

  const dangerColor = 'var(--status-danger)'
  const warnColor = 'var(--status-warning)'

  return (
    <svg
      className="accel-chart"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="실시간 수직 가속도 그래프"
    >
      {/* 위험 밴드 (임계값 바깥 = 빨간 영역) */}
      <rect x={padX} y={padY} width={plotW} height={yThreshPos - padY}
        fill={dangerColor} opacity="0.1" />
      <rect x={padX} y={yThreshNeg} width={plotW} height={height - padY - yThreshNeg}
        fill={dangerColor} opacity="0.1" />

      {/* 0 기준선 — Dashboard 차트 상단 회색 점선과 동일 톤 (4 4) */}
      <line x1={padX} y1={yZero} x2={width} y2={yZero}
        stroke="var(--ae-text-muted)" strokeWidth="1" strokeDasharray="4 4" opacity="0.55" />

      {/* 주의 임계선 (노랑 점선, ±) — 점선 패턴/굵기 통일 (4 4, width 1) */}
      <line x1={padX} y1={yWarnPos} x2={width} y2={yWarnPos}
        stroke={warnColor} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <line x1={padX} y1={yWarnNeg} x2={width} y2={yWarnNeg}
        stroke={warnColor} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

      {/* 낙상 임계선 (빨강 점선, ±) — 점선 패턴/굵기 통일 (4 4, width 1) */}
      <line x1={padX} y1={yThreshPos} x2={width} y2={yThreshPos}
        stroke={dangerColor} strokeWidth="1" strokeDasharray="4 4" />
      <line x1={padX} y1={yThreshNeg} x2={width} y2={yThreshNeg}
        stroke={dangerColor} strokeWidth="1" strokeDasharray="4 4" />

      {/* 축 라벨 (a_y 값) */}
      <text x={padX - 6} y={yThreshPos + 3} className="chart-label" textAnchor="end">
        +{threshold}
      </text>
      <text x={padX - 6} y={yZero + 3} className="chart-label" textAnchor="end">
        0
      </text>
      <text x={padX - 6} y={yThreshNeg + 3} className="chart-label" textAnchor="end">
        -{threshold}
      </text>

      {/* a_y 실측 라인 */}
      {pts && (
        <polyline points={pts} fill="none" stroke="var(--accent)"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* 임계 초과 지점 강조 */}
      {overPts.map((s) => (
        <circle key={s.t} cx={xOf(s.t)} cy={yOf(s.ay)} r="3.5" fill={dangerColor} />
      ))}

      {/* x축: "5초 전 → 지금" 안내 */}
      <text x={padX} y={height - 1} className="chart-label" textAnchor="start">
        -{(windowMs / 1000).toFixed(0)}s
      </text>
      <text x={width - 2} y={height - 1} className="chart-label" textAnchor="end">
        now
      </text>
    </svg>
  )
}

export default AccelerationChart
