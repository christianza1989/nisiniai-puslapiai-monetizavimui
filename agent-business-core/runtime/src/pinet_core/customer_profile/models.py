from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import Owned
from ..models import Base

REGISTRATION_KEYS = ["creation_id", "user_id", "organization_id", "portfolio_id", "environment_id",
    "business_id", "grant_id", "site_id", "canonical_host", "accepted_revision", "candidate_sha256",
    "accepted_source_revision"]


class Admission(Owned, Base):
    __tablename__ = "control_customer_profile_admissions"
    registration_id: Mapped[str] = mapped_column(String)
    registration_fingerprint: Mapped[str] = mapped_column(String)
    creation_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str] = mapped_column(String)
    accepted_revision: Mapped[int] = mapped_column(Integer)
    candidate_sha256: Mapped[str] = mapped_column(String)
    accepted_source_revision: Mapped[str] = mapped_column(String)
    execution_source_revision: Mapped[str] = mapped_column(String)
    knowledge_revision: Mapped[int] = mapped_column(Integer)
    knowledge_hash: Mapped[str] = mapped_column(String)
    deployment_id: Mapped[str] = mapped_column(String)
    index_receipt_sha256: Mapped[str] = mapped_column(String)
    profile_version: Mapped[str] = mapped_column(String)
    conversation_sha256: Mapped[str] = mapped_column(String)
    quality_sha256: Mapped[str] = mapped_column(String)
    sequence: Mapped[int] = mapped_column(Integer)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("creation_id", "environment_id", "sequence"),
        UniqueConstraint("creation_id", "environment_id", "fingerprint"),
        ForeignKeyConstraint(["registration_id", *REGISTRATION_KEYS, "registration_fingerprint"],
            ["control_creation_registrations." + c for c in ["id", *REGISTRATION_KEYS, "fingerprint"]],
            ondelete="CASCADE", name="fk_profile_exact_registration"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="CASCADE", name="fk_profile_authorizing_session"),
    )
