from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned
from ..models import Base

OWNER = BINDING[1:]


def parent(table, key, *, provenance=False):
    return ForeignKeyConstraint([key, *OWNER], [f"{table}.{c}" for c in BINDING],
                                ondelete="RESTRICT" if provenance else "CASCADE")


class TeamThread(Owned, Base):
    __tablename__ = "control_workspace_team_threads"
    topic_id: Mapped[str] = mapped_column(String)
    task_thread_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    grant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_sequence: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("topic_id"), UniqueConstraint("task_thread_id"), UniqueConstraint("id", "topic_id", "task_thread_id", "business_id", *OWNER),
        parent("control_workspace_topics", "topic_id"),
        ForeignKeyConstraint(["task_thread_id", "business_id", "organization_id", "user_id", "environment_id"],
            [f"control_task_threads.{c}" for c in ["id", "business_id", "organization_id", "user_id", "environment_id"]],
            ondelete="RESTRICT"),
        ForeignKeyConstraint(["grant_id", "business_id", "organization_id", "portfolio_id", "environment_id"],
            [f"control_business_grants.{c}" for c in ["id", "business_id", "organization_id", "portfolio_id", "environment_id"]],
            ondelete="RESTRICT"))


class Member(Owned, Base):
    __tablename__ = "control_workspace_team_members"
    team_thread_id: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    capability_id: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("team_thread_id", "role"),
        UniqueConstraint("id", "team_thread_id", "role", *OWNER), parent(TeamThread.__tablename__, "team_thread_id"))


class TeamTurn(Owned, Base):
    __tablename__ = "control_workspace_team_turns"
    team_thread_id: Mapped[str] = mapped_column(String)
    topic_id: Mapped[str] = mapped_column(String)
    task_thread_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    task_kind: Mapped[str] = mapped_column(String, default="workspace.team_turn")
    owner_event_id: Mapped[str] = mapped_column(String)
    agent_creation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    agent_purpose: Mapped[str | None] = mapped_column(String, nullable=True)
    context: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    context_sha256: Mapped[str | None] = mapped_column(String, nullable=True)
    context_cutoff: Mapped[int | None] = mapped_column(Integer, nullable=True)
    roster_sha256: Mapped[str] = mapped_column(String)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("id", "team_thread_id", *OWNER),
        ForeignKeyConstraint(["agent_creation_id", *OWNER],
            [f"control_creations.{c}" for c in ["id", *OWNER]],
            ondelete="RESTRICT", name="fk_workspace_agent_intent_creation"),
        ForeignKeyConstraint(["team_thread_id", "topic_id", "task_thread_id", "business_id", *OWNER],
            [f"{TeamThread.__tablename__}.{c}" for c in ["id", "topic_id", "task_thread_id", "business_id", *OWNER]], ondelete="CASCADE"),
        parent("control_workspace_topics", "topic_id"),
        ForeignKeyConstraint(["id", "task_thread_id", "business_id", "organization_id", "user_id", "environment_id", "task_kind"],
            [f"control_tasks.{c}" for c in ["id", "thread_id", "business_id", "organization_id", "user_id", "environment_id", "kind"]],
            ondelete="RESTRICT"),
        ForeignKeyConstraint(["owner_event_id", "id", "team_thread_id", *OWNER],
            [f"control_workspace_team_events.{c}" for c in ["id", "task_id", "team_thread_id", *OWNER]],
            deferrable=True, initially="DEFERRED", use_alter=True, name="fk_workspace_team_owner_event"))


class Attempt(Owned, Base):
    __tablename__ = "control_workspace_team_attempts"
    task_id: Mapped[str] = mapped_column(String)
    team_thread_id: Mapped[str] = mapped_column(String)
    run_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    ordinal: Mapped[int] = mapped_column(Integer)
    phase: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String, default="reserved")
    context_sha256: Mapped[str] = mapped_column(String)
    context: Mapped[dict] = mapped_column(JSONB)
    instruction_sha256: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    effort: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("task_id", "ordinal"), UniqueConstraint("id", "task_id", "team_thread_id", *OWNER),
        ForeignKeyConstraint(["task_id", "team_thread_id", *OWNER],
            [f"{TeamTurn.__tablename__}.{c}" for c in ["id", "team_thread_id", *OWNER]], ondelete="CASCADE"),
        ForeignKeyConstraint(["run_id", "task_id", "business_id", "organization_id", "user_id", "environment_id"],
            [f"control_task_runs.{c}" for c in ["id", "task_id", "business_id", "organization_id", "user_id", "environment_id"]],
            ondelete="RESTRICT"))


