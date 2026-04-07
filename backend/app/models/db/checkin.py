import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CheckinLog(Base):
    __tablename__ = "checkin_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # email/push/both
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replied: Mapped[bool] = mapped_column(Boolean, default=False)
