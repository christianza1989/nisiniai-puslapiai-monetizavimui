"""Immutable operator proof of a newly checked, unchanged public projection."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..creation.models import Owned
from ..models import Base


class SourceRefresh(Owned, Base):
    __tablename__ = "control_customer_source_refreshes"
    admission_id: Mapped[str] = mapped_column(String)
    admission_fingerprint: Mapped[str] = mapped_column(String)
    authorizing_session_id: Mapped[str] = mapped_column(String)
    request_key: Mapped[str] = mapped_column(String)
    request_fingerprint: Mapped[str] = mapped_column(String)
    previous_refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    public_source_revision: Mapped[str] = mapped_column(String)
    package_sha256: Mapped[str] = mapped_column(String)
    generated_at: Mapped[str] = mapped_column(String)
    projection_receipt: Mapped[dict] = mapped_column(JSONB)
    fingerprint: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint("admission_id", "environment_id", "refreshed_at"),
        UniqueConstraint("user_id", "environment_id", "request_key"),
        ForeignKeyConstraint(
            ["admission_id", "user_id", "organization_id", "portfolio_id", "environment_id", "admission_fingerprint"],
            ["control_customer_profile_admissions." + k for k in
             ["id", "user_id", "organization_id", "portfolio_id", "environment_id", "fingerprint"]],
            ondelete="RESTRICT", name="fk_source_refresh_exact_profile"),
        ForeignKeyConstraint(["authorizing_session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"],
            ondelete="RESTRICT", name="fk_source_refresh_authorizing_session"),
    )
