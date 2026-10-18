"""Durable explicit intent; no payload in a terminal Task is used as a queue."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned
from ..models import Base

TABLE = "control_workspace_agent_workflows"


class AgentWorkflow(Owned, Base):
    __tablename__ = TABLE
    topic_id: Mapped[str] = mapped_column(String)
    team_thread_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    creation_id: Mapped[str] = mapped_column(String)
    purpose: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    parent_task_id: Mapped[str] = mapped_column(String)
    planned_child_task_id: Mapped[str] = mapped_column(String)
    child_key: Mapped[str] = mapped_column(String)
    origin_event_id: Mapped[str] = mapped_column(String)
    provisioning_request_id: Mapped[str] = mapped_column(String)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String, default="pending")
    agent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    config_revision_id: Mapped[str | None] = mapped_column(String, nullable=True)
    config_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    config_sha256: Mapped[str | None] = mapped_column(String, nullable=True)
    saved_event_id: Mapped[str | None] = mapped_column(String, nullable=True)
    child_task_id: Mapped[str | None] = mapped_column(String, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("parent_task_id"),
        UniqueConstraint("planned_child_task_id"), UniqueConstraint("child_key"), UniqueConstraint("origin_event_id"),
        UniqueConstraint("user_id", "environment_id", "idempotency_key", name="uq_workspace_workflow_request"),
        ForeignKeyConstraint(["parent_task_id", *BINDING[1:]],
            [f"control_workspace_team_turns.{c}" for c in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["child_task_id", *BINDING[1:]],
            [f"control_workspace_team_turns.{c}" for c in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["team_thread_id", *BINDING[1:]],
            [f"control_workspace_team_threads.{c}" for c in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["creation_id", *BINDING[1:]],
            [f"control_creations.{c}" for c in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["session_id", "user_id", "environment_id"],
            [f"control_sessions.{c}" for c in ("id", "user_id", "environment_id")], ondelete="RESTRICT"),
        ForeignKeyConstraint(["agent_id"], ["control_customer_agent_modules.id"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["config_revision_id"], ["control_customer_agent_configs.id"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["saved_event_id"], ["control_workspace_team_events.id"], ondelete="RESTRICT"))
