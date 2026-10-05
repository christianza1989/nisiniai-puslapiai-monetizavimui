from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base, Scoped


class FacebookRecord(Scoped, Base):
    __tablename__ = "facebook_records"
    kind: Mapped[str] = mapped_column(String)
    record_key: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    case_id: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (
        Scoped.scope_key(),
        UniqueConstraint("business_id", "environment_id", "kind", "record_key"),
        ForeignKeyConstraint(["case_id", "business_id", "environment_id"],
                             ["cases.id", "cases.business_id", "cases.environment_id"], ondelete="CASCADE"),
    )


class FacebookAccountLease(Base):
    """Environment-level coordination metadata only; no customer text or credentials."""

    __tablename__ = "facebook_account_leases"
    environment_id: Mapped[str] = mapped_column(String, primary_key=True)
    account_key: Mapped[str] = mapped_column(String, primary_key=True)
    epoch: Mapped[int] = mapped_column(Integer, default=0)
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
