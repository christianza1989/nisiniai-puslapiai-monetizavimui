"""Private acquisition aggregates; never tied to a fabricated Conversation."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base, utcnow

SCOPE_COLUMNS = ('business_id', 'environment_id', 'site_id', 'environment_class', 'adapter_id')


class AcquisitionScope:
    business_id: Mapped[str] = mapped_column(String, ForeignKey('businesses.id'), primary_key=True)
    environment_id: Mapped[str] = mapped_column(String, primary_key=True)
    site_id: Mapped[str] = mapped_column(String, primary_key=True)
    environment_class: Mapped[str] = mapped_column(String, primary_key=True)
    adapter_id: Mapped[str] = mapped_column(String, primary_key=True)


def scoped_parent(parent, column):
    columns = [*SCOPE_COLUMNS, column]
    return ForeignKeyConstraint(columns, [f'{parent}.{c}' for c in columns])


class AcquisitionCampaign(AcquisitionScope, Base):
    __tablename__ = 'acquisition_campaigns'
    campaign_id: Mapped[str] = mapped_column(String, primary_key=True)
    stopped: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AcquisitionInvitation(AcquisitionScope, Base):
    __tablename__ = 'acquisition_invitations'
    invitation_ref: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String)
    prospect_id: Mapped[str] = mapped_column(String)
    offer_revision: Mapped[str] = mapped_column(String)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    canonical_recipient: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical_source: Mapped[str] = mapped_column(String)
    address_rule: Mapped[str] = mapped_column(String)
    recipient_key_id: Mapped[str] = mapped_column(String)
    native_account_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    bound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    conversion: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retired_account_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (scoped_parent('acquisition_campaigns', 'campaign_id'),
                      UniqueConstraint(*SCOPE_COLUMNS, 'provider_ref'))


class AcquisitionChallenge(AcquisitionScope, Base):
    __tablename__ = 'acquisition_challenges'
    challenge_nonce: Mapped[str] = mapped_column(String, primary_key=True)
    invitation_ref: Mapped[str] = mapped_column(String)
    recipient_key_id: Mapped[str] = mapped_column(String)
    address_rule: Mapped[str] = mapped_column(String)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (scoped_parent('acquisition_invitations', 'invitation_ref'),)


class AcquisitionReceipt(AcquisitionScope, Base):
    __tablename__ = 'acquisition_receipts'
    operation: Mapped[str] = mapped_column(String, primary_key=True)
    request_id: Mapped[str] = mapped_column(String, primary_key=True)
    invitation_ref: Mapped[str] = mapped_column(String)
    body_sha256: Mapped[str] = mapped_column(String)
    response_body: Mapped[str] = mapped_column(Text)
    status_code: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    provider_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    source_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    __table_args__ = (UniqueConstraint(*SCOPE_COLUMNS, 'provider_ref', 'source_revision'),)
