from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base, new_id, utcnow


class ControlScope:
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    environment_id: Mapped[str] = mapped_column(String)


class User(ControlScope, Base):
    __tablename__ = "control_users"
    username: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    identity_issuer: Mapped[str] = mapped_column(String)
    identity_subject: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint("id", "environment_id"),
                      UniqueConstraint("username", "environment_id"),
                      UniqueConstraint("identity_issuer", "identity_subject", "environment_id"))


class Organization(ControlScope, Base):
    __tablename__ = "control_organizations"
    key: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    __table_args__ = (UniqueConstraint("id", "environment_id"), UniqueConstraint("key", "environment_id"))


class Membership(ControlScope, Base):
    __tablename__ = "control_memberships"
    user_id: Mapped[str] = mapped_column(String)
    organization_id: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", "environment_id"),
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="CASCADE"),
        ForeignKeyConstraint(["organization_id", "environment_id"],
                             ["control_organizations.id", "control_organizations.environment_id"], ondelete="CASCADE"),
    )


class Portfolio(ControlScope, Base):
    __tablename__ = "control_portfolios"
    organization_id: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    __table_args__ = (
        UniqueConstraint("id", "organization_id", "environment_id"),
        UniqueConstraint("organization_id", "environment_id"),
        ForeignKeyConstraint(["organization_id", "environment_id"],
                             ["control_organizations.id", "control_organizations.environment_id"], ondelete="CASCADE"),
    )


class BusinessGrant(ControlScope, Base):
    __tablename__ = "control_business_grants"
    portfolio_id: Mapped[str] = mapped_column(String)
    organization_id: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    stage: Mapped[str | None] = mapped_column(String, nullable=True)
    connection_status: Mapped[str] = mapped_column(String, default="registered")
    runtime_status: Mapped[str] = mapped_column(String, default="not_connected")
    last_verified_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_revision: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("business_id", "environment_id"),
        ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        ForeignKeyConstraint(["portfolio_id", "organization_id", "environment_id"],
                             ["control_portfolios.id", "control_portfolios.organization_id",
                              "control_portfolios.environment_id"], ondelete="CASCADE"),
    )


class Session(ControlScope, Base):
    __tablename__ = "control_sessions"
    user_id: Mapped[str] = mapped_column(String)
    token_hash: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        ForeignKeyConstraint(["user_id", "environment_id"], ["control_users.id", "control_users.environment_id"],
                             ondelete="CASCADE"),
    )


class LoginBucket(Base):
    __tablename__ = "control_login_buckets"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    environment_id: Mapped[str] = mapped_column(String, primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer)
