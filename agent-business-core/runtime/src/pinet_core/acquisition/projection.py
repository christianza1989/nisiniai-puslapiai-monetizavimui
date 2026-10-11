"""One consistent, redacted read of the capture ledger for future portal/chat adapters."""
import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator
from sqlalchemy import cast, func, select, text
from sqlalchemy.dialects.postgresql import JSONB

from .interfaces import NoExternalSend, OpaqueId, Scope, Wire
from .ledger import apply_scope, conditions, scope_values
from .models import AcquisitionCampaign, AcquisitionInvitation, AcquisitionReceipt

VERSION = '0.1.0'
DEFINITION = 'acquisition-capture-ledger-v1'
MISSING_SOURCES = ('discovery', 'outreach_transport', 'correspondence', 'native_outbox',
                   'native_current_eligibility', 'native_event_occurrence_history',
                   'generic_agent_registry', 'daily_scheduler', 'cost_usage')
MAX_ACTIVITY = 50
Operation = Literal['resolve', 'recipient-challenge', 'verify-recipient', 'events', 'retire-recipient']
Outcome = Literal['available', 'expired', 'stopped', 'already_attributed', 'issued', 'already_bound',
                  'recipient_bound', 'applied', 'duplicate', 'stale', 'recipient_retired', 'candidate_retired']


class LedgerCounts(Wire):
    campaigns: int = Field(ge=0)
    stopped_campaigns: int = Field(ge=0)
    invitations: int = Field(ge=0)
    available_unbound_invitations: int = Field(ge=0)
    expired_unbound_invitations: int = Field(ge=0)
    retired_invitations: int = Field(ge=0)
    currently_bound_recipients: int = Field(ge=0)
    currently_attributed_providers: int = Field(ge=0)
    active_providers_in_core: int = Field(ge=0)
    historical_recipient_bindings: int = Field(ge=0)
    historical_active_providers_in_core: int = Field(ge=0)
    committed_commands: int = Field(ge=0)
    # No sender/discovery/attempt log exists in this ledger. Unknown never becomes zero.
    discovered_prospects: None = None
    outreach_sent: None = None
    received_replies: None = None
    native_pending_outbox: None = None
    failed_attempts: None = None
    cost_microusd: None = None


class ReceiptActivity(Wire):
    operation: Operation
    request_id: UUID
    committed_at: AwareDatetime
    outcome: Outcome
    source_revision: int | None = Field(default=None, ge=1)


class CaptureLedgerSnapshot(NoExternalSend):
    projection_contract_version: Literal['0.1.0'] = VERSION
    metric_definition: Literal['acquisition-capture-ledger-v1'] = DEFINITION
    scope: Scope = Field(json_schema_extra={
        'allOf': [{'properties': {'environment_class': {'const': 'test'}}}],
    })
    adapter_id: OpaqueId
    mode: Literal['capture_only'] = 'capture_only'
    coverage: Literal['committed_core_ledger_only'] = 'committed_core_ledger_only'
    period_basis: Literal['current_and_all_time_ledger'] = 'current_and_all_time_ledger'
    full_pipeline_accepted: Literal[False] = False
    data_as_of: AwareDatetime
    expiry_evaluated_at: AwareDatetime
    last_committed_receipt_at: AwareDatetime | None
    missing_sources: tuple[str, ...]
    counts: LedgerCounts
    recent_committed_activity: tuple[ReceiptActivity, ...]
    activity_truncated: bool
    content_sha256: str = Field(pattern=r'^[a-f0-9]{64}$', min_length=64, max_length=64)

    @field_validator('full_pipeline_accepted', mode='before')
    @classmethod
    def boolean_false_only(cls, value):
        if value is not False:
            raise ValueError('pipeline_acceptance_must_be_boolean_false')
        return value

    @model_validator(mode='after')
    def isolated_capture(self):
        if self.scope.environment_class != 'test':
            raise ValueError('capture_projection_scope_required')
        return self


def snapshot_digest(value):
    body = value.model_dump(mode='json', exclude={'content_sha256'})
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False,
                                     separators=(',', ':')).encode()).hexdigest()


