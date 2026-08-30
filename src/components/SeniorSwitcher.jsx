import { Link, useParams } from 'react-router-dom'
import { elders } from '../data/elders'
import { getStatusMeta } from '../data/status'

export default function SeniorSwitcher() {
  const { id } = useParams()

  return (
    <nav className="senior-switcher" aria-label="시니어 전환">
      <Link
        to="/dashboard"
        className="senior-switcher-label"
        title="전체 시니어 대시보드로 이동"
      >
        시니어 전환
      </Link>
      {elders.map((e) => {
        const active = String(e.id) === String(id)
        const { cssVar, label } = getStatusMeta(e.status)
        return (
          <Link
            key={e.id}
            to={`/elder/${e.id}/live`}
            className={`senior-pill ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            title={`${e.name} · ${label} · 실시간 분석 열기`}
          >
            <span className="senior-pill-dot" style={{ background: cssVar }} />
            {e.name}
          </Link>
        )
      })}
    </nav>
  )
}