import { Link, useParams } from 'react-router-dom'
import { elders } from '../data/elders'
import { getStatusMeta } from '../data/status'

// =============================================================
// SeniorSwitcher — 여러 시니어를 오가는 상단 스위처 (ElderDetail·Live 공용)
// -------------------------------------------------------------
// 기존 시니어 목록(src/data/elders)을 재사용해 이름 + 상태 점 pill로 표시.
// 클릭 시 해당 시니어의 실시간 분석 화면(/elder/{id}/live)으로 바로 이동.
// → 단발 카메라 데모가 아니라 "여러 시니어를 관리하는 대시보드의 일부"로 보이게.
// (세션 통계 초기화는 App.jsx에서 Live 라우트에 key={id}를 주어 remount로 처리)
// =============================================================
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
