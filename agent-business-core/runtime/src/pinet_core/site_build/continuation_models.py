"""Explicit current owner/source continuation, separate from historical approval."""
from sqlalchemy import ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned, parent
from ..models import Base


class BuildContinuation(Owned, Base):
    __tablename__ = "control_site_build_continuations"
    creation_id: Mapped[str] = mapped_column(String)
    approval_id: Mapped[str] = mapped_column(String)
    revision_id: Mapped[str] = mapped_column(String)
    accepted_revision: Mapped[int] = mapped_column(Integer)
    session_id: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    context_sha256: Mapped[str] = mapped_column(String)
    context: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        UniqueConstraint("user_id", "environment_id", "idempotency_key", name="uq_build_continuation_request"),
        parent("control_creations", "creation_id"),
        parent("control_business_build_approvals", "approval_id"),
        parent("control_creation_revisions", "revision_id"),
        ForeignKeyConstraint(["session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="RESTRICT", name="fk_build_continuation_session"),
    )
