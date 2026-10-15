"""Module-owned binding/receipt records; mail text lives only in canonical core mail."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from .ledger_schema import KEY

KEY_FIELDS = KEY.split(",")


class WorkScope:
    business_id: Mapped[str] = mapped_column(String, primary_key=True)
    environment_id: Mapped[str] = mapped_column(String, primary_key=True)
    site_id: Mapped[str] = mapped_column(String, primary_key=True)
    environment_class: Mapped[str] = mapped_column(String, primary_key=True)
    adapter_id: Mapped[str] = mapped_column(String, primary_key=True)


def scope_fk(target, name):
    keys = [*KEY_FIELDS, name]
    return ForeignKeyConstraint(keys, [f"{target}.{key}" for key in keys])


class ContactPolicy(WorkScope, Base):
    __tablename__ = "acquisition_contact_policies"
    recipient_hash: Mapped[str] = mapped_column(String, primary_key=True)
    state: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String)
    resume_condition_quote: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CorrespondenceThread(WorkScope, Base):
    __tablename__ = "acquisition_correspondence_threads"
    thread_id: Mapped[str] = mapped_column(String, primary_key=True)
    case_id: Mapped[str] = mapped_column(String)
    recipient_hash: Mapped[str] = mapped_column(String)
    campaign_id: Mapped[str] = mapped_column(String)
    prospect_id: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    campaign: Mapped[dict] = mapped_column(JSONB)
    prospect: Mapped[dict] = mapped_column(JSONB)
    revision: Mapped[int] = mapped_column(Integer)
    last_inbound_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint(*KEY_FIELDS, "campaign_id", "prospect_id"),
        UniqueConstraint(*KEY_FIELDS, "case_id"),
        scope_fk("acquisition_contact_policies", "recipient_hash"),
        ForeignKeyConstraint(
            ["case_id", "business_id", "environment_id"],
            ["cases.id", "cases.business_id", "cases.environment_id"],
        ),
    )


class MailBinding(WorkScope, Base):
    __tablename__ = "acquisition_mail_bindings"
    mail_id: Mapped[str] = mapped_column(String, primary_key=True)
    thread_id: Mapped[str] = mapped_column(String)
    direction: Mapped[str] = mapped_column(String)
    payload_sha256: Mapped[str] = mapped_column(String)
    input_sha256: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        scope_fk("acquisition_correspondence_threads", "thread_id"),
        ForeignKeyConstraint(
            ["mail_id", "business_id", "environment_id"],
            ["mail_messages.id", "mail_messages.business_id", "mail_messages.environment_id"],
        ),
    )


class WorkReceipt(WorkScope, Base):
    __tablename__ = "acquisition_work_receipts"
    operation: Mapped[str] = mapped_column(String, primary_key=True)
    request_id: Mapped[str] = mapped_column(String, primary_key=True)
    body_sha256: Mapped[str] = mapped_column(String)
    response_body: Mapped[str] = mapped_column(String)
    thread_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (scope_fk("acquisition_correspondence_threads", "thread_id"),)
