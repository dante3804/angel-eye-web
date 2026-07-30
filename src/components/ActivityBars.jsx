import { getStatusMeta } from '../data/status'

// 24시간 활동 그래프. 시간별 막대 + 상태색(정상/주의/위험) 구간 표시.
function ActivityBars({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map((d) => d.level), 1)

  return (
    <div className="activity-bars" role="img" aria-label="최근 24시간 활동 그래프">
      <div className="activity-track">
        {data.map((d) => {
          const { cssVar, label } = getStatusMeta(d.status)
          return (
            <div
              key={d.hour}
              className="activity-bar-col"
              title={`${d.hour}시 · ${label} · 활동량 ${d.level}`}
            >
              <div
                className="activity-bar"
                style={{
                  height: `${(d.level / max) * 100}%`,
                  background: cssVar,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="activity-axis mono">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}

export default ActivityBars
