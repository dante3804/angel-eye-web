import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SkeletonPreview from "../components/SkeletonPreview";
import { Icon } from "../components/Icon";
import "./LandingPage.css";

/* ---------- placeholder 박스 ---------- */
const AssetPlaceholder = ({ label, hint, height = 280 }) => (
  <div className="ae-placeholder" style={{ height }}>
    <div className="ae-placeholder-icon-wrap">
      <Icon name="photo" size={26} />
    </div>
    <p className="ae-placeholder-label">{label}</p>
    {hint && <p className="ae-placeholder-hint">{hint}</p>}
  </div>
);

/* ---------- 신호선(시그니처 요소): 심전도 라인 ---------- */
const VitalLine = ({ active = false, className = "" }) => (
  <svg
    className={`ae-vital-line ${active ? "is-active" : ""} ${className}`}
    viewBox="0 0 400 24"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
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
            <div className="ae-brand-icon">
              <Icon name="eye" size={20} />
            </div>
            <span>Angel-Eye</span>
          </div>
          <nav className="ae-nav-links">
            <a href="#how">작동 원리</a>
            <a href="#tech">기술</a>
            <a href="#demo">데모</a>
            <a href="#team">팀</a>
          </nav>
          <a
            className="ae-btn ae-btn-ghost ae-btn-sm"
            href="https://github.com/dante3804/angel-eye-web"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="github" size={15} />
            GitHub
          </a>
        </div>
      </header>

      {/* ---------- 히어로 ---------- */}
      <section className="ae-hero">
        <div className="ae-hero-glow-bg" />
        <div className="ae-hero-text">
          <div className="ae-hero-badge">
            <span className="ae-badge-dot" />
            <span>On-Device AI Vision Platform</span>
          </div>
          <h1 className="ae-hero-title">
            카메라만으로 몸의 움직임을
            <br />
            <span className="ae-gradient-text">실시간으로 추적</span>합니다
          </h1>
          <p className="ae-lede">
            Angel-Eye는 웨어러블 없이 카메라 영상에서 <strong>33개 관절 스켈레톤</strong>을
            실시간 추출합니다. 모든 처리는 엣지 디바이스 내부에서 완결되어 영상이 외부로
            전송되지 않는 <strong>프라이버시 퍼스트 헬스케어</strong> 솔루션입니다.
          </p>
          <div className="ae-hero-actions">
            <Link className="ae-btn ae-btn-primary" to="/dashboard">
              <Icon name="layers" size={17} />
              라이브 대시보드 보기
              <span className="ae-btn-arrow">→</span>
            </Link>
            <a className="ae-btn ae-btn-secondary" href="#how">
              작동 원리 보기
            </a>
          </div>
          <Link className="ae-hero-demolink" to="/elder/2/live">
            <span className="ae-demolink-dot" />
            실시간 분석 데모 바로 보기
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        {/* 실제 라이브 스켈레톤 위젯을 감싸는 프레임 */}
        <div className="ae-preview-container">
          <div className="ae-preview-frame">
            <div className="ae-preview-topbar">
              <div className="ae-mac-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="ae-preview-tag">MediaPipe Pose · On-Device</span>
            </div>
            <div className="ae-preview-body">
              <SkeletonPreview height={320} />
            </div>
          </div>
        </div>

        <div className="ae-stat-band">
          <div className="ae-stat">
            <p className="ae-stat-num">33<span className="ae-stat-unit">개</span></p>
            <p className="ae-stat-label">실시간 추적 관절 포인트</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num">100<span className="ae-stat-unit">%</span></p>
            <p className="ae-stat-label">온디바이스 연산 · 영상 미전송</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num ae-stat-pending">95%+</p>
            <p className="ae-stat-label">낙상 4분류 목표 정확도</p>
          </div>
          <div className="ae-stat">
            <p className="ae-stat-num ae-stat-pending">&lt; 30<span className="ae-stat-unit">ms</span></p>
            <p className="ae-stat-label">실시간 추론 지연시간</p>
          </div>
        </div>
      </section>

      {/* ---------- 문제 정의 ---------- */}
      <section className="ae-section">
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">문제 정의</span>
          <h2>초고령사회, 돌봄의 공백이 커지고 있습니다</h2>
          <p className="ae-body">
            한국과 일본은 세계에서 가장 빠르게 고령화되는 국가입니다. 독거노인의
            낙상 사고는 발견이 늦을수록 치명적이지만, 간병 인력은 절대적으로
            부족합니다. 24시간 곁을 지킬 수 없다면, 기술이 그 공백을 메워야 합니다.
          </p>
        </div>
        <div className="ae-card-row">
          <div className="ae-mini-card">
            <p className="ae-mini-num">7.2%</p>
            <p className="ae-mini-label">65세 이상 연간 낙상 경험률</p>
            <span className="ae-card-caption">2020 노인실태조사</span>
          </div>
          <div className="ae-mini-card highlight">
            <p className="ae-mini-num">6~12개월</p>
            <p className="ae-mini-label">고관절 골절 시 회복 기간</p>
            <span className="ae-card-caption">완전 회복 1/3 수준 · 서울아산병원</span>
          </div>
          <div className="ae-mini-card">
            <p className="ae-mini-num">간병 인력난</p>
            <p className="ae-mini-label">한·일 공통 구조적 과제</p>
            <span className="ae-card-caption">24시간 관제 솔루션 필요성</span>
          </div>
        </div>
      </section>

      {/* ---------- 목표 아키텍처 ---------- */}
      <section className="ae-section" id="how" ref={pipelineRef}>
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">목표 아키텍처</span>
          <h2>카메라에서 알림까지, 5단계 엔드투엔드 파이프라인</h2>
          <p className="ae-section-sub">
            스켈레톤 추적까지 구현 완료 · 이후 단계는 개발 중
          </p>
        </div>

        <div className="ae-pipeline">
          <div className="ae-pipeline-signal">
            <VitalLine active={pulse} />
          </div>
          <div className="ae-pipeline-steps">
            {[
              { icon: "camera", title: "RGB-D 카메라", sub: "실시간 영상 입력", done: true },
              { icon: "skeleton", title: "MediaPipe Pose", sub: "33개 관절 추출", done: true },
              { icon: "wave", title: "특징 융합", sub: "기울기·각속도·가속도" },
              { icon: "cpu", title: "낙상 분류", sub: "LSTM · 4-class" },
              { icon: "bell", title: "보호자 알림", sub: "FCM · 3초 이내" },
            ].map((s, idx) => (
              <div
                className={`ae-pipeline-step ${s.done ? "is-done" : "is-planned"}`}
                key={s.title}
              >
                <div className="ae-step-top">
                  <span className="ae-step-idx">{`0${idx + 1}`}</span>
                  <span className={`ae-step-badge ${s.done ? "done" : "planned"}`}>
                    {s.done ? "구현 완료" : "개발 예정"}
                  </span>
                </div>
                <div className="ae-step-icon">
                  <Icon name={s.icon} size={22} />
                </div>
                <p className="ae-pipeline-title">{s.title}</p>
                <p className="ae-pipeline-sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 현재 구현 ---------- */}
      <section className="ae-section">
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">현재 구현</span>
          <h2>지금 동작하는 핵심 기능</h2>
        </div>
        <div className="ae-feature-grid">
          <div className="ae-feature-card">
            <div className="ae-feature-icon-box">
              <Icon name="skeleton" size={24} />
            </div>
            <p className="ae-feature-title">실시간 33관절 스켈레톤 추출</p>
            <p className="ae-feature-body">
              MediaPipe Pose를 통해 카메라 영상에서 신체 33개 관절 좌표를 프레임 단위로
              정밀 추출하여 브라우저 캔버스 위에 실시간 렌더링합니다.
            </p>
          </div>
          <div className="ae-feature-card">
            <div className="ae-feature-icon-box">
              <Icon name="lock" size={24} />
            </div>
            <p className="ae-feature-title">100% 온디바이스 프라이버시 보호</p>
            <p className="ae-feature-body">
              모든 영상 처리는 엣지 기기(브라우저·Jetson) 내부에서만 수행됩니다.
              외부 서버로 원본 영상을 절대 전송하지 않아 사생활 침해 걱정이 없습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 로드맵 ---------- */}
      <section className="ae-section">
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">다음 단계 · 로드맵</span>
          <h2>자세 추적 위에 구축할 AI 안전망</h2>
        </div>
        <div className="ae-feature-grid">
          <div className="ae-feature-card">
            <span className="ae-roadmap-tag in-dev">개발 중</span>
            <div className="ae-feature-icon-box">
              <Icon name="wave" size={24} />
            </div>
            <p className="ae-feature-title">실시간 낙상 감지 (4-Class)</p>
            <p className="ae-feature-body">
              추출된 시계열 관절 모션을 심층 신경망으로 분석하여 단순 넘어짐, 의자 미끄러짐,
              전도 등 4가지 위험 상황을 정밀 분류합니다.
            </p>
          </div>
          <div className="ae-feature-card">
            <span className="ae-roadmap-tag planned">예정</span>
            <div className="ae-feature-icon-box">
              <Icon name="phone" size={24} />
            </div>
            <p className="ae-feature-title">보호자 즉각 비상 알림</p>
            <p className="ae-feature-body">
              낙상 발생 시 React PWA 및 FCM 푸시를 통해 보호자와 관제사에게 3초 이내로
              발생 위치, 신뢰도, 전후 모션 스냅샷을 전송합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 기술 스택 ---------- */}
      <section className="ae-section" id="tech">
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">기술 스택</span>
          <h2>엣지 AI 및 관제 인프라</h2>
        </div>
        <div className="ae-chip-row">
          {[
            "Jetson Orin Nano Super",
            "NVIDIA TensorRT",
            "MediaPipe Pose",
            "PyTorch / ONNX",
            "Firebase Cloud Messaging",
            "React 18 PWA",
            "Vite",
            "WebSocket",
          ].map((t) => (
            <span className="ae-chip" key={t}>
              <span className="ae-chip-dot" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- 데모 ---------- */}
      <section className="ae-section" id="demo">
        <div className="ae-section-header">
          <span className="ae-eyebrow ae-eyebrow-accent">데모</span>
          <h2>시연 및 연동 뷰</h2>
        </div>
        <div className="ae-demo-grid">
          <AssetPlaceholder
            label="실시간 낙상 감지 데모 영상"
            hint="Jetson Orin 실시간 추론 시연 영상 준비 중"
            height={240}
          />
          <AssetPlaceholder
            label="보호자 관제 앱 알림 뷰"
            hint="모바일 PWA 푸시 수신 화면 준비 중"
            height={240}
          />
        </div>
      </section>

      {/* ---------- 팀 / 푸터 ---------- */}
      <footer className="ae-footer" id="team">
        <div className="ae-footer-info">
          <div className="ae-footer-brand">
            <Icon name="eye" size={18} />
            <span>Angel-Eye Project</span>
          </div>
          <p className="ae-footer-sub">
            독거노인 비접촉 낙상 감지 및 엣지 AI 관제 시스템
          </p>
        </div>
        <div className="ae-footer-links">
          <a
            href="https://github.com/dante3804/angel-eye-web"
            target="_blank"
            rel="noreferrer"
            className="ae-footer-link"
          >
            <Icon name="github" size={16} /> GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}