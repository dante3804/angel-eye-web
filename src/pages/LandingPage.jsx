import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SkeletonPreview from "../components/SkeletonPreview";
import { Icon } from "../components/Icon";
import "./LandingPage.css";

/* ---------- placeholder 박스 ---------- */
const AssetPlaceholder = ({ label, hint, height = 280 }) => (
  <div className="ae-placeholder" style={{ height }}>
    <Icon name="photo" size={28} />
    <p className="ae-placeholder-label">{label}</p>
    {hint && <p className="ae-placeholder-hint">{hint}</p>}
  </div>
);

/* ---------- 신호선(시그니처 요소): 심전도 라인이 화면 전반에 은은하게 흐르다가
   보호자 알림 단계에서 확실한 파형으로 살아나는 연출 ---------- */
const VitalLine = ({ active = false, className = "" }) => (
  <svg
    className={`ae-vital-line ${active ? "is-active" : ""} ${className}`}
    viewBox="0 0 400 24"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {/* 자체 밴드(높이 24) 중앙 베이스라인 y=12, 중앙부에 심전도 blip */}
    <polyline
      points="0,12 168,12 180,12 188,4 198,20 206,12 400,12"
      fill="none"
      strokeWidth="2"
    />
  </svg>
);

export default function LandingPage() {
  const [pulse, setPulse] = useState(false);
  const pipelineRef = useRef(null);

  useEffect(() => {
    const el = pipelineRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPulse(entry.isIntersecting),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="ae-page">
      {/* ---------- 네비게이션 ---------- */}
      <header className="ae-nav">
        <div className="ae-nav-inner">
          <div className="ae-brand">
            <Icon name="eye" size={22} />
            <span>Angel-Eye</span>
          </div>
          <nav className="ae-nav-links">
            <a href="#how">작동 원리</a>
            <a href="#tech">기술</a>
            <a href="#demo">데모</a>
            <a href="#team">팀</a>
          </nav>
          <a
            className="ae-btn ae-btn-ghost"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="github" size={16} />
            GitHub
          </a>
        </div>
      </header>

      {/* ---------- 히어로 ---------- */}
      <section className="ae-hero">
        <div className="ae-hero-text">
          <h1>
            카메라만으로 몸의 움직임을
            <br />
            실시간으로 추적합니다
          </h1>
          <p className="ae-lede">
            Angel-Eye는 웨어러블 없이 카메라 영상에서 33개 관절 스켈레톤을
            실시간으로 추출합니다. 모든 처리는 기기 안에서 끝나 영상은 어디로도
            전송되지 않습니다. 이 자세 추적을 토대로 낙상 감지·보호자 알림까지
            확장하는 것이 다음 목표입니다.
          </p>
          <div className="ae-hero-actions">
            <a className="ae-btn ae-btn-ghost" href="#how">
              작동 원리 보기
            </a>
            <Link className="ae-btn ae-btn-ghost" to="/dashboard">
              <Icon name="layers" size={16} />
              라이브 대시보드 보기
            </Link>
          </div>
          {/* 두 클릭 없이 실시간 지표·CSV가 있는 분석 화면(Live)으로 바로 이동
              — 데모용 시니어(박영수, 주의 상태) */}
          <Link className="ae-hero-demolink" to="/elder/2/live">
            실시간 분석 데모 바로 보기
            <Icon name="arrow" size={15} />
          </Link>
        </div>

        {/* 실제 라이브 스켈레톤 위젯 — 버튼을 눌러야 카메라 권한 요청 */}
        <SkeletonPreview height={320} />

        <div className="ae-stat-band">
          <div className="ae-stat">
            <p className="ae-stat-num">33</p>
            <p className="ae-stat-label">실시간 추적 관절 포인트</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num">100%</p>
            <p className="ae-stat-label">온디바이스 처리 · 영상 미전송</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num ae-stat-pending">측정 예정</p>
            <p className="ae-stat-label">낙상 4분류 정확도 · 로드맵</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num ae-stat-pending">측정 예정</p>
            <p className="ae-stat-label">추론 지연시간 · 로드맵</p>
          </div>
        </div>
      </section>

      {/* ---------- 문제 정의 ---------- */}
      <section className="ae-section">
        <span className="ae-eyebrow ae-eyebrow-accent">문제 정의</span>
        <h2>초고령사회, 돌봄의 공백이 커지고 있습니다</h2>
        <p className="ae-body">
          한국과 일본은 세계에서 가장 빠르게 고령화되는 국가입니다. 독거노인의
          낙상 사고는 발견이 늦을수록 치명적이지만, 간병 인력은 절대적으로
          부족합니다. 24시간 곁을 지킬 수 없다면, 기술이 그 공백을 메워야
          합니다.
        </p>
        <div className="ae-card-row">
          <div className="ae-mini-card">
            <p className="ae-mini-num">7.2%</p>
            <p className="ae-mini-label">65세 이상 연간 낙상 경험률 · 2020 노인실태조사</p>
          </div>
          <div className="ae-mini-card">
            <p className="ae-mini-num">6~12개월</p>
            <p className="ae-mini-label">고관절 골절 시 회복 기간 · 완전 회복은 약 1/3 수준 · 서울아산병원</p>
          </div>
          <div className="ae-mini-card">
            <p className="ae-mini-num">간병 인력난</p>
            <p className="ae-mini-label">한·일 공통 구조적 과제</p>
          </div>
        </div>
      </section>

      {/* ---------- 목표 아키텍처 ---------- */}
      <section className="ae-section" id="how" ref={pipelineRef}>
        <span className="ae-eyebrow ae-eyebrow-accent">목표 아키텍처</span>
        <h2>카메라에서 알림까지, 다섯 단계</h2>
        <p className="ae-section-sub">
          스켈레톤 추적까지 구현 완료 · 이후 단계는 개발 중
        </p>

        <div className="ae-pipeline">
          {/* 신호선은 박스 행과 분리된 자체 밴드에 배치 (겹침 불가 구조) */}
          <div className="ae-pipeline-signal">
            <VitalLine active={pulse} />
          </div>
          <div className="ae-pipeline-steps">
            {[
              { icon: "camera", title: "RGB-D 카메라", sub: "영상 입력", done: true },
              { icon: "skeleton", title: "MediaPipe", sub: "33관절 스켈레톤", done: true },
              { icon: "wave", title: "특징 융합", sub: "기울기·각속도·가속도" },
              { icon: "cpu", title: "낙상 분류", sub: "LSTM · 4-class" },
              { icon: "bell", title: "보호자 알림", sub: "FCM · 3초 이내" },
            ].map((s) => (
              <div
                className={`ae-pipeline-step ${s.done ? "is-done" : "is-planned"}`}
                key={s.title}
              >
                <span className={`ae-step-badge ${s.done ? "done" : "planned"}`}>
                  {s.done ? "구현 완료" : "개발 예정"}
                </span>
                <Icon name={s.icon} size={20} />
                <p className="ae-pipeline-title">{s.title}</p>
                <p className="ae-pipeline-sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 현재 구현 ---------- */}
      <section className="ae-section">
        <span className="ae-eyebrow ae-eyebrow-accent">현재 구현</span>
        <h2>지금 동작하는 것: 실시간 자세 추적</h2>
        <div className="ae-feature-grid">
          <div className="ae-feature-card">
            <Icon name="skeleton" size={22} />
            <p className="ae-feature-title">실시간 33관절 스켈레톤</p>
            <p className="ae-feature-body">
              MediaPipe Pose로 카메라 영상에서 33개 관절을 프레임 단위로 추출해
              스켈레톤을 실시간 렌더링합니다. 상단 데모에서 바로 확인할 수
              있습니다.
            </p>
          </div>
          <div className="ae-feature-card">
            <Icon name="lock" size={22} />
            <p className="ae-feature-title">프라이버시 보장</p>
            <p className="ae-feature-body">
              모든 영상 처리는 기기(브라우저·엣지 디바이스) 내부에서
              완결됩니다. 원본 영상은 어디로도 전송되지 않습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 다음 단계 / 로드맵 ---------- */}
      <section className="ae-section">
        <span className="ae-eyebrow ae-eyebrow-accent">다음 단계 · 로드맵</span>
        <h2>자세 추적 위에 쌓아 갈 것들</h2>
        <div className="ae-feature-grid">
          <div className="ae-feature-card">
            <span className="ae-roadmap-tag">개발 중</span>
            <Icon name="wave" size={22} />
            <p className="ae-feature-title">실시간 낙상 감지</p>
            <p className="ae-feature-body">
              추출한 관절 시계열에서 낙상 순간을 포착해 4가지 유형으로 분류하는
              모델을 개발 중입니다. 정확도·지연시간은 측정 후 공개합니다.
            </p>
          </div>
          <div className="ae-feature-card">
            <span className="ae-roadmap-tag">예정</span>
            <Icon name="phone" size={22} />
            <p className="ae-feature-title">보호자 즉시 알림</p>
            <p className="ae-feature-body">
              낙상 감지 시 React PWA와 FCM 푸시로 보호자에게 상황과 위치를
              전달하는 알림 파이프라인을 연동할 계획입니다.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 기술 스택 ---------- */}
      <section className="ae-section" id="tech">
        <span className="ae-eyebrow ae-eyebrow-accent">기술 스택</span>
        <div className="ae-chip-row">
          {[
            "Jetson Orin Nano Super",
            "TensorRT",
            "MediaPipe",
            "LSTM / Transformer",
            "Firebase FCM",
            "React PWA",
          ].map((t) => (
            <span className="ae-chip" key={t}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- 데모 ---------- */}
      <section className="ae-section" id="demo">
        <span className="ae-eyebrow ae-eyebrow-accent">데모</span>
        <div className="ae-demo-grid">
          <AssetPlaceholder
            label="데모 영상 준비 중"
            hint="YouTube unlisted 또는 mp4"
            height={220}
          />
          <AssetPlaceholder label="알림 화면 준비 중" height={220} />
        </div>
      </section>

      {/* ---------- 팀 / 푸터 ---------- */}
      <footer className="ae-footer" id="team">
        <div>
          <p className="ae-footer-title">Angel-Eye · 5인 팀 프로젝트</p>
          <p className="ae-footer-sub">
            팀 구성·역할 정보 업데이트 예정
          </p>
        </div>
        <div className="ae-footer-links">
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            <Icon name="github" size={16} /> GitHub
          </a>
          <a href="mailto:example@example.com">
            <Icon name="mail" size={16} /> Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
