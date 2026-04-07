import json
from typing import Optional

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.db.session import Session
from app.models.db.user import User


class MemoryLoader:
    """Loads conversation context from Redis (short-term) and Postgres (long-term)."""

    def __init__(self, redis_client: redis.Redis, db: AsyncSession):
        self.redis = redis_client
        self.db = db

    async def load_recent_turns(self, user_id: str, limit: int = 15) -> list[dict]:
        """Load recent conversation turns from Redis."""
        key = f"session:{user_id}:turns"
        try:
            turns_raw = await self.redis.lrange(key, -limit, -1)
            return [json.loads(t) for t in turns_raw]
        except Exception:
            return []

    async def save_turn(self, user_id: str, role: str, content: str):
        """Save a conversation turn to Redis."""
        key = f"session:{user_id}:turns"
        turn = json.dumps({"role": role, "content": content})
        try:
            await self.redis.rpush(key, turn)
            await self.redis.ltrim(key, -30, -1)  # Keep last 30 turns
            await self.redis.expire(key, 86400)  # 24h TTL
        except Exception as e:
            print(f"MemoryLoader save_turn error: {e}")

    async def load_entity_graph(self, user_id: str) -> list[dict]:
        """Load entity graph from Redis cache."""
        key = f"session:{user_id}:entities"
        try:
            entities_raw = await self.redis.get(key)
            if entities_raw:
                return json.loads(entities_raw)
        except Exception:
            pass
        return []

    async def save_entity_graph(self, user_id: str, entities: list[dict]):
        """Save entity graph to Redis."""
        key = f"session:{user_id}:entities"
        try:
            await self.redis.set(key, json.dumps(entities), ex=86400)
        except Exception as e:
            print(f"MemoryLoader save_entity_graph error: {e}")

    async def load_emotion_trajectory(self, user_id: str) -> list[dict]:
        """Load recent emotion states from Redis."""
        key = f"session:{user_id}:emotion_traj"
        try:
            emotions_raw = await self.redis.lrange(key, -10, -1)
            return [json.loads(e) for e in emotions_raw]
        except Exception:
            return []

    async def save_emotion_state(self, user_id: str, emotion_state: dict):
        """Save emotion state to trajectory."""
        key = f"session:{user_id}:emotion_traj"
        try:
            await self.redis.rpush(key, json.dumps(emotion_state))
            await self.redis.ltrim(key, -10, -1)
            await self.redis.expire(key, 86400)
        except Exception as e:
            print(f"MemoryLoader save_emotion error: {e}")

    async def load_user_profile(self, user_id: str) -> Optional[dict]:
        """Load user profile from cache or DB."""
        cache_key = f"user:{user_id}:profile_cache"
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

        # Fallback to DB
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            profile = {
                "display_name": user.display_name,
                "timezone": user.timezone,
                "care_streak_days": user.care_streak_days,
            }
            try:
                await self.redis.set(cache_key, json.dumps(profile), ex=300)
            except Exception:
                pass
            return profile
        return None

    async def load_session_summaries(self, user_id: str, limit: int = 3) -> list[dict]:
        """Load recent session summaries from Postgres."""
        try:
            result = await self.db.execute(
                select(Session)
                .where(Session.user_id == user_id, Session.summary_text.isnot(None))
                .order_by(desc(Session.started_at))
                .limit(limit)
            )
            sessions = result.scalars().all()
            return [
                {
                    "summary": s.summary_text,
                    "dominant_emotion": s.dominant_emotion,
                    "started_at": s.started_at.isoformat() if s.started_at else None,
                }
                for s in sessions
            ]
        except Exception:
            return []
