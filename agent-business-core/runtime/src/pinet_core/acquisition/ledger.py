"""Transaction-serialized private invitation ledger and immutable byte receipts."""
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select, text

from ..db import Database
from ..models import Business
from .identity import CanonicalRecipient
from .interfaces import (
    Conversion,
    EventReceipt,
    Invitation,
    LifecycleEvent,
    Resolution,
    Scope,
    project_conversion,
)
from .models import AcquisitionCampaign, AcquisitionChallenge, AcquisitionInvitation, AcquisitionReceipt
from .recipient_binding import (
    RecipientChallengeReceipt,
    RecipientProofReceipt,
    matches_recipient_digest,
    new_recipient_challenge,
)
from .revocation import RetirementReceipt


class LedgerError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


@dataclass(frozen=True)
class Reply:
    body: str
    status: int = 200


def scope_values(scope, adapter_id):
    return {**scope.model_dump(), 'adapter_id': adapter_id}


def conditions(model, values):
    return [getattr(model, key) == value for key, value in values.items()]


async def apply_scope(tx, scope: Scope, adapter_id: str):
    for key, value in scope_values(scope, adapter_id).items():
        await tx.execute(text('SELECT set_config(:key,:value,true)'),
                         {'key': 'pinet.acq_' + key, 'value': value})


def account_hash(scope, adapter_id, account_ref):
    # Only opaque native account IDs, never an email identity digest.
    value = json.dumps(['acquisition-retired-account-v1', scope.model_dump(), adapter_id, account_ref],
                       sort_keys=True, separators=(',', ':')).encode()
    return hashlib.sha256(value).hexdigest()


