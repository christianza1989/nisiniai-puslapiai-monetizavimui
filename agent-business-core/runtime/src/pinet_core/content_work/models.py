from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned, parent
from ..models import Base


class GuideJob(Owned, Base):
    __tablename__ = "control_content_work_jobs"
    creation_id: Mapped[str] = mapped_column(String)
    revision_id: Mapped[str] = mapped_column(String)
    accepted_revision: Mapped[int] = mapped_column(Integer)
    source_hash: Mapped[str] = mapped_column(String)
    page_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    binding: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    event_sequence: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        UniqueConstraint(*BINDING, "creation_id"),
        UniqueConstraint("creation_id", "sequence"), parent("control_creations", "creation_id"),
        parent("control_creation_revisions", "revision_id"),
        ForeignKeyConstraint(["revision_id", "creation_id", "accepted_revision", "source_hash", *BINDING[1:]],
            ["control_creation_revisions." + key for key in
                ("id", "creation_id", "sequence", "material_hash", *BINDING[1:])], ondelete="CASCADE"),
        ForeignKeyConstraint(["session_id"], ["control_sessions.id"]))


class GuideAttempt(Owned, Base):
    __tablename__ = "control_content_work_attempts"
    creation_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    run_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String)
    round_number: Mapped[int] = mapped_column(Integer)
    stage: Mapped[str] = mapped_column(String, default="content")
    source_revision: Mapped[str] = mapped_column(String)
    instruction_hash: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String, default="gpt-6-luna")
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("job_id", "sequence"),
        UniqueConstraint(*BINDING, "creation_id", "job_id"),
        ForeignKeyConstraint(["job_id", "creation_id", *BINDING[1:]],
            ["control_content_work_jobs." + key for key in ("id", "creation_id", *BINDING[1:])], ondelete="CASCADE"),
        parent("control_creations", "creation_id"), parent("control_content_work_jobs", "job_id"))


class GuideEvent(Owned, Base):
    __tablename__ = "control_content_work_events"
    creation_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    attempt_id: Mapped[str | None] = mapped_column(String, nullable=True)
    sequence: Mapped[int] = mapped_column(Integer)
    state: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(String)
    payload: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (UniqueConstraint("job_id", "sequence"), UniqueConstraint("attempt_id", "state"),
        ForeignKeyConstraint(["job_id", "creation_id", *BINDING[1:]],
            ["control_content_work_jobs." + key for key in ("id", "creation_id", *BINDING[1:])], ondelete="CASCADE"),
        ForeignKeyConstraint(["attempt_id", "creation_id", "job_id", *BINDING[1:]],
            ["control_content_work_attempts." + key for key in ("id", "creation_id", "job_id", *BINDING[1:])], ondelete="CASCADE"),
        parent("control_creations", "creation_id"), parent("control_content_work_jobs", "job_id"),
        parent("control_content_work_attempts", "attempt_id"))
