import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.dependencies import get_db, get_current_user
from app.models.db.user import User
from app.models.db.session import Session
from app.models.db.message import Message
from app.models.schemas.session import SessionSummary

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=list[SessionSummary])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sessions for the current user."""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .order_by(desc(Session.started_at))
        .limit(50)
    )
    sessions = result.scalars().all()
    return [SessionSummary.model_validate(s) for s in sessions]


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get session detail with messages."""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()

    return {
        "id": session.id,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "summary_text": session.summary_text,
        "dominant_emotion": session.dominant_emotion,
        "risk_level_peak": session.risk_level_peak,
        "turn_count": session.turn_count,
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content_text,
                "emotion_state": json.loads(msg.emotion_state_json) if msg.emotion_state_json else None,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }
            for msg in messages
        ],
    }