class AcquisitionLedger:
    def __init__(self, database: Database, recipient_keys: dict):
        self.database, self.recipient_keys = database, dict(recipient_keys)

    def recipient_key(self, scope, adapter_id, key_id):
        key = self.recipient_keys.get((scope, adapter_id, key_id))
        if not key:
            raise LedgerError(409, 'recipient_key_unavailable')
        return key

    async def prepare(self, invitation: Invitation, adapter_id: str, recipient: CanonicalRecipient,
                      recipient_key_id: str):
        """Trusted preparation only; private exact JS bytes, no public ingestion route."""
        scope = invitation.scope
        key = self.recipient_key(scope, adapter_id, recipient_key_id)
        if (scope.environment_class != 'test' or not recipient.value.endswith('@example.test')
                or recipient.address_rule != key.address_rule):
            raise ValueError('isolated_canonical_recipient_required')
        values = scope_values(scope, adapter_id)
        async with self.database.transaction(scope.business_id, scope.environment_id) as tx:
            await apply_scope(tx, scope, adapter_id)
            business = await tx.get(Business, scope.business_id)
            if not business or business.site_id != scope.site_id:
                raise ValueError('registered_business_site_mismatch')
            # Serialize preparation with campaign stop and other preparations.
            await self._lock(tx, ['campaign', values, invitation.campaign_id])
            campaign = await tx.scalar(select(AcquisitionCampaign).where(
                *conditions(AcquisitionCampaign, values),
                AcquisitionCampaign.campaign_id == invitation.campaign_id).with_for_update())
            if not campaign:
                tx.add(AcquisitionCampaign(**values, campaign_id=invitation.campaign_id, stopped=False))
                await tx.flush()
            elif campaign.stopped:
                raise LedgerError(409, 'campaign_stopped')
            existing = await tx.scalar(select(AcquisitionInvitation).where(
                *conditions(AcquisitionInvitation, values),
                AcquisitionInvitation.invitation_ref == invitation.invitation_ref))
            if existing:
                raise LedgerError(409, 'invitation_ref_reuse')
            tx.add(AcquisitionInvitation(**values, invitation_ref=invitation.invitation_ref,
                campaign_id=invitation.campaign_id, prospect_id=invitation.prospect_id,
                offer_revision=invitation.offer_revision, issued_at=invitation.issued_at,
                expires_at=invitation.expires_at, canonical_recipient=recipient.value,
                canonical_source=recipient.codec_sha256, address_rule=recipient.address_rule,
                recipient_key_id=key.key_id))

    async def stop(self, scope, adapter_id, campaign_id):
        async with self.database.transaction(scope.business_id, scope.environment_id) as tx:
            await apply_scope(tx, scope, adapter_id)
            await self._lock(tx, ['campaign', scope_values(scope, adapter_id), campaign_id])
            campaign = await tx.scalar(select(AcquisitionCampaign).where(
                *conditions(AcquisitionCampaign, scope_values(scope, adapter_id)),
                AcquisitionCampaign.campaign_id == campaign_id).with_for_update())
            if not campaign:
                raise LedgerError(404, 'campaign_not_found')
            campaign.stopped = True

    @staticmethod
    async def _lock(tx, value):
        digest = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).digest()
        lock_id = int.from_bytes(digest[:8], 'big', signed=True)
        await tx.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock_id})

    async def execute(self, operation, value, raw: bytes, now: datetime):
        scope, adapter_id = value.scope, value.adapter_id
        values = scope_values(scope, adapter_id)
        request_id = str(value.event_id if operation == 'events' else value.request_id)
        body_hash = hashlib.sha256(raw).hexdigest()
        async with self.database.transaction(scope.business_id, scope.environment_id) as tx:
            await apply_scope(tx, scope, adapter_id)
            # Global within this scope/operation; prevents cross-invite UUID reuse races.
            await self._lock(tx, ['request', values, operation, request_id])
            receipt = await tx.scalar(select(AcquisitionReceipt).where(
                *conditions(AcquisitionReceipt, values), AcquisitionReceipt.operation == operation,
                AcquisitionReceipt.request_id == request_id))
            if receipt:
                if receipt.body_sha256 != body_hash:
                    raise LedgerError(409, 'request_id_body_conflict')
                return Reply(receipt.response_body, receipt.status_code)
            invite = await tx.scalar(select(AcquisitionInvitation).where(
                *conditions(AcquisitionInvitation, values),
                AcquisitionInvitation.invitation_ref == value.invitation_ref))
            if not invite:
                raise LedgerError(404, 'invitation_not_found')
            # Same order for all mutating operations, including stop/preparation.
            await self._lock(tx, ['campaign', values, invite.campaign_id])
            campaign = await tx.scalar(select(AcquisitionCampaign).where(
                *conditions(AcquisitionCampaign, values),
                AcquisitionCampaign.campaign_id == invite.campaign_id).with_for_update())
            invite = await tx.scalar(select(AcquisitionInvitation).where(
                *conditions(AcquisitionInvitation, values),
                AcquisitionInvitation.invitation_ref == value.invitation_ref).with_for_update())
            common = {'scope': scope, 'adapter_id': adapter_id, 'invitation_ref': invite.invitation_ref,
                      'request_id': value.request_id} if operation != 'events' else {}
            extra = {}
            if operation == 'resolve':
                state = ('stopped' if invite.retired_at or campaign.stopped else
                         'already_attributed' if invite.provider_ref else
                         'expired' if invite.expires_at <= now else 'available')
                result = Resolution(scope=scope, invitation_ref=invite.invitation_ref,
                    offer_revision=invite.offer_revision, expires_at=invite.expires_at, state=state)
            elif operation == 'recipient-challenge':
                state = ('stopped' if invite.retired_at or campaign.stopped else
                         'already_bound' if invite.bound_at else
                         'expired' if invite.expires_at <= now else 'issued')
                challenge = None
                if state == 'issued':
                    key = self.recipient_key(scope, adapter_id, invite.recipient_key_id)
                    challenge = new_recipient_challenge(key, now, invite.expires_at)
                    tx.add(AcquisitionChallenge(**values, invitation_ref=invite.invitation_ref,
                                                **challenge.model_dump()))
                result = RecipientChallengeReceipt(**common, state=state, challenge=challenge)
            elif operation == 'verify-recipient':
                self._available(invite, campaign, now)
                challenge = await self._challenge(tx, values, invite, value)
                if challenge.consumed_at or invite.bound_at:
                    raise LedgerError(409, 'recipient_already_bound_or_nonce_consumed')
                if challenge.expires_at <= now:
                    raise LedgerError(410, 'recipient_challenge_expired')
                if value.native_verified_at > now or value.native_verified_at < invite.issued_at:
                    raise LedgerError(422, 'native_verification_time_invalid')
                if not self._matches(invite, value):
                    raise LedgerError(403, 'intended_recipient_mismatch')
                invite.native_account_ref, invite.bound_at, challenge.consumed_at = value.native_account_ref, now, now
                result = RecipientProofReceipt(**common, bound_at=now)
            elif operation == 'retire-recipient':
                if value.occurred_at > now:
                    raise LedgerError(422, 'retirement_time_invalid')
                fingerprint = account_hash(scope, adapter_id, value.native_account_ref)
                if invite.retired_at:
                    retires = fingerprint == invite.retired_account_hash
                elif invite.native_account_ref:
                    retires = value.native_account_ref == invite.native_account_ref
                elif value.recipient_proof:
                    # Privacy callback remains valid after marketing pause/expiry.
                    # Authoritative challenge + exact intended-address MAC is still mandatory.
                    await self._challenge(tx, values, invite, value.recipient_proof)
                    retires = self._matches(invite, value.recipient_proof)
                else:
                    raise LedgerError(409, 'unbound_retirement_requires_prepared_proof')
                if retires and not invite.retired_at:
                    invite.retired_at, invite.retired_account_hash = now, fingerprint
                    invite.canonical_recipient, invite.native_account_ref = None, None
                    if invite.conversion:
                        current = dict(invite.conversion)
                        current.update(state='account_deleted', profile_active=False)
                        invite.conversion = current
                result = RetirementReceipt(**common, state='recipient_retired' if retires else 'candidate_retired',
                                           retired_at=invite.retired_at if retires else now)
            elif operation == 'events':
                result = await self._event(tx, values, invite, campaign, value, now)
                extra = {'provider_ref': value.provider_ref, 'source_revision': value.source_revision}
            else:
                raise LedgerError(404, 'operation_not_found')
            reply = Reply(result.model_dump_json())
            tx.add(AcquisitionReceipt(**values, operation=operation, request_id=request_id,
                invitation_ref=invite.invitation_ref, body_sha256=body_hash,
                response_body=reply.body, status_code=reply.status, **extra))
            # Commit performed before route returns/ACK is visible to the native outbox.
            return reply

    @staticmethod
    def _available(invite, campaign, now):
        if invite.retired_at or campaign.stopped:
            raise LedgerError(409, 'invitation_stopped')
        if invite.expires_at <= now:
            raise LedgerError(410, 'invitation_expired')

    async def _challenge(self, tx, values, invite, proof):
        challenge = await tx.scalar(select(AcquisitionChallenge).where(
            *conditions(AcquisitionChallenge, values),
            AcquisitionChallenge.challenge_nonce == proof.challenge_nonce,
            AcquisitionChallenge.invitation_ref == invite.invitation_ref).with_for_update())
        if (not challenge or challenge.recipient_key_id != proof.recipient_key_id
                or challenge.address_rule != proof.address_rule):
            raise LedgerError(409, 'recipient_challenge_binding_mismatch')
        return challenge

    def _matches(self, invite, proof):
        key = self.recipient_key(proof.scope, proof.adapter_id, proof.recipient_key_id)
        return (invite.canonical_recipient is not None and invite.address_rule == proof.address_rule
                and matches_recipient_digest(key, invite.invitation_ref, proof.challenge_nonce,
                                             invite.canonical_recipient, proof.recipient_digest))

    async def _event(self, tx, values, invite, campaign, event: LifecycleEvent, now):
        older_retired = (invite.conversion and invite.provider_ref == event.provider_ref
                         and event.source_revision < invite.conversion['source_revision'])
        if invite.retired_at and not older_retired:
            raise LedgerError(409, 'recipient_retired')
        if not invite.bound_at:
            raise LedgerError(409, 'verified_recipient_required')
        if event.occurred_at > now:
            raise LedgerError(422, 'native_event_time_invalid')
        if not invite.provider_ref:
            self._available(invite, campaign, now)
            # One actual provider can belong to only one invite in this registered scope.
            await self._lock(tx, ['provider', values, event.provider_ref])
            other = await tx.scalar(select(AcquisitionInvitation).where(
                *conditions(AcquisitionInvitation, values), AcquisitionInvitation.provider_ref == event.provider_ref))
            if other:
                raise LedgerError(409, 'provider_already_attributed')
        elif invite.provider_ref != event.provider_ref:
            raise LedgerError(409, 'provider_binding_mismatch')
        revision = await tx.scalar(select(AcquisitionReceipt).where(
            *conditions(AcquisitionReceipt, values), AcquisitionReceipt.provider_ref == event.provider_ref,
            AcquisitionReceipt.source_revision == event.source_revision))
        if revision:
            raise LedgerError(409, 'native_revision_reuse')
        current = Conversion.model_validate_json(json.dumps(invite.conversion)) if invite.conversion else None
        try:
            conversion, state = project_conversion(current, event)
        except ValueError as exc:
            raise LedgerError(409, str(exc)) from None
        invite.provider_ref, invite.conversion = event.provider_ref, conversion.model_dump(mode='json')
        if event.kind == 'account_deleted' and state == 'applied':
            invite.retired_account_hash = account_hash(event.scope, event.adapter_id, invite.native_account_ref)
            invite.retired_at, invite.canonical_recipient, invite.native_account_ref = now, None, None
        return EventReceipt(event_id=event.event_id, state=state, source_revision=event.source_revision,
                            profile_active=conversion.profile_active)
