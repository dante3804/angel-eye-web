from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

# ---------------- User ----------------
class UserCreate(BaseModel):
    name: str
    phone: str
    role: str

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
        from_attributes = True

# ---------------- 공통 검증 함수 ----------------
def _validate_direction(v):
    allowed = ["front", "back", "side", "unknown"]
    if v not in allowed:
        raise ValueError(f"direction은 {allowed} 중 하나여야 합니다")
    return v

def _validate_location(v):
    allowed = ["bed", "floor"]
    if v not in allowed:
        raise ValueError(f"location은 {allowed} 중 하나여야 합니다")
    return v

def _validate_orthostatic_risk(v):
    allowed = ["high", "medium", "none"]
    if v not in allowed:
        raise ValueError(f"orthostatic_risk는 {allowed} 중 하나여야 합니다")
    return v

# ---------------- Event ----------------
class EventCreate(BaseModel):
    user_id: int
    direction: str
    location: str
    orthostatic_risk: str
    prior_rest_min: Optional[int] = None
    seconds_after_standing: Optional[float] = None

    _v1 = field_validator("direction")(_validate_direction)
    _v2 = field_validator("location")(_validate_location)
    _v3 = field_validator("orthostatic_risk")(_validate_orthostatic_risk)

class EventResponse(BaseModel):
    id: int
    user_id: int
    direction: str
    location: str
    orthostatic_risk: str
    prior_rest_min: Optional[int]
    seconds_after_standing: Optional[float]
    detected_at: datetime
    class Config:
        from_attributes = True

# ---------------- Notification ----------------
class NotificationCreate(BaseModel):
    event_id: int
    status: str

class NotificationResponse(BaseModel):
    id: int
    event_id: int
    sent_at: datetime
    status: str
    class Config:
        from_attributes = True

# ---------------- 중첩 조회 ----------------
class NotificationInEvent(BaseModel):
    id: int
    status: str
    sent_at: datetime
    class Config:
        from_attributes = True

class EventInUser(BaseModel):
    id: int
    direction: str
    location: str
    orthostatic_risk: str
    prior_rest_min: Optional[int]
    seconds_after_standing: Optional[float]
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

# ---------------- Jetson 수신 ----------------
class JetsonEvent(BaseModel):
    device_id: str
    user_id: int
    direction: str
    location: str
    occurred_at: datetime
    orthostatic_risk: str
    prior_rest_min: Optional[int] = None
    seconds_after_standing: Optional[float] = None

    _v1 = field_validator("direction")(_validate_direction)
    _v2 = field_validator("location")(_validate_location)
    _v3 = field_validator("orthostatic_risk")(_validate_orthostatic_risk)

# 보호자 FCM 토큰 등록/수정
class FcmTokenUpdate(BaseModel):
    user_id: int
    fcm_token: str

# Guardianship 연결 생성
class GuardianshipCreate(BaseModel):
    elder_id: int
    guardian_id: int