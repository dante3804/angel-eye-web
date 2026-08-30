from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
from firebase import send_push_notification

# DB에 테이블 자동 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def home():
    return {"message": "server running"}


@app.get("/users", response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.post("/users", response_model=schemas.UserResponse)
def add_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    new_user = models.User(name=user.name, phone=user.phone, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.put("/users", response_model=schemas.UserResponse)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.id == user_id).first()

    if not existing:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없음")

    existing.name = user.name
    existing.phone = user.phone
    existing.role = user.role

    db.commit()
    db.refresh(existing)

    return existing


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.id == user_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없음")

    db.delete(existing)
    db.commit()

    return {"message": "삭제 완료"}


@app.get("/users/{user_id}/events", response_model=schemas.UserWithEvents)
def get_user_events(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 유저입니다")
    return user


# ── 공통 헬퍼 함수 ─────────────────────────
def create_event_record(db: Session, user_id: int, direction: str, location: str,
                         orthostatic_risk: str, prior_rest_min=None,
                         seconds_after_standing=None, detected_at=None):
    """이벤트 생성 공통 로직 (유저 존재 확인 + 저장)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 유저입니다")

    new_event = models.Event(
        user_id=user_id,
        direction=direction,
        location=location,
        orthostatic_risk=orthostatic_risk,
        prior_rest_min=prior_rest_min,
        seconds_after_standing=seconds_after_standing,
        **({"detected_at": detected_at} if detected_at else {})
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event




def notify_guardians(db: Session, event: models.Event):
    """이벤트에 대해 보호자들에게 알림 발송"""
    guardianships = db.query(models.Guardianship).filter(
        models.Guardianship.elder_id == event.user_id
    ).all()

    for g in guardianships:
        guardian = db.query(models.User).filter(models.User.id == g.guardian_id).first()

        status = "failed"
        if guardian and guardian.fcm_token:
            try:
                send_push_notification(
                    token=guardian.fcm_token,
                    title="낙상 감지",
                    body=f"{event.location}에서 {event.direction} 방향 낙상이 감지되었습니다"
                )
                status = "sent"
            except Exception as e:
                print(f"알림 발송 실패: {e}")
                status = "failed"

        db.add(models.Notification(event_id=event.id, status=status))

    db.commit()

# ── Event ─────────────────────────────
@app.get("/events", response_model=list[schemas.EventResponse])
def get_events(db: Session = Depends(get_db)):
    return db.query(models.Event).all()


@app.post("/events", response_model=schemas.EventResponse)
def add_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    return create_event_record(
        db, event.user_id, event.direction, event.location,
        event.orthostatic_risk, event.prior_rest_min, event.seconds_after_standing
    )


# ── Notification ──────────────────────
@app.get("/notifications", response_model=list[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(models.Notification).all()


@app.post("/notifications", response_model=schemas.NotificationResponse)
def add_notification(noti: schemas.NotificationCreate, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == noti.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="존재하지 않는 이벤트입니다")

    new_noti = models.Notification(
        event_id=noti.event_id,
        status=noti.status
    )
    db.add(new_noti)
    db.commit()
    db.refresh(new_noti)
    return new_noti


# ── Jetson 수신 API ──────────────────────────
@app.post("/jetson/event", response_model=schemas.EventResponse)
def receive_jetson_event(data: schemas.JetsonEvent, db: Session = Depends(get_db)):
    new_event = create_event_record(
        db, data.user_id, data.direction, data.location,
        data.orthostatic_risk, data.prior_rest_min, data.seconds_after_standing,
        data.occurred_at
    )

    # 실시간 낙상 감지이므로 이벤트가 들어오면 항상 보호자에게 알림
    notify_guardians(db, new_event)

    return new_event


# FCM 토큰 등록/수정
@app.put("/users/fcm-token", response_model=schemas.UserResponse)
def update_fcm_token(data: schemas.FcmTokenUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 유저입니다")

    user.fcm_token = data.fcm_token
    db.commit()
    db.refresh(user)
    return user


# Guardianship 연결 생성 (노인-보호자 매칭)
@app.post("/guardianships")
def add_guardianship(data: schemas.GuardianshipCreate, db: Session = Depends(get_db)):
    elder = db.query(models.User).filter(models.User.id == data.elder_id).first()
    guardian = db.query(models.User).filter(models.User.id == data.guardian_id).first()

    if not elder or elder.role != "elder":
        raise HTTPException(status_code=404, detail="존재하지 않거나 elder가 아닙니다")
    if not guardian or guardian.role != "guardian":
        raise HTTPException(status_code=404, detail="존재하지 않거나 guardian이 아닙니다")

    new_link = models.Guardianship(
        elder_id=data.elder_id,
        guardian_id=data.guardian_id
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return {"message": "연결 완료", "id": new_link.id}