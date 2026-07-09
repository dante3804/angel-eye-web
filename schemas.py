from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

# ---------------User ──────────────
class UserCreate(BaseModel):
    name: str
    phone: str
    role: str  # "elder" or "guardian"
    
    @field_validator("role")
    def validate_role(cls, v):
        allowed = ["elder", "guardian"]
        if v not in allowed:
            raise ValueError(f"role은 {allowed} 중 하나여야 합니다")
        return v

class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True  # DB 객체를 JSON으로 변환할 수 있게 해줌
        
# --------------Event ─────────────────────────────
class EventCreate(BaseModel):
    user_id: int
    risk_level: str  # "normal" / "caution" / "danger"
    action: str      # "falling", "standing_up" 등
    
    @field_validator("risk_level")
    def validate_risk_level(cls, v):
        allowed = ["normal", "caution", "danger"]
        if v not in allowed:
            raise ValueError(f"risk_level은 {allowed} 중 하나여야 합니다")
        return v

    @field_validator("action")
    def validate_action(cls, v):
        allowed = ["standing_up", "falling", "climbing", "lying_still"]
        if v not in allowed:
            raise ValueError(f"action은 {allowed} 중 하나여야 합니다")
        return v

class EventResponse(BaseModel):
    id: int
    user_id: int
    risk_level: str
    action: str
    detected_at: datetime

    class Config:
        from_attributes = True


# ------------- Notification ──────────────────────
class NotificationCreate(BaseModel):
    event_id: int
    status: str  # "sent" / "failed"

class NotificationResponse(BaseModel):
    id: int
    event_id: int
    sent_at: datetime
    status: str

    class Config:
        from_attributes = True
        
# ── 중첩 조회용 ──────────────────────────
class NotificationInEvent(BaseModel):
    id: int
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True

class EventInUser(BaseModel):
    id: int
    risk_level: str
    action: str
    detected_at: datetime
    notifications: list[NotificationInEvent]

    class Config:
        from_attributes = True

class UserWithEvents(BaseModel):
    id: int
    name: str
    role: str
    events: list[EventInUser]
    class Config:
        from_attributes = True
        
# ── Jetson 수신용 ──────────────────────────
class JetsonEvent(BaseModel):
    device_id: str       # Jetson 기기 식별자
    user_id: int
    risk_level: str
    action: str
    timestamp: datetime

    @field_validator("risk_level")
    def validate_risk_level(cls, v):
        allowed = ["normal", "caution", "danger"]
        if v not in allowed:
            raise ValueError(f"risk_level은 {allowed} 중 하나여야 합니다")
        return v

    @field_validator("action")
    def validate_action(cls, v):
        allowed = ["standing_up", "falling", "climbing", "lying_still"]
        if v not in allowed:
            raise ValueError(f"action은 {allowed} 중 하나여야 합니다")
        return v
    
# 보호자 FCM 토큰 등록/수정용
class FcmTokenUpdate(BaseModel):
    user_id: int
    fcm_token: str


# Guardianship 연결 생성용
class GuardianshipCreate(BaseModel):
    elder_id: int
    guardian_id: int