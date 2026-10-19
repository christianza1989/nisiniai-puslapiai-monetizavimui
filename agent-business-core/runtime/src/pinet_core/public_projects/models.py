from datetime import datetime

from sqlalchemy import JSON, DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..control.models import ControlScope
from ..models import Base, utcnow


class Project(ControlScope, Base):
    __tablename__ = "control_public_projects"
    slug: Mapped[str] = mapped_column(String)
    public_payload: Mapped[dict] = mapped_column(JSON)
    private_evidence: Mapped[dict] = mapped_column(JSON)
    revision_hash: Mapped[str] = mapped_column(String)
    approved_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    publish_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("slug", "environment_id"),)
