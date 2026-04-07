import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from app.core.dependencies import get_db, get_current_user, get_redis_pool
from app.models.db.user import User
from app.models.schemas.chat import MessageRequest, MessageResponse
from app.services.pipeline.orchestrator import MessagePipeline
from app.services.memory.streak_manager import StreakManager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message")
async def send_message(
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis_pool),
):
    """
    Send a message and receive a streaming response via SSE.
    Combines POST + SSE in one request for simplicity.
    """

    pipeline = MessagePipeline(db=db, redis_client=redis_client)

    async def event_generator():
        try:
            async for event in pipeline.process_message(
                user_id=current_user.id,
                message_content=request.content,
                session_id=request.session_id,
            ):
                event_type = event.get("event", "token")
                data = event.get("data", "")
                yield f"event: {event_type}\ndata: {data}\n\n"
        except Exception as e:
            print(f"Pipeline error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

        # Update care streak
        try:
            streak_manager = StreakManager(db)
            await streak_manager.update_streak(current_user.id)
        except Exception as e:
            print(f"Streak update error: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chat history for a session."""
    from sqlalchemy import select
    from app.models.db.message import Message

    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id, Message.user_id == current_user.id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content_text,
            "emotion_state": json.loads(msg.emotion_state_json) if msg.emotion_state_json else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        for msg in messages
    ]
