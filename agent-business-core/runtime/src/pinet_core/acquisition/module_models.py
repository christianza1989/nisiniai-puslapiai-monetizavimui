"""Trusted per-business module registration; runtime cannot grant itself permissions."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, ForeignKeyConstraint, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base


class ModuleBinding(Base):
    __tablename__ = "acquisition_modules"
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), primary_key=True)
    environment_id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(String)
    approved_by_user_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    adapter_id: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    permissions: Mapped[list] = mapped_column(JSONB)
    source_revision: Mapped[str] = mapped_column(String)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "environment_id"],
            ["control_business_grants.business_id", "control_business_grants.environment_id"],
        ),
        ForeignKeyConstraint(
            ["organization_id", "environment_id"],
            ["control_organizations.id", "control_organizations.environment_id"],
        ),
        ForeignKeyConstraint(
            ["approved_by_user_id", "environment_id"], ["control_users.id", "control_users.environment_id"]
        ),
    )
