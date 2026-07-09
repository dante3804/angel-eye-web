import os
import json
import firebase_admin
from firebase_admin import credentials, messaging

# 클라우드 환경(환경변수 있음)인지, 로컬 환경(파일 있음)인지 판단
firebase_key_json = os.environ.get("FIREBASE_KEY_JSON")

if firebase_key_json:
    # 클라우드: 환경변수에 저장된 JSON 문자열을 파싱해서 사용
    cred_dict = json.loads(firebase_key_json)
    cred = credentials.Certificate(cred_dict)
else:
    # 로컬: 기존처럼 파일에서 읽기
    cred = credentials.Certificate("firebase_key.json")

firebase_admin.initialize_app(cred)


def send_push_notification(token: str, title: str, body: str):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        token=token  # 보호자 기기 FCM 토큰
    )
    response = messaging.send(message)
    return response