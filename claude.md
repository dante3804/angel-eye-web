# Angel-Eye 웹 대시보드

## 프로젝트 개요
AI 비전 기반 고령노인 낙상 감지 시스템의 보호자용 웹 대시보드

## 기술 스택
- React + Vite
- GitHub Pages 배포 (base: '/angel-eye-web/')
- 추후 Firebase 연동 예정 (Firestore + FCM)

## 폴더 구조
- src/components: 재사용 컴포넌트
- src/pages: 페이지 단위 화면
- src/hooks: 커스텀 훅

## 코딩 컨벤션
- 함수형 컴포넌트만 사용
- 모바일 우선 반응형
- 보호자가 고령일 수 있으므로 큰 글씨, 명확한 색상

## 배포 방법
npm run deploy

## 주의사항
- localStorage 사용 금지 (추후 Firebase로 대체)
- 상태 색상: 정상=초록, 주의=노랑, 위험=빨강
