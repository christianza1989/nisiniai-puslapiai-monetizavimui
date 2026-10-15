from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned
from ..models import Base

OWNER = BINDING[1:]


def parent(table, key, *, provenance=False):
    return ForeignKeyConstraint([key, *OWNER], [f"{table}.{c}" for c in BINDING],
                                ondelete="RESTRICT" if provenance else "CASCADE")


class Topic(Owned, Base):
    __tablename__ = "control_workspace_topics"
    anchor_kind: Mapped[str] = mapped_column(String)
    discovery_id: Mapped[str | None] = mapped_column(String, nullable=True)
    creation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    grant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    pinned: Mapped[bool] = mapped_column(Boolean)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_revision: Mapped[int] = mapped_column(Integer)
    message_sequence: Mapped[int] = mapped_column(Integer)
    created_source_revision: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint(*BINDING),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="RESTRICT"),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
            ["control_portfolios.id", "control_portfolios.organization_id", "control_portfolios.environment_id"],
            ondelete="RESTRICT"),
        parent("control_business_discoveries", "discovery_id", provenance=True),
        parent("control_creations", "creation_id", provenance=True),
        ForeignKeyConstraint(["grant_id", "business_id", "organization_id", "portfolio_id", "environment_id"],
            [f"control_business_grants.{c}" for c in ["id", "business_id", "organization_id", "portfolio_id", "environment_id"]],
            ondelete="RESTRICT"),
    )


class Receipt(Owned, Base):
    __tablename__ = "control_workspace_topic_receipts"
    topic_id: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    operation: Mapped[str] = mapped_column(String)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    accepted_source_revision: Mapped[str] = mapped_column(String)
    accepted_metadata: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        UniqueConstraint("user_id", "environment_id", "idempotency_key", name="uq_workspace_request_key"),
        UniqueConstraint("id", "message_id", "topic_id", *OWNER, name="uq_workspace_receipt_pair"),
        parent("control_workspace_topics", "topic_id"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="RESTRICT", name="fk_workspace_receipt_session"),
        ForeignKeyConstraint(["id", "message_id", "topic_id", *OWNER],
            [f"control_workspace_topic_messages.{c}" for c in ["receipt_id", "id", "topic_id", *OWNER]],
            deferrable=True, initially="DEFERRED", use_alter=True, name="fk_workspace_receipt_message_pair"),
    )


class Message(Owned, Base):
    __tablename__ = "control_workspace_topic_messages"
    topic_id: Mapped[str] = mapped_column(String)
    receipt_id: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    author_user_id: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    content_sha256: Mapped[str] = mapped_column(String)
    stored_source_revision: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        UniqueConstraint("topic_id", "sequence"),
        UniqueConstraint("receipt_id", name="uq_workspace_message_receipt"),
        UniqueConstraint("receipt_id", "id", "topic_id", *OWNER, name="uq_workspace_message_pair"),
        parent("control_workspace_topics", "topic_id"),
        ForeignKeyConstraint(["receipt_id", "id", "topic_id", *OWNER],
            [f"control_workspace_topic_receipts.{c}" for c in ["id", "message_id", "topic_id", *OWNER]],
            deferrable=True, initially="DEFERRED", use_alter=True, name="fk_workspace_message_receipt_pair"),
    )
