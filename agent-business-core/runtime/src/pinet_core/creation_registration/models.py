from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import BINDING, Owned
from ..models import Base


class Registration(Owned, Base):
    __tablename__ = "control_creation_registrations"
    creation_id: Mapped[str] = mapped_column(String)
    revision_id: Mapped[str] = mapped_column(String)
    accepted_revision: Mapped[int] = mapped_column(Integer)
    candidate_sha256: Mapped[str] = mapped_column(String)
    accepted_source_revision: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    grant_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str] = mapped_column(String)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    coordinator_event_id: Mapped[str] = mapped_column(String)
    coordinator_sha256: Mapped[str] = mapped_column(String)
    intake_sha256: Mapped[str] = mapped_column(String)
    intake_request_sha256: Mapped[str] = mapped_column(String)
    intake_importer_sha256: Mapped[str] = mapped_column(String)
    intake_site_file_sha256: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("creation_id", "accepted_revision", "environment_id"),
        # Migration0017 provides the exact immutable identity referenced by profile history.
        UniqueConstraint("id", "creation_id", "user_id", "organization_id", "portfolio_id", "environment_id",
            "business_id", "grant_id", "site_id", "canonical_host", "accepted_revision", "candidate_sha256",
            "accepted_source_revision", "fingerprint", name="uq_profile_registration_identity"),
        ForeignKeyConstraint(["revision_id", "creation_id", "accepted_revision", "candidate_sha256",
            "accepted_source_revision", *BINDING[1:]], ["control_creation_revisions." + c for c in
            ["id", "creation_id", "sequence", "material_hash", "source_revision", *BINDING[1:]]],
            ondelete="CASCADE"),
        ForeignKeyConstraint(["business_id", "site_id", "canonical_host"],
            ["businesses.id", "businesses.site_id", "businesses.canonical_host"]),
        ForeignKeyConstraint(["grant_id", "business_id", "organization_id", "portfolio_id", "environment_id"],
            ["control_business_grants." + c for c in
             ["id", "business_id", "organization_id", "portfolio_id", "environment_id"]], ondelete="CASCADE"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="CASCADE"),
        ForeignKeyConstraint(["coordinator_event_id"], ["control_creation_team_events.id"], ondelete="CASCADE"),
    )