async def capture_snapshot(database, *, scope: Scope, adapter_id: str, now: datetime | None = None):
    """Internal read tool, not authentication or a mounted public/operator endpoint.

    The owner adapter must derive scope/adapter from current server-authorized
    control membership. A browser-provided Scope is never that authorization.
    Caller receives the same typed snapshot for both dashboard and director chat.
    """
    if (not isinstance(scope, Scope) or scope.environment_class != 'test'
            or not isinstance(adapter_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', adapter_id)):
        raise ValueError('capture_projection_scope_required')
    evaluated = now or datetime.now(UTC)
    if evaluated.tzinfo is None or evaluated.utcoffset() is None:
        raise ValueError('aware_projection_time_required')
    values = scope_values(scope, adapter_id)
    async with database.registry() as tx:
        # Set before any query. Multiple counts/activity reads see one DB snapshot;
        # the reader cannot accidentally mutate campaigns/invitations/receipts.
        await tx.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY'))
        await apply_scope(tx, scope, adapter_id)
        observed = await tx.scalar(text('SELECT transaction_timestamp()'))
        campaigns = (await tx.execute(select(
            func.count(), func.count().filter(AcquisitionCampaign.stopped),
        ).where(*conditions(AcquisitionCampaign, values)))).one()
        active = AcquisitionInvitation.conversion['profile_active'].as_boolean().is_(True)
        current = AcquisitionInvitation.retired_at.is_(None)
        unbound = current & AcquisitionInvitation.bound_at.is_(None)
        invitations = (await tx.execute(select(
            func.count(),
            func.count().filter(unbound & (AcquisitionInvitation.expires_at > evaluated)
                                & AcquisitionCampaign.stopped.is_(False)),
            func.count().filter(unbound & (AcquisitionInvitation.expires_at <= evaluated)),
            func.count().filter(AcquisitionInvitation.retired_at.is_not(None)),
            func.count().filter(current & AcquisitionInvitation.bound_at.is_not(None)),
            func.count().filter(current & AcquisitionInvitation.provider_ref.is_not(None)),
            func.count().filter(current & active),
        ).select_from(AcquisitionInvitation).join(AcquisitionCampaign,
            (AcquisitionCampaign.campaign_id == AcquisitionInvitation.campaign_id)
            & (AcquisitionCampaign.business_id == AcquisitionInvitation.business_id)
            & (AcquisitionCampaign.environment_id == AcquisitionInvitation.environment_id)
            & (AcquisitionCampaign.site_id == AcquisitionInvitation.site_id)
            & (AcquisitionCampaign.environment_class == AcquisitionInvitation.environment_class)
            & (AcquisitionCampaign.adapter_id == AcquisitionInvitation.adapter_id),
        ).where(*conditions(AcquisitionInvitation, values)))).one()
        # Receipt JSON is parsed only inside the deterministic tool. Raw bodies,
        # address/account/nonce/key/hash fields never enter the output DTO.
        outcome = cast(AcquisitionReceipt.response_body, JSONB)
        receipts = (await tx.execute(select(
            func.count(),
            func.count(func.distinct(AcquisitionReceipt.invitation_ref)).filter(
                AcquisitionReceipt.operation == 'verify-recipient'),
            func.count(func.distinct(AcquisitionReceipt.provider_ref)).filter(
                AcquisitionReceipt.operation == 'events', outcome['profile_active'].as_boolean().is_(True)),
            func.max(AcquisitionReceipt.created_at),
        ).where(*conditions(AcquisitionReceipt, values)))).one()
        recent = list(await tx.scalars(select(AcquisitionReceipt).where(
            *conditions(AcquisitionReceipt, values)).order_by(AcquisitionReceipt.created_at.desc(),
                AcquisitionReceipt.operation, AcquisitionReceipt.request_id).limit(MAX_ACTIVITY + 1)))
        activity = []
        for receipt in recent[:MAX_ACTIVITY]:
            body = json.loads(receipt.response_body)
            activity.append(ReceiptActivity(operation=receipt.operation, request_id=UUID(receipt.request_id),
                committed_at=receipt.created_at, outcome=body['state'], source_revision=receipt.source_revision))
        counts = LedgerCounts(campaigns=campaigns[0], stopped_campaigns=campaigns[1],
            invitations=invitations[0], available_unbound_invitations=invitations[1],
            expired_unbound_invitations=invitations[2], retired_invitations=invitations[3],
            currently_bound_recipients=invitations[4], currently_attributed_providers=invitations[5],
            active_providers_in_core=invitations[6], historical_recipient_bindings=receipts[1],
            historical_active_providers_in_core=receipts[2], committed_commands=receipts[0])
        snapshot = CaptureLedgerSnapshot(scope=scope, adapter_id=adapter_id,
            data_as_of=observed, expiry_evaluated_at=evaluated, last_committed_receipt_at=receipts[3],
            missing_sources=MISSING_SOURCES, counts=counts, recent_committed_activity=tuple(activity),
            activity_truncated=len(recent) > MAX_ACTIVITY, content_sha256='0' * 64)
        return snapshot.model_copy(update={'content_sha256': snapshot_digest(snapshot)})
