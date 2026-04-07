from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionSummary(BaseModel):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    summary_text: Optional[str] = None
    dominant_emotion: Optional[str] = None
    turn_count: int = 0

    class Config:
        from_attributes = True


class SessionDetail(BaseModel):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    summary_text: Optional[str] = None
    dominant_emotion: Optional[str] = None
    risk_level_peak: Optional[str] = None
    turn_count: int = 0
    messages: list = []

    class Config:
        from_attributes = True
