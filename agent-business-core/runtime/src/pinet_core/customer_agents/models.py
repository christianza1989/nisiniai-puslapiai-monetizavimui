from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..business_attachment.models import Binding as BusinessSourceBinding
from ..creation.models import BINDING, Owned, parent
from ..customer_profile.models import REGISTRATION_KEYS
from ..models import Base, utcnow


class Agent(Owned, Base):
    __tablename__ = "control_customer_agent_modules"
    creation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    registration_id: Mapped[str | None] = mapped_column(String, nullable=True)
    external_binding_id: Mapped[str | None] = mapped_column(String, nullable=True)
    registration_fingerprint: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str] = mapped_column(String)
    accepted_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    candidate_sha256: Mapped[str | None] = mapped_column(String, nullable=True)
    accepted_source_revision: Mapped[str | None] = mapped_column(String, nullable=True)
    purpose: Mapped[str] = mapped_column(String)
    current_revision: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        ForeignKeyConstraint(["registration_id", *REGISTRATION_KEYS, "registration_fingerprint"],
            ["control_creation_registrations." + c for c in ["id", *REGISTRATION_KEYS, "fingerprint"]],
            ondelete="CASCADE"),
        ForeignKeyConstraint(["external_binding_id", *BINDING[1:], "business_id", "grant_id", "site_id",
                "canonical_host", "registration_fingerprint"],
            [BusinessSourceBinding.__tablename__ + "." + c for c in ["id", *BINDING[1:], "business_id", "grant_id",
                "site_id", "canonical_host", "fingerprint"]],
            ondelete="RESTRICT", name="fk_customer_agent_external_binding"),
        ForeignKeyConstraint(["id", *BINDING[1:], "current_revision"],
            ["control_customer_agent_configs." + c for c in ["agent_id", *BINDING[1:], "revision"]],
            deferrable=True, initially="DEFERRED", use_alter=True, name="fk_customer_agent_current_config"),
    )


class Config(Owned, Base):
    __tablename__ = "control_customer_agent_configs"
    agent_id: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSONB)
    config_sha256: Mapped[str] = mapped_column(String)
    saved_source_revision: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    import_provenance: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True), nullable=True)
    external_binding_id: Mapped[str | None] = mapped_column(String, nullable=True)
    external_binding_fingerprint: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (
        UniqueConstraint("agent_id", *BINDING[1:], "revision"),
        UniqueConstraint("user_id", "environment_id", "idempotency_key", name="uq_customer_agent_request_key"),
        parent("control_customer_agent_modules", "agent_id"),
        ForeignKeyConstraint(["external_binding_id", *BINDING[1:], "external_binding_fingerprint"],
            [BusinessSourceBinding.__tablename__ + "." + c for c in ["id", *BINDING[1:], "fingerprint"]],
            ondelete="RESTRICT", name="fk_customer_agent_config_external_source"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="RESTRICT", name="fk_customer_agent_authorizing_session"),
    )
