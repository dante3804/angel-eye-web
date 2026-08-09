"""
젯슨(Jetson) -> 백엔드(FastAPI) 연동 코드
- AI가 낙상을 감지하면 send_event()를 호출해서 백엔드로 전송
- 백엔드는 POST /jetson/event 에서 device_id, timestamp를 받아서
  보호자를 조회하고 FCM 푸시를 보낸 뒤 Notification에 기록함

사용 전 확인사항:
1. PC(백엔드)와 젯슨이 같은 네트워크(같은 공유기)에 연결되어 있어야 함
2. 백엔드는 `uvicorn main:app --host 0.0.0.0 --port 8000` 로 실행되어 있어야 함
   (host를 0.0.0.0으로 안 하면 외부 기기에서 접근 불가)
3. 아래 BACKEND_HOST를 PC의 실제 IP로 바꿀 것 (예: 192.168.0.15)
"""

import requests
from datetime import datetime, timezone

# ── 설정 ──────────────────────────────────────────────
BACKEND_HOST = "192.168.0.11"   # TODO: PC의 실제 IP로 변경
BACKEND_PORT = 8000
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}/jetson/event"

DEVICE_ID = "jetson-01"          # TODO: 실제 기기 ID로 변경 (DB에 등록된 값과 일치해야 함)
TIMEOUT_SEC = 5                  # 응답 대기 시간
MAX_RETRIES = 2                  # 실패 시 재시도 횟수


def send_event(device_id: str = DEVICE_ID) -> bool:
    """
    낙상 감지 시 호출하는 함수.
    성공하면 True, 실패하면 False를 반환한다.
    """
    payload = {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            response = requests.post(BACKEND_URL, json=payload, timeout=TIMEOUT_SEC)
            response.raise_for_status()
            print(f"[전송 성공] {payload} -> {response.status_code}")
            return True

        except requests.exceptions.ConnectionError:
            print(f"[재시도 {attempt}] 백엔드에 연결할 수 없음. IP/포트/네트워크 확인 필요")
        except requests.exceptions.Timeout:
            print(f"[재시도 {attempt}] 응답 시간 초과")
        except requests.exceptions.HTTPError as e:
            print(f"[전송 실패] 서버 에러: {e} / 응답 내용: {response.text}")
            return False  # 서버가 응답은 했지만 에러 -> 재시도 의미 없음

    print("[전송 실패] 최대 재시도 횟수 초과")
    return False


if __name__ == "__main__":
    # 단독 실행 시 테스트용 - AI 감지 로직 없이 강제로 이벤트 1건 전송
    print("테스트 이벤트 전송 중...")
    send_event()

    # ── 실제 AI 감지 루프에 통합할 때는 이렇게 사용 ──
    # while True:
    #     result = ai_model.detect(frame)
    #     if result.is_fall_detected:
    #         send_event()
