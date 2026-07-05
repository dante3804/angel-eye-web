from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db

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


# ── Event ─────────────────────────────
@app.get("/events", response_model=list[schemas.EventResponse])
def get_events(db: Session = Depends(get_db)):
    return db.query(models.Event).all()

@app.post("/events", response_model=schemas.EventResponse)
def add_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    # user_id가 실제 존재하는지 확인
    user = db.query(models.User).filter(models.User.id == event.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 유저입니다")
    new_event = models.Event(
        user_id=event.user_id,
        risk_level=event.risk_level,
        action=event.action
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

# ── Notification ──────────────────────
@app.get("/notifications", response_model=list[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(models.Notification).all()

@app.post("/notifications", response_model=schemas.NotificationResponse)
def add_notification(noti: schemas.NotificationCreate, db: Session = Depends(get_db)):
    # event_id가 실제 존재하는지 확인
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
    # 1. user_id 존재 확인
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 유저입니다")

    # 2. 이벤트 저장
    new_event = models.Event(
        user_id=data.user_id,
        risk_level=data.risk_level,
        action=data.action,
        detected_at=data.timestamp  # Jetson이 보낸 시간을 그대로 저장
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event
