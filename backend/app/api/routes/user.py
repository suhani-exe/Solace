from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from app.core.dependencies import get_db, get_current_user, get_redis_pool
from app.models.db.user import User
from app.models.schemas.user import (
    UserResponse,
    UserProfileUpdate,
    MoodEntry,
    MoodRecord,
    MoodHistoryResponse,
)

router = APIRouter(prefix="/user", tags=["user"])

VALID_MOODS = {"wonderful", "good", "okay", "meh", "struggling", "rough"}


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile fields (currently: display_name)."""
    if update.display_name is not None:
        current_user.display_name = update.display_name

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/mood", status_code=status.HTTP_201_CREATED)
async def submit_mood(
    entry: MoodEntry,
    current_user: User = Depends(get_current_user),
    r: redis.Redis = Depends(get_redis_pool),
):
    """Record today's mood. One entry per day per user."""
    if entry.mood not in VALID_MOODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mood. Choose from: {', '.join(sorted(VALID_MOODS))}",
        )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"mood:{current_user.id}:{today}"

    # Store in Redis with 90-day TTL
    await r.set(key, entry.mood, ex=90 * 86400)

    return {"date": today, "mood": entry.mood}


@router.get("/mood/history", response_model=MoodHistoryResponse)
async def get_mood_history(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    r: redis.Redis = Depends(get_redis_pool),
):
    """Retrieve mood history for the last N days (default 30)."""
    days = min(days, 90)  # Cap at 90
    moods = []
    today = datetime.now(timezone.utc).date()

    for i in range(days):
        date = today - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        key = f"mood:{current_user.id}:{date_str}"
        mood = await r.get(key)
        if mood:
            moods.append(MoodRecord(date=date_str, mood=mood))

    return MoodHistoryResponse(moods=moods)


@router.get("/mood/today")
async def get_today_mood(
    current_user: User = Depends(get_current_user),
    r: redis.Redis = Depends(get_redis_pool),
):
    """Check if user has already logged mood today."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"mood:{current_user.id}:{today}"
    mood = await r.get(key)
    return {"date": today, "mood": mood, "logged": mood is not None}
