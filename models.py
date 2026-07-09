from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) # 자동 생성
    name = Column(String, nullable=False) # 이름
    phone = Column(String, nullable=False)   # 보호자 연락처
    role = Column(String, nullable=False)    # "elder" or "guardian"
    fcm_token = Column(String, nullable=True)   # 추가: 보호자 알림용
    created_at = Column(DateTime, default=datetime.utcnow)
    
    events = relationship("Event", back_populates="user")
    
class Guardianship(Base):
    __tablename__ = "guardianships"

    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    guardian_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    elder = relationship("User", foreign_keys=[elder_id])
    guardian = relationship("User", foreign_keys=[guardian_id])
    
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    risk_level = Column(String, nullable=False)  # "normal" / "caution" / "danger"
    action = Column(String, nullable=False)      # "falling", "standing_up" 등
    detected_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="events")
    notifications = relationship("Notification", back_populates="event")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False)  # "sent" / "failed"

    event = relationship("Event", back_populates="notifications")