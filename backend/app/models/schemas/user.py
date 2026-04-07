from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)
    timezone: str = Field(default="UTC", max_length=50)


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    timezone: str
    care_streak_days: int
    checkin_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: str
    display_name: str
    timezone: str
    care_streak_days: int
    last_streak_date: Optional[datetime] = None
    checkin_enabled: bool

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)


class MoodEntry(BaseModel):
    mood: str = Field(..., description="One of: wonderful, good, okay, meh, struggling, rough")


class MoodRecord(BaseModel):
    date: str
    mood: str


class MoodHistoryResponse(BaseModel):
    moods: List[MoodRecord]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
