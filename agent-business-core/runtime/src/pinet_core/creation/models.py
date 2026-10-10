from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..control.models import ControlScope
from ..models import Base, utcnow


class Owned(ControlScope):
    user_id: Mapped[str] = mapped_column(String)
    organization_id: Mapped[str] = mapped_column(String)
    portfolio_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


BINDING = ["id", "user_id", "organization_id", "portfolio_id", "environment_id"]


def parent(table, key):
    return ForeignKeyConstraint([key, *BINDING[1:]], [f"{table}.{c}" for c in BINDING], ondelete="CASCADE")


class Creation(Owned, Base):
    __tablename__ = "control_creations"
    display_name: Mapped[str] = mapped_column(String)
    idea: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="queued")
    stage: Mapped[str] = mapped_column(String, default="queued")
    current_revision: Mapped[int] = mapped_column(Integer, default=0)
    job_sequence: Mapped[int] = mapped_column(Integer, default=0)
    event_sequence: Mapped[int] = mapped_column(Integer, default=0)
    active_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    latest_summary: Mapped[str | None] = mapped_column(String, nullable=True)
    source_revision: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
            ["control_portfolios.id", "control_portfolios.organization_id", "control_portfolios.environment_id"], ondelete="CASCADE"),
    )


class Job(Owned, Base):
    __tablename__ = "control_creation_jobs"
    creation_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    base_revision: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    source_revision: Mapped[str] = mapped_column(String)
    instruction_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    adapter_revision: Mapped[str | None] = mapped_column(String, nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cost_microusd: Mapped[int | None] = mapped_column(Integer, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        UniqueConstraint("creation_id", "sequence"), parent("control_creations", "creation_id"),
        ForeignKeyConstraint(["session_id"], ["control_sessions.id"]))


class Revision(Owned, Base):
    __tablename__ = "control_creation_revisions"
    creation_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSONB)
    material_hash: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("creation_id", "sequence"),
        UniqueConstraint("job_id"), parent("control_creations", "creation_id"), parent("control_creation_jobs", "job_id"))


class Artifact(Owned, Base):
    __tablename__ = "control_creation_artifacts"
    creation_id: Mapped[str] = mapped_column(String)
    revision_id: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    media_type: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    sha256: Mapped[str] = mapped_column(String)
    bytes: Mapped[int] = mapped_column(Integer)
    __table_args__ = (UniqueConstraint("creation_id", "revision", "kind"),
        parent("control_creations", "creation_id"), parent("control_creation_revisions", "revision_id"))


class Event(Owned, Base):
    __tablename__ = "control_creation_events"
    creation_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String)
    stage: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint("creation_id", "sequence"),
        parent("control_creations", "creation_id"), parent("control_creation_jobs", "job_id"))
