from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    session_id: Optional[str] = None  # If None, creates new session


class MessageResponse(BaseModel):
    message_id: str
    session_id: str


class StreamEvent(BaseModel):
    event: str  # 'token', 'done', 'error', 'emotion'
    data: str


class EmotionState(BaseModel):
    primary_emotion: str = "neutral"
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    implicit_signals: list[str] = Field(default_factory=list)
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL


class RiskAssessment(BaseModel):
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL
    trigger_phrases: list[str] = Field(default_factory=list)
    escalate: bool = False
    reasoning: str = ""


class EntityExtraction(BaseModel):
    entities: list[dict] = Field(default_factory=list)
    # Each entity: { name, type, emotional_tags, context }


class QualityEvaluation(BaseModel):
    passed: bool = True
    issues: list[str] = Field(default_factory=list)


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    emotion_state: Optional[EmotionState] = None
    created_at: Optional[datetime] = None
