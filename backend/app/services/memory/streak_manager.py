from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db.user import User


class StreakManager:
    """Manages care streak calculation and updates."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_streak(self, user_id: str):
        """Update care streak for user after a conversation."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return

        today = datetime.now(timezone.utc).date()

        if user.last_streak_date:
            last_date = user.last_streak_date.date() if isinstance(user.last_streak_date, datetime) else user.last_streak_date
            diff = (today - last_date).days

            if diff == 0:
                # Already counted today
                return
            elif diff == 1:
                # Consecutive day — extend streak
                user.care_streak_days += 1
            else:
                # Streak broken — reset
                user.care_streak_days = 1
        else:
            user.care_streak_days = 1

        user.last_streak_date = datetime.now(timezone.utc)
        await self.db.commit()

    async def get_streak(self, user_id: str) -> int:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user.care_streak_days if user else 0