class TeamEvent(Owned, Base):
    __tablename__ = "control_workspace_team_events"
    task_id: Mapped[str] = mapped_column(String)
    team_thread_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    author_type: Mapped[str] = mapped_column(String)
    author_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    participant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    attempt_id: Mapped[str | None] = mapped_column(String, nullable=True)
    native_episode_task_id: Mapped[str | None] = mapped_column(String, nullable=True)
    native_workflow_intent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    kind: Mapped[str] = mapped_column(String)
    reply_to_event_id: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(String)
    content_sha256: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("team_thread_id", "sequence"),
        ForeignKeyConstraint(["native_workflow_intent_id", *OWNER],
            [f"control_workspace_agent_workflows.{c}" for c in BINDING], ondelete="RESTRICT",
            name="fk_workspace_workflow_origin"),
        ForeignKeyConstraint(["native_episode_task_id"], ["control_tasks.id"], ondelete="RESTRICT",
            name="fk_workspace_native_episode_task"),
        UniqueConstraint("attempt_id"),
        UniqueConstraint("id", "task_id", "team_thread_id", *OWNER), UniqueConstraint("id", "team_thread_id", *OWNER),
        ForeignKeyConstraint(["task_id", "team_thread_id", *OWNER],
            [f"{TeamTurn.__tablename__}.{c}" for c in ["id", "team_thread_id", *OWNER]],
            deferrable=True, initially="DEFERRED", ondelete="CASCADE", name="fk_workspace_team_event_turn"),
        ForeignKeyConstraint(["participant_id", "team_thread_id", "author_type", *OWNER],
            [f"{Member.__tablename__}.{c}" for c in ["id", "team_thread_id", "role", *OWNER]], ondelete="NO ACTION", deferrable=True, initially="DEFERRED"),
        ForeignKeyConstraint(["attempt_id", "task_id", "team_thread_id", *OWNER],
            [f"{Attempt.__tablename__}.{c}" for c in ["id", "task_id", "team_thread_id", *OWNER]], ondelete="NO ACTION", deferrable=True, initially="DEFERRED"),
        ForeignKeyConstraint(["reply_to_event_id", "team_thread_id", *OWNER],
            [f"control_workspace_team_events.{c}" for c in ["id", "team_thread_id", *OWNER]],
            ondelete="NO ACTION", deferrable=True, initially="DEFERRED", name="fk_workspace_team_reply"))


class DirectChat(Owned, Base):
    """Append-only recipient/parent mapping; neither a grant nor an executor."""

    __tablename__ = "control_workspace_direct_chats"
    parent_topic_id: Mapped[str] = mapped_column(String)
    child_topic_id: Mapped[str] = mapped_column(String)
    team_thread_id: Mapped[str] = mapped_column(String)
    task_thread_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    grant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    mode: Mapped[str] = mapped_column(String)
    recipient: Mapped[dict] = mapped_column(JSONB)
    recipient_sha256: Mapped[str] = mapped_column(String)
    execution_scope: Mapped[dict] = mapped_column(JSONB)
    execution_sha256: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("child_topic_id"), UniqueConstraint("team_thread_id"),
        UniqueConstraint("task_thread_id"), UniqueConstraint("user_id", "environment_id", "idempotency_key", name="uq_direct_chat_request"),
        ForeignKeyConstraint(["parent_topic_id", *OWNER], [f"control_workspace_topics.{key}" for key in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["child_topic_id", *OWNER], [f"control_workspace_topics.{key}" for key in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["team_thread_id", *OWNER], [f"{TeamThread.__tablename__}.{key}" for key in BINDING],
            deferrable=True, initially="DEFERRED", ondelete="RESTRICT", name="fk_direct_team_scope"),
        ForeignKeyConstraint(["task_thread_id", "organization_id", "user_id", "environment_id"],
            [f"control_task_threads.{key}" for key in ("id", "organization_id", "user_id", "environment_id")],
            deferrable=True, initially="DEFERRED", ondelete="RESTRICT", name="fk_direct_task_scope"),
        ForeignKeyConstraint(["session_id", "user_id", "environment_id"],
            [f"control_sessions.{key}" for key in ("id", "user_id", "environment_id")], ondelete="RESTRICT"),
    )


class DirectPreview(Owned, Base):
    """Immutable actual native Conversation binding, separate from direct chat intent."""
    __tablename__ = "control_workspace_direct_previews"
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    conversation_id: Mapped[str] = mapped_column(String)
    snapshot: Mapped[dict] = mapped_column(JSONB)
    snapshot_sha256: Mapped[str] = mapped_column(String)
    native_scope: Mapped[dict] = mapped_column(JSONB)
    native_scope_sha256: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint(*BINDING), UniqueConstraint("conversation_id"),
        ForeignKeyConstraint(BINDING, [f"{DirectChat.__tablename__}.{key}" for key in BINDING], ondelete="RESTRICT"),
        ForeignKeyConstraint(["conversation_id", "business_id", "environment_id"],
            [f"conversations.{key}" for key in ("id", "business_id", "environment_id")], ondelete="RESTRICT"))
