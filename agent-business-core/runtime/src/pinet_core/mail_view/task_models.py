"""Only policy/job metadata; common TaskRun is the sole display attempt."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from .task_schema import TABLE_JOB, TABLE_POLICY


class Scope:
    business_id: Mapped[str]=mapped_column(String)
    organization_id: Mapped[str]=mapped_column(String)
    user_id: Mapped[str]=mapped_column(String)
    environment_id: Mapped[str]=mapped_column(String)


class DisplayPolicy(Scope,Base):
    __tablename__=TABLE_POLICY
    id: Mapped[str]=mapped_column(String,primary_key=True)
    portfolio_id: Mapped[str]=mapped_column(String)
    grant_id: Mapped[str]=mapped_column(String)
    session_id: Mapped[str]=mapped_column(String)
    source_revision: Mapped[str]=mapped_column(String)
    instruction_sha256: Mapped[str]=mapped_column(String)
    target_language: Mapped[str]=mapped_column(String)
    model: Mapped[str]=mapped_column(String)
    effort: Mapped[str]=mapped_column(String)
    maximum_calls: Mapped[int]=mapped_column(Integer)
    mail_created_after: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    enabled: Mapped[bool]=mapped_column(Boolean)
    fingerprint: Mapped[str]=mapped_column(String)
    __table_args__=(UniqueConstraint("id","business_id","organization_id","user_id","environment_id"),
        ForeignKeyConstraint(["grant_id","business_id","organization_id","portfolio_id","environment_id"],
            ["control_business_grants."+key for key in ("id","business_id","organization_id","portfolio_id","environment_id")],ondelete="RESTRICT"),
        ForeignKeyConstraint(["session_id","user_id","environment_id"],
            ["control_sessions.id","control_sessions.user_id","control_sessions.environment_id"],ondelete="RESTRICT"))


class DisplayJob(Scope,Base):
    __tablename__=TABLE_JOB
    task_id: Mapped[str]=mapped_column(String,primary_key=True)
    policy_id: Mapped[str]=mapped_column(String)
    kind: Mapped[str]=mapped_column(String)
    mail_id: Mapped[str]=mapped_column(String)
    case_id: Mapped[str]=mapped_column(String)
    source_sha256: Mapped[str]=mapped_column(String)
    instruction_sha256: Mapped[str]=mapped_column(String)
    target_language: Mapped[str]=mapped_column(String)
    run_id: Mapped[str | None]=mapped_column(String,nullable=True)
    reserved_at: Mapped[datetime | None]=mapped_column(DateTime(timezone=True),nullable=True)
    record: Mapped[dict | None]=mapped_column(JSONB(none_as_null=True),nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=text("clock_timestamp()"))
    __table_args__=(UniqueConstraint("business_id","environment_id","mail_id","source_sha256","instruction_sha256","target_language",name="uq_mail_display_source"),
        ForeignKeyConstraint(["task_id","business_id","organization_id","user_id","environment_id","kind"],
            ["control_tasks."+key for key in ("id","business_id","organization_id","user_id","environment_id","kind")],ondelete="RESTRICT"),
        ForeignKeyConstraint(["policy_id","business_id","organization_id","user_id","environment_id"],
            [TABLE_POLICY+"."+key for key in ("id","business_id","organization_id","user_id","environment_id")],ondelete="RESTRICT"),
        ForeignKeyConstraint(["mail_id","business_id","environment_id"],["mail_messages.id","mail_messages.business_id","mail_messages.environment_id"],ondelete="RESTRICT"),
        ForeignKeyConstraint(["case_id","business_id","environment_id"],["cases.id","cases.business_id","cases.environment_id"],ondelete="RESTRICT"),
        ForeignKeyConstraint(["run_id","task_id","business_id","organization_id","user_id","environment_id"],
            ["control_task_runs."+key for key in ("id","task_id","business_id","organization_id","user_id","environment_id")],ondelete="RESTRICT"))
