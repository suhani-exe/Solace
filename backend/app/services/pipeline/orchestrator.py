import asyncio
import json
import uuid
from typing import AsyncGenerator
from datetime import datetime, timezone

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db.message import Message
from app.models.db.session import Session
from app.models.db.entity import UserEntity
from app.models.schemas.chat import EmotionState, RiskAssessment
from app.services.pipeline.emotion_detector import EmotionDetector
from app.services.pipeline.safety_monitor import SafetyMonitor
from app.services.pipeline.entity_extractor import EntityExtractor
from app.services.pipeline.memory_loader import MemoryLoader
from app.services.pipeline.prompt_builder import PromptBuilder
from app.services.pipeline.response_generator import ResponseGenerator
from app.services.pipeline.quality_guard import QualityGuard


class MessagePipeline:
    """Orchestrates the full message processing pipeline."""

    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.emotion_detector = EmotionDetector()
        self.safety_monitor = SafetyMonitor()
        self.entity_extractor = EntityExtractor()
        self.memory_loader = MemoryLoader(redis_client, db)
        self.prompt_builder = PromptBuilder()
        self.response_generator = ResponseGenerator()
        self.quality_guard = QualityGuard()

    async def get_or_create_session(self, user_id: str, session_id: str = None) -> str:
        """Get existing session or create a new one."""
        if session_id:
            return session_id

        new_session = Session(
            id=str(uuid.uuid4()),
            user_id=user_id,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(new_session)
        await self.db.commit()
        return new_session.id

    async def process_message(
        self,
        user_id: str,
        message_content: str,
        session_id: str = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Full pipeline: analyze → context → prompt → stream → guard → save.
        Yields SSE events as dicts.
        """
        # Get or create session
        session_id = await self.get_or_create_session(user_id, session_id)

        # Create message record
        message_id = str(uuid.uuid4())
        user_message = Message(
            id=message_id,
            session_id=session_id,
            user_id=user_id,
            role="user",
            content_text=message_content,
        )
        self.db.add(user_message)
        await self.db.commit()

        # Send session info
        yield {"event": "session", "data": json.dumps({"session_id": session_id, "message_id": message_id})}

        # ═══════════════════════════════════════════════
        # STAGE 1: Parallel Pre-Processing
        # ═══════════════════════════════════════════════
        recent_turns = await self.memory_loader.load_recent_turns(user_id)

        emotion_task = self.emotion_detector.analyze(message_content, recent_turns)
        safety_task = self.safety_monitor.assess(message_content)

        emotion_state, risk_assessment = await asyncio.gather(emotion_task, safety_task)

        # Send emotion data to frontend
        yield {
            "event": "emotion",
            "data": json.dumps({
                "primary_emotion": emotion_state.primary_emotion,
                "intensity": emotion_state.intensity,
                "risk_level": risk_assessment.risk_level,
                "implicit_signals": emotion_state.implicit_signals,
            }),
        }

        # ═══════════════════════════════════════════════
        # STAGE 2: Context Assembly
        # ═══════════════════════════════════════════════
        existing_entities = await self.memory_loader.load_entity_graph(user_id)
        entity_extraction = await self.entity_extractor.extract(message_content, existing_entities)

        # Merge new entities into graph
        merged_entities = self._merge_entities(existing_entities, entity_extraction.entities)
        await self.memory_loader.save_entity_graph(user_id, merged_entities)

        user_profile = await self.memory_loader.load_user_profile(user_id)
        session_summaries = await self.memory_loader.load_session_summaries(user_id)

        # ═══════════════════════════════════════════════
        # STAGE 3: Prompt Construction
        # ═══════════════════════════════════════════════
        system_instruction, user_prompt = self.prompt_builder.build(
            user_message=message_content,
            user_profile=user_profile,
            entity_graph=merged_entities,
            conversation_history=recent_turns,
            session_summaries=session_summaries,
            emotion_state=emotion_state,
            risk_assessment={
                "risk_level": risk_assessment.risk_level,
                "escalate": risk_assessment.escalate,
            },
        )

        # ═══════════════════════════════════════════════
        # STAGE 4: Generation + Streaming
        # ═══════════════════════════════════════════════
        full_response = ""
        async for token in self.response_generator.stream(system_instruction, user_prompt):
            full_response += token
            yield {"event": "token", "data": token}

        # ═══════════════════════════════════════════════
        # STAGE 4b: Quality Guard
        # ═══════════════════════════════════════════════
        quality = await self.quality_guard.evaluate(full_response, message_content)

        if not quality.passed:
            # Regenerate with quality feedback
            enhanced_instruction = (
                system_instruction
                + f"\n\n[QUALITY FEEDBACK — PREVIOUS RESPONSE REJECTED]\n"
                f"Issues: {', '.join(quality.issues)}\n"
                f"Generate a better response that is specific, personal, and non-generic."
            )
            full_response = ""
            yield {"event": "retry", "data": ""}
            async for token in self.response_generator.stream(enhanced_instruction, user_prompt):
                full_response += token
                yield {"event": "token", "data": token}

        yield {"event": "done", "data": ""}

        # ═══════════════════════════════════════════════
        # STAGE 5: Memory Write-Back (async, non-blocking)
        # ═══════════════════════════════════════════════
        try:
            # Save turns to Redis
            await self.memory_loader.save_turn(user_id, "user", message_content)
            await self.memory_loader.save_turn(user_id, "assistant", full_response)

            # Save emotion trajectory
            await self.memory_loader.save_emotion_state(user_id, emotion_state.model_dump())

            # Save assistant message to Postgres
            assistant_message = Message(
                id=str(uuid.uuid4()),
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content_text=full_response,
                emotion_state_json=json.dumps(emotion_state.model_dump()),
                risk_assessment_json=json.dumps(risk_assessment.model_dump()),
                entities_extracted_json=json.dumps(entity_extraction.model_dump()),
                quality_retry_count=0 if quality.passed else 1,
            )
            self.db.add(assistant_message)

            # Update user message with analysis
            user_message.emotion_state_json = json.dumps(emotion_state.model_dump())
            user_message.risk_assessment_json = json.dumps(risk_assessment.model_dump())
            user_message.entities_extracted_json = json.dumps(entity_extraction.model_dump())

            # Update session turn count
            from sqlalchemy import select
            result = await self.db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.turn_count = (session.turn_count or 0) + 1
                if emotion_state.primary_emotion:
                    session.dominant_emotion = emotion_state.primary_emotion
                if risk_assessment.risk_level:
                    current_peak = session.risk_level_peak or "LOW"
                    risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
                    if risk_order.get(risk_assessment.risk_level, 0) > risk_order.get(current_peak, 0):
                        session.risk_level_peak = risk_assessment.risk_level

            # Save entities to Postgres
            await self._persist_entities(user_id, entity_extraction.entities)

            await self.db.commit()
        except Exception as e:
            print(f"Pipeline write-back error: {e}")
            await self.db.rollback()

    def _merge_entities(self, existing: list[dict], new: list[dict]) -> list[dict]:
        """Merge new entities into existing entity graph."""
        entity_map = {e.get("name", "").lower(): e for e in existing}
        for entity in new:
            name = entity.get("name", "").lower()
            if name in entity_map:
                # Merge emotional tags
                existing_tags = set(entity_map[name].get("emotional_tags", []))
                new_tags = set(entity.get("emotional_tags", []))
                entity_map[name]["emotional_tags"] = list(existing_tags | new_tags)
                entity_map[name]["mention_count"] = entity_map[name].get("mention_count", 1) + 1
            else:
                entity["mention_count"] = 1
                entity_map[name] = entity

        # Cap at 50 entities, evict least mentioned
        entities_list = list(entity_map.values())
        if len(entities_list) > 50:
            entities_list.sort(key=lambda x: x.get("mention_count", 0), reverse=True)
            entities_list = entities_list[:50]

        return entities_list

    async def _persist_entities(self, user_id: str, entities: list[dict]):
        """Save extracted entities to Postgres."""
        from sqlalchemy import select
        for entity in entities:
            name = entity.get("name", "")
            if not name:
                continue

            result = await self.db.execute(
                select(UserEntity).where(
                    UserEntity.user_id == user_id,
                    UserEntity.entity_name == name,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.mention_count += 1
                existing.last_mentioned_at = datetime.now(timezone.utc)
                tags = json.loads(existing.emotional_tags_json or "[]")
                new_tags = entity.get("emotional_tags", [])
                existing.emotional_tags_json = json.dumps(list(set(tags + new_tags)))
            else:
                new_entity = UserEntity(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    entity_name=name,
                    entity_type=entity.get("type", "concept"),
                    emotional_tags_json=json.dumps(entity.get("emotional_tags", [])),
                )
                self.db.add(new_entity)
