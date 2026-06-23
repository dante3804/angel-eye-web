import { getStatusMeta } from '../data/status'

// 실시간 위험도 게이지 (0~100%). 원형 아크 + 상태색 펄스.
function RiskGauge({ score = 0, status = 'normal' }) {
  const { cssVar, label } = getStatusMeta(status)
  const size = 200
  const stroke = 14
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  // 위쪽 270도만 사용하는 게이지 (3/4 원)
  const arc = 0.75
  const dash = circumference * arc
  const offset = dash * (1 - Math.min(100, Math.max(0, score)) / 100)

  return (
    <div className="risk-gauge" style={{ color: cssVar }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="risk-gauge-svg" role="img"
        aria-label={`위험도 ${score}퍼센트, 상태 ${label}`}>
        {/* 트랙 */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        {/* 값 */}
        <circle
          className="risk-gauge-value"
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={cssVar} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="risk-gauge-center">
        <span className="risk-gauge-score mono">{score}</span>
        <span className="risk-gauge-unit">위험도 %</span>
        <span className="risk-gauge-status">{label}</span>
      </div>
    </div>
  )
}

export default RiskGauge
