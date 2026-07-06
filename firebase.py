import firebase_admin
from firebase_admin import credentials, messaging

# 서비스 계정 키 파일로 Firebase 초기화
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