from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..control.models import ControlScope
from ..models import Base, utcnow


class Account(ControlScope, Base):
    __tablename__ = "control_customer_accounts"
    user_id: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    email_hash: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    privacy_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("user_id", "environment_id"), UniqueConstraint("email_hash", "environment_id"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="CASCADE"),
    )


class ActionToken(ControlScope, Base):
    __tablename__ = "control_customer_tokens"
    user_id: Mapped[str] = mapped_column(String)
    purpose: Mapped[str] = mapped_column(String)
    token_hash: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="CASCADE"),
    )


class Intake(ControlScope, Base):
    __tablename__ = "control_customer_intakes"
    user_id: Mapped[str] = mapped_column(String)
    organization_id: Mapped[str] = mapped_column(String)
    portfolio_id: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    canonical_host: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String)
    idempotency_key: Mapped[str] = mapped_column(String)
    fingerprint: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    business_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decision_note: Mapped[str | None] = mapped_column(String, nullable=True)
    private_review_evidence: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (
        UniqueConstraint("user_id", "environment_id", "idempotency_key"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="CASCADE"),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
                             ["control_portfolios.id", "control_portfolios.organization_id",
                              "control_portfolios.environment_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["business_id"], ["businesses.id"]),
    )
