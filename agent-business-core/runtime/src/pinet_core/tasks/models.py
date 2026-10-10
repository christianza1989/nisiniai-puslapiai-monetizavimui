from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..control.models import ControlScope
from ..models import Base, utcnow


class OwnedTaskScope(ControlScope):
    organization_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


BINDING = ["id", "business_id", "organization_id", "user_id", "environment_id"]


def parent_binding(parent, key):
    return ForeignKeyConstraint([key, *BINDING[1:]], [f"{parent}.{c}" for c in BINDING], ondelete="CASCADE")


class Thread(OwnedTaskScope, Base):
    __tablename__ = "control_task_threads"
    last_sequence: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        ForeignKeyConstraint(["business_id", "environment_id"],
                             ["control_business_grants.business_id", "control_business_grants.environment_id"]),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"]),
        ForeignKeyConstraint(["organization_id", "environment_id"],
                             ["control_organizations.id", "control_organizations.environment_id"]),
    )


class Task(OwnedTaskScope, Base):
    __tablename__ = "control_tasks"
    thread_id: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String, default="chat.consult")
    status: Mapped[str] = mapped_column(String, default="queued")
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    event_sequence: Mapped[int] = mapped_column(Integer, default=0)
    source_revision: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("user_id", "environment_id", "idempotency_key"),
                      UniqueConstraint("thread_id", "sequence"),
                      parent_binding("control_task_threads", "thread_id"),
                      ForeignKeyConstraint(["session_id"], ["control_sessions.id"]))


class TaskRun(OwnedTaskScope, Base):
    __tablename__ = "control_task_runs"
    task_id: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    effort: Mapped[str] = mapped_column(String)
    adapter_revision: Mapped[str] = mapped_column(String)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cost_microusd: Mapped[int | None] = mapped_column(Integer, nullable=True)
    __table_args__ = (parent_binding("control_tasks", "task_id"),)


class TaskEvent(OwnedTaskScope, Base):
    __tablename__ = "control_task_events"
    task_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (UniqueConstraint("task_id", "sequence"), parent_binding("control_tasks", "task_id"))
