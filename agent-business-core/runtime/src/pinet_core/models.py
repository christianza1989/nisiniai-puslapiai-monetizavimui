from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import BigInteger, DateTime, ForeignKeyConstraint, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow():
    return datetime.now(UTC)


def new_id():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    site_id: Mapped[str] = mapped_column(String, unique=True)
    canonical_host: Mapped[str] = mapped_column(String, unique=True)
    __table_args__ = (UniqueConstraint("id", "site_id", "canonical_host",
                                      name="uq_registration_business_identity"),)


class Scoped:
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(String, index=True)
    environment_id: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)

    @classmethod
    def scope_key(cls):
        return UniqueConstraint("id", "business_id", "environment_id")


class Case(Scoped, Base):
    __tablename__ = "cases"
    __table_args__ = (Scoped.scope_key(),)


class MailMessage(Scoped, Base):
    __tablename__ = "mail_messages"
    case_id: Mapped[str] = mapped_column(String, index=True)
    message_id: Mapped[str] = mapped_column(String)
    direction: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint("business_id", "environment_id", "message_id"),
        ForeignKeyConstraint(["case_id", "business_id", "environment_id"],
                             ["cases.id", "cases.business_id", "cases.environment_id"], ondelete="CASCADE"),
    )


class SourceCheckpoint(Scoped, Base):
    __tablename__ = "source_checkpoints"
    source_system: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint("business_id", "environment_id", "source_system"),)


class BusinessPolicy(Scoped, Base):
    __tablename__ = "business_policies"
    revision: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (UniqueConstraint("business_id", "environment_id"),)


class PolicyRevision(Scoped, Base):
    __tablename__ = "policy_revisions"
    revision: Mapped[int] = mapped_column(Integer)
    __table_args__ = (UniqueConstraint("business_id", "environment_id", "revision"),)


class Visitor(Scoped, Base):
    __tablename__ = "visitors"
    token_hash: Mapped[str] = mapped_column(String, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Scoped.scope_key(),)


class KnowledgeState(Scoped, Base):
    __tablename__ = "knowledge_states"
    revision: Mapped[int] = mapped_column(Integer, default=1)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("business_id", "environment_id"),)


class CaseSource(Scoped, Base):
    __tablename__ = "case_sources"
    source_system: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    source_record_id: Mapped[str] = mapped_column(String)
    case_id: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint("environment_id", "source_system", "site_id", "source_record_id"),
        ForeignKeyConstraint(["case_id", "business_id", "environment_id"],
                             ["cases.id", "cases.business_id", "cases.environment_id"], ondelete="CASCADE"),
    )


class Conversation(Scoped, Base):
    __tablename__ = "conversations"
    case_id: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String, default="created")
    token_hash: Mapped[str] = mapped_column(String)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    epoch: Mapped[int] = mapped_column(Integer, default=0)
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    need_revision: Mapped[int] = mapped_column(Integer, default=0)
    visitor_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    __table_args__ = (
        Scoped.scope_key(),
        ForeignKeyConstraint(["case_id", "business_id", "environment_id"],
                             ["cases.id", "cases.business_id", "cases.environment_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["visitor_id", "business_id", "environment_id"],
                             ["visitors.id", "visitors.business_id", "visitors.environment_id"]),
    )


class ConversationChild(Scoped):
    conversation_id: Mapped[str] = mapped_column(String, index=True)

    @classmethod
    def conversation_fk(cls):
        return ForeignKeyConstraint(
            ["conversation_id", "business_id", "environment_id"],
            ["conversations.id", "conversations.business_id", "conversations.environment_id"],
            ondelete="CASCADE",
        )


class Event(ConversationChild, Base):
    __tablename__ = "conversation_events"
    event_key: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    __table_args__ = (ConversationChild.conversation_fk(),
                     UniqueConstraint("conversation_id", "event_key"),
                     UniqueConstraint("conversation_id", "sequence"))


class Contact(ConversationChild, Base):
    __tablename__ = "contacts"
    channel: Mapped[str] = mapped_column(String)
    value: Mapped[str] = mapped_column(String)
    __table_args__ = (ConversationChild.conversation_fk(),
                     UniqueConstraint("conversation_id", "channel"))


class Artifact(ConversationChild, Base):
    __tablename__ = "artifacts"
    kind: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (ConversationChild.conversation_fk(),
                     UniqueConstraint("conversation_id", "kind", "revision"))


class Job(ConversationChild, Base):
    __tablename__ = "jobs"
    kind: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String, default="queued")
    generation: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    run_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (ConversationChild.conversation_fk(),
                     UniqueConstraint("conversation_id", "kind"),
                     Index("jobs_ready", "state", "run_after"))


class Outbox(ConversationChild, Base):
    __tablename__ = "outbox"
    kind: Mapped[str] = mapped_column(String)
    action_key: Mapped[str] = mapped_column(String, unique=True)
    state: Mapped[str] = mapped_column(String, default="prepared")
    __table_args__ = (ConversationChild.conversation_fk(),)


class EdgeNonce(Base):
    __tablename__ = "edge_nonces"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Admission(Base):
    """Global scheduler metadata only: no contact, text or client identity."""
    __tablename__ = "admissions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    business_id: Mapped[str] = mapped_column(String, index=True)
    environment_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reserved_seconds: Mapped[int] = mapped_column(Integer)


class CostReservation(Base):
    """Central scheduler cost metadata only. No contact, transcript or model text."""
    __tablename__ = "cost_reservations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(String, index=True)
    environment_id: Mapped[str] = mapped_column(String, index=True)
    action_key: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reserved_microusd: Mapped[int] = mapped_column(BigInteger)
    observed_microusd: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


TENANT_TABLES = [t.name for t in Base.metadata.sorted_tables if "business_id" in t.c]
TENANT_TABLES.remove("admissions")
TENANT_TABLES.remove("cost_reservations")
