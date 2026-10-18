"""Only the three explicit model-preparation records; common Task/Run own work."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from .model_schema import TABLE_ATTEMPT, TABLE_AUTH, TABLE_TASK


class _Scope:
    business_id: Mapped[str] = mapped_column(String)
    organization_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str] = mapped_column(String)
    environment_id: Mapped[str] = mapped_column(String)


class ModelAuthorization(_Scope, Base):
    __tablename__ = TABLE_AUTH
    id: Mapped[str] = mapped_column(String, primary_key=True)
    portfolio_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    adapter_id: Mapped[str] = mapped_column(String)
    creation_id: Mapped[str] = mapped_column(String, ForeignKey("control_creations.id", ondelete="RESTRICT"))
    registration_id: Mapped[str] = mapped_column(String, ForeignKey("control_creation_registrations.id", ondelete="RESTRICT"))
    registration_fingerprint: Mapped[str] = mapped_column(String)
    agent_id: Mapped[str] = mapped_column(String, ForeignKey("control_customer_agent_modules.id", ondelete="RESTRICT"))
    config_id: Mapped[str] = mapped_column(String, ForeignKey("control_customer_agent_configs.id", ondelete="RESTRICT"))
    config_revision: Mapped[int] = mapped_column(Integer)
    config_sha256: Mapped[str] = mapped_column(String)
    purpose: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    module_snapshot: Mapped[dict] = mapped_column(JSONB)
    module_fingerprint: Mapped[str] = mapped_column(String)
    work_registration_sha256: Mapped[str] = mapped_column(String)
    maximum_attempts: Mapped[int] = mapped_column(Integer)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    enabled: Mapped[bool] = mapped_column(Boolean)
    model: Mapped[str] = mapped_column(String)
    effort: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint("id", "business_id", "organization_id", "user_id", "environment_id"),
        ForeignKeyConstraint(["business_id", "environment_id"],
            ["control_business_grants.business_id", "control_business_grants.environment_id"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
            ["control_portfolios.id", "control_portfolios.organization_id", "control_portfolios.environment_id"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"], ondelete="RESTRICT"),
    )


class ModelTaskBinding(_Scope, Base):
    __tablename__ = TABLE_TASK
    task_id: Mapped[str] = mapped_column(String, primary_key=True)
    authorization_id: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)
    input: Mapped[dict] = mapped_column(JSONB)
    input_sha256: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("clock_timestamp()"))
    __table_args__ = (
        UniqueConstraint("task_id", "authorization_id", "business_id", "organization_id", "user_id", "environment_id"),
        ForeignKeyConstraint(["task_id", "business_id", "organization_id", "user_id", "environment_id", "kind"],
            ["control_tasks."+key for key in ("id", "business_id", "organization_id", "user_id", "environment_id", "kind")], ondelete="RESTRICT"),
        ForeignKeyConstraint(["authorization_id", "business_id", "organization_id", "user_id", "environment_id"],
            [TABLE_AUTH+"."+key for key in ("id", "business_id", "organization_id", "user_id", "environment_id")], ondelete="RESTRICT"),
    )


class ModelAttempt(_Scope, Base):
    __tablename__ = TABLE_ATTEMPT
    id: Mapped[str] = mapped_column(String, primary_key=True)
    authorization_id: Mapped[str] = mapped_column(String)
    task_id: Mapped[str] = mapped_column(String)
    run_id: Mapped[str] = mapped_column(String)
    ordinal: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String)
    packet: Mapped[dict] = mapped_column(JSONB)
    packet_sha256: Mapped[str] = mapped_column(String)
    instruction_sha256: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    effort: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("clock_timestamp()"))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    output: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("task_id", "ordinal"),
        ForeignKeyConstraint(["task_id", "authorization_id", "business_id", "organization_id", "user_id", "environment_id"],
            [TABLE_TASK+"."+key for key in ("task_id", "authorization_id", "business_id", "organization_id", "user_id", "environment_id")], ondelete="RESTRICT"),
        ForeignKeyConstraint(["run_id", "task_id", "business_id", "organization_id", "user_id", "environment_id"],
            ["control_task_runs."+key for key in ("id", "task_id", "business_id", "organization_id", "user_id", "environment_id")], ondelete="RESTRICT"),
    )
