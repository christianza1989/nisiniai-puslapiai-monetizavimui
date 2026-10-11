"""Recipient proof sub-contract. No routes, account inference or replay ledger."""
import hashlib
import hmac
import json
import re
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator

from .interfaces import InvitationRef, NoExternalSend, OpaqueId, Scope, Wire

RECIPIENT_VERSION = '0.1.0'
ADDRESS_RULE = 'madbeauty-email-v1-js-trim-lower'
MAC_DOMAIN = 'madbeauty-recipient-binding-v1'
MAX_CHALLENGE_SECONDS = 300
ChallengeNonce = Annotated[str, Field(min_length=32, max_length=32, pattern=r'^[A-Za-z0-9_-]+$')]
RecipientDigest = Annotated[str, Field(pattern=r'^v1=[a-f0-9]{64}$', min_length=67, max_length=67)]


class RecipientWire(Wire):
    recipient_contract_version: Literal['0.1.0'] = RECIPIENT_VERSION


class RecipientNoSend(NoExternalSend):
    recipient_contract_version: Literal['0.1.0'] = RECIPIENT_VERSION


class RecipientChallengeRequest(RecipientWire):
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID


class RecipientChallenge(Wire):
    challenge_nonce: ChallengeNonce
    recipient_key_id: OpaqueId
    address_rule: OpaqueId
    issued_at: AwareDatetime
    expires_at: AwareDatetime

    @model_validator(mode='after')
    def lifetime(self):
        seconds = (self.expires_at - self.issued_at).total_seconds()
        if not 0 < seconds <= MAX_CHALLENGE_SECONDS:
            raise ValueError('invalid_recipient_challenge_lifetime')
        return self


class RecipientChallengeReceipt(RecipientNoSend):
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID
    state: Literal['issued', 'expired', 'stopped', 'already_bound']
    challenge: RecipientChallenge | None = None

    @model_validator(mode='after')
    def issued_only(self):
        if (self.state == 'issued') != (self.challenge is not None):
            raise ValueError('challenge_requires_issued_state')
        return self


class RecipientProofRequest(RecipientWire):
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID
    challenge_nonce: ChallengeNonce
    recipient_key_id: OpaqueId
    address_rule: OpaqueId
    recipient_digest: RecipientDigest
    native_account_ref: OpaqueId
    native_verified_at: AwareDatetime
    source_release: OpaqueId


class RecipientProofReceipt(RecipientNoSend):
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID
    state: Literal['recipient_bound'] = 'recipient_bound'
    bound_at: AwareDatetime


@dataclass(frozen=True)
class RecipientKeyGrant:
    key_id: str
    secret: bytes = field(repr=False)
    scope: Scope
    adapter_id: str
    address_rule: str = ADDRESS_RULE

    def __post_init__(self):
        if (not isinstance(self.secret, bytes) or not 32 <= len(self.secret) <= 1024
                or not isinstance(self.scope, Scope)
                or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', self.key_id)
                or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', self.adapter_id)
                or self.address_rule != ADDRESS_RULE):
            raise ValueError('invalid_recipient_key_grant')


def new_recipient_challenge(grant: RecipientKeyGrant, now: datetime, invitation_expires_at: datetime):
    """Caller must commit nonce, private recipient and immutable receipt atomically."""
    if (now.tzinfo is None or now.utcoffset() is None or invitation_expires_at.tzinfo is None
            or invitation_expires_at.utcoffset() is None):
        raise ValueError('aware_recipient_time_required')
    expires_at = min(now + timedelta(seconds=MAX_CHALLENGE_SECONDS), invitation_expires_at)
    if expires_at <= now:
        raise ValueError('invitation_expired')
    return RecipientChallenge(challenge_nonce=secrets.token_urlsafe(24), recipient_key_id=grant.key_id,
                              address_rule=grant.address_rule, issued_at=now, expires_at=expires_at)


def recipient_mac_bytes(grant: RecipientKeyGrant, invitation_ref: str, challenge_nonce: str,
                        canonical_recipient: str):
    """Exact canonical email comes from private storage / authoritative JS codec.

    No Python lower/casefold/strip, no email field from the proof body. Unicode
    normalization belongs to the registered native rule, not this MAC function.
    """
    if (not re.fullmatch(r'[A-Za-z0-9_-]{32,96}', invitation_ref)
            or not re.fullmatch(r'[A-Za-z0-9_-]{32}', challenge_nonce)
            or not isinstance(canonical_recipient, str) or not canonical_recipient):
        raise ValueError('invalid_recipient_mac_input')
    try:
        if len(canonical_recipient.encode('utf-8')) > 1024:
            raise ValueError('invalid_recipient_mac_input')
        return json.dumps([MAC_DOMAIN, grant.address_rule, grant.scope.business_id, grant.scope.site_id,
                           grant.scope.environment_id, grant.scope.environment_class, grant.adapter_id,
                           grant.key_id, invitation_ref, challenge_nonce, canonical_recipient],
                          ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    except UnicodeError as exc:
        raise ValueError('invalid_recipient_mac_input') from exc


def recipient_digest(grant: RecipientKeyGrant, invitation_ref: str, challenge_nonce: str,
                     canonical_recipient: str):
    value = recipient_mac_bytes(grant, invitation_ref, challenge_nonce, canonical_recipient)
    return 'v1=' + hmac.new(grant.secret, value, hashlib.sha256).hexdigest()


def matches_recipient_digest(grant: RecipientKeyGrant, invitation_ref: str, challenge_nonce: str,
                             canonical_recipient: str, digest: str):
    if not isinstance(digest, str) or not re.fullmatch(r'v1=[a-f0-9]{64}', digest):
        return False
    try:
        expected = recipient_digest(grant, invitation_ref, challenge_nonce, canonical_recipient)
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(expected, digest)


SCHEMAS = (RecipientChallengeRequest, RecipientChallenge, RecipientChallengeReceipt,
           RecipientProofRequest, RecipientProofReceipt)
