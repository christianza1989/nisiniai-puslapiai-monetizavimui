"""Scoped discovery history; old creations are archived through an append-only record."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned, parent
from ..models import Base, utcnow


class Discovery(Owned, Base):
    __tablename__ = "control_business_discoveries"
    title: Mapped[str] = mapped_column(String, default="Naujo verslo idėja")
    initial_message: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")
    current_revision: Mapped[int] = mapped_column(Integer, default=0)
    job_sequence: Mapped[int] = mapped_column(Integer, default=0)
    active_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    linked_creation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    source_revision: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
            ["control_portfolios.id", "control_portfolios.organization_id", "control_portfolios.environment_id"], ondelete="CASCADE"),
        parent("control_creations", "linked_creation_id"),
    )


class DiscoveryJob(Owned, Base):
    __tablename__ = "control_business_discovery_jobs"
    discovery_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    base_revision: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    instruction_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("discovery_id", "sequence"),
        UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        parent("control_business_discoveries", "discovery_id"),
        ForeignKeyConstraint(["session_id"], ["control_sessions.id"]),
    )


class Report(Owned, Base):
    __tablename__ = "control_business_discovery_reports"
    discovery_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSONB)
    material_hash: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        UniqueConstraint("discovery_id", "revision"), UniqueConstraint("job_id"),
        UniqueConstraint("id", "discovery_id", "revision", "material_hash", *BINDING[1:]),
        parent("control_business_discoveries", "discovery_id"),
        parent("control_business_discovery_jobs", "job_id"),
    )


class DiscoveryAttempt(Owned, Base):
    __tablename__ = "control_business_discovery_attempts"
    discovery_id: Mapped[str] = mapped_column(String)
    job_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String)
    round_number: Mapped[int] = mapped_column(Integer)
    run_id: Mapped[str] = mapped_column(String)
    instruction_hash: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("job_id", "sequence"),
        parent("control_business_discoveries", "discovery_id"),
        parent("control_business_discovery_jobs", "job_id"),
    )


class BuildApproval(Owned, Base):
    __tablename__ = "control_business_build_approvals"
    discovery_id: Mapped[str] = mapped_column(String)
    report_id: Mapped[str] = mapped_column(String)
    report_revision: Mapped[int] = mapped_column(Integer)
    report_sha256: Mapped[str] = mapped_column(String)
    creation_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("discovery_id"), UniqueConstraint("creation_id"),
        UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        parent("control_business_discoveries", "discovery_id"), parent("control_creations", "creation_id"),
        ForeignKeyConstraint(["report_id", "discovery_id", "report_revision", "report_sha256", *BINDING[1:]],
            ["control_business_discovery_reports." + key for key in
             ("id", "discovery_id", "revision", "material_hash", *BINDING[1:])]),
        ForeignKeyConstraint(["session_id"], ["control_sessions.id"]),
    )


class CreationArchive(Owned, Base):
    __tablename__ = "control_creation_archives"
    creation_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("creation_id"),
        UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        parent("control_creations", "creation_id"),
        ForeignKeyConstraint(["session_id"], ["control_sessions.id"]),
    )
