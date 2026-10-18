"""Immutable reviewed snapshot owned by the existing account and BusinessGrant."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned
from ..models import Base

TABLE = "control_business_source_bindings"
IDENTITY_KEYS = [*BINDING[1:], "business_id", "grant_id", "site_id", "canonical_host"]
EXACT_KEYS = ["id", *IDENTITY_KEYS, "fingerprint"]
CONFIG_KEYS = ["id", *BINDING[1:], "fingerprint"]
NATIVE_KEYS = ["id", *BINDING[1:], "business_id", "site_id", "fingerprint"]


class Binding(Owned, Base):
    __tablename__ = TABLE
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSONB)
    source_revision: Mapped[str] = mapped_column(String)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    request_id: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint(*BINDING),
        UniqueConstraint(*EXACT_KEYS, name="uq_business_source_binding_identity"),
        UniqueConstraint(*CONFIG_KEYS, name="uq_business_source_config_identity"),
        UniqueConstraint(*NATIVE_KEYS, name="uq_business_source_native_identity"),
        UniqueConstraint("user_id", "environment_id", "request_id", name="uq_business_source_request"),
        UniqueConstraint(*IDENTITY_KEYS[:4], "business_id", "sequence", name="uq_business_source_sequence"),
        ForeignKeyConstraint(["business_id", "site_id", "canonical_host"],
            ["businesses.id", "businesses.site_id", "businesses.canonical_host"], ondelete="RESTRICT"),
        ForeignKeyConstraint(["grant_id", "business_id", "organization_id", "portfolio_id", "environment_id"],
            ["control_business_grants." + key for key in
             ["id", "business_id", "organization_id", "portfolio_id", "environment_id"]], ondelete="RESTRICT"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"], ondelete="RESTRICT"),
    )
