import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    parent_chunk_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("knowledge_chunks.id"), nullable=True
    )
    chunk_level: Mapped[str] = mapped_column(String(20), nullable=False)  # 'parent' or 'child'
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding column will use pgvector when available
    topic_tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
