"""Canonical acquisition adapter v1 shapes. They do not mount API routes or send mail."""
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, ConfigDict, Field, field_validator, model_validator

from ..contracts import Strict

VERSION = '0.1.1'
OpaqueId = Annotated[str, Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')]
InvitationRef = Annotated[str, Field(min_length=32, max_length=96, pattern=r'^[A-Za-z0-9_-]+$')]


class Wire(Strict):
    model_config = ConfigDict(strict=True, frozen=True)


class NoExternalSend(Wire):
    external_sent: Literal[False] = False

    @field_validator('external_sent', mode='before')
    @classmethod
    def only_boolean_false(cls, value):
        if value is not False:
            raise ValueError('external_sent_must_be_boolean_false')
        return value


class Scope(Wire):
    business_id: OpaqueId
    site_id: OpaqueId
    environment_id: OpaqueId
    environment_class: Literal['test', 'production']


class Invitation(Wire):
    contract_version: Literal['0.1.1'] = VERSION
    scope: Scope
    invitation_ref: InvitationRef
    campaign_id: OpaqueId
    prospect_id: OpaqueId
    objective: Literal['provider_signup'] = 'provider_signup'
    offer_revision: OpaqueId
    issued_at: AwareDatetime
    expires_at: AwareDatetime

    @model_validator(mode='after')
    def lifetime(self):
        if self.expires_at <= self.issued_at:
            raise ValueError('invitation_expiry_must_follow_issue')
        return self


class ResolveRequest(Wire):
    contract_version: Literal['0.1.1'] = VERSION
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID


class Resolution(Wire):
    """Server-to-server minimal projection; never public prospect/contact data."""
    contract_version: Literal['0.1.1'] = VERSION
    scope: Scope
    invitation_ref: InvitationRef
    objective: Literal['provider_signup'] = 'provider_signup'
    offer_revision: OpaqueId
    expires_at: AwareDatetime
    state: Literal['available', 'expired', 'stopped', 'already_attributed']


class LifecycleEvent(Wire):
    contract_version: Literal['0.1.1'] = VERSION
    event_id: UUID
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    provider_ref: OpaqueId
    # Monotonic for the native provider aggregate, across all below event kinds.
    source_revision: int = Field(ge=1)
    source_release: OpaqueId
    occurred_at: AwareDatetime
    kind: Literal[
        'signup_started', 'account_verified', 'profile_submitted',
        'profile_active', 'profile_deactivated', 'account_deleted',
    ]
    profile_ref: OpaqueId | None = None
    eligibility_revision: OpaqueId | None = None
    operator_approved: bool = False

    @model_validator(mode='after')
    def activation_proof(self):
        if self.kind in {'profile_submitted', 'profile_active', 'profile_deactivated'} and not self.profile_ref:
            raise ValueError('profile_ref_required')
        if self.kind == 'profile_active':
            if not self.eligibility_revision or not self.operator_approved:
                raise ValueError('native_operator_eligibility_required')
        elif self.eligibility_revision or self.operator_approved:
            raise ValueError('unexpected_activation_proof')
        return self


class EventReceipt(NoExternalSend):
    contract_version: Literal['0.1.1'] = VERSION
    event_id: UUID
    state: Literal['applied', 'duplicate', 'stale']
    source_revision: int = Field(ge=1)
    profile_active: bool


class CaptureHandshake(NoExternalSend):
    contract_version: Literal['0.1.1'] = VERSION
    scope: Scope
    adapter_id: OpaqueId
    mode: Literal['capture_only'] = 'capture_only'
    recipient_domain: Literal['example.test'] = 'example.test'

    @model_validator(mode='after')
    def isolated(self):
        if self.scope.environment_class != 'test':
            raise ValueError('capture_requires_test_scope')
        return self


class Conversion(Wire):
    scope: Scope
    invitation_ref: InvitationRef
    provider_ref: OpaqueId
    profile_ref: OpaqueId | None = None
    source_revision: int = Field(ge=1)
    state: Literal[
        'signup_started', 'account_verified', 'profile_submitted',
        'profile_active', 'profile_deactivated', 'account_deleted',
    ]
    profile_active: bool
    last_event_id: UUID


def project_conversion(current: Conversion | None, event: LifecycleEvent):
    """Pure reducer AFTER authenticated durable dedup and invitation binding.

    Storage must serialize the aggregate/CAS; this function is not a replay ledger.
    """
    if current:
        if (current.scope != event.scope or current.invitation_ref != event.invitation_ref
                or current.provider_ref != event.provider_ref):
            raise ValueError('conversion_scope_mismatch')
        if event.source_revision <= current.source_revision:
            return current, 'stale'
        if current.state == 'account_deleted':
            raise ValueError('deleted_provider_is_terminal')
        if current.profile_ref and event.profile_ref and current.profile_ref != event.profile_ref:
            raise ValueError('profile_binding_mismatch')
        if current.state in {'profile_active', 'profile_deactivated'} and event.kind in {
            'signup_started', 'account_verified', 'profile_submitted',
        }:
            raise ValueError('lifecycle_regression')
    value = Conversion(
        scope=event.scope, invitation_ref=event.invitation_ref, provider_ref=event.provider_ref,
        profile_ref=event.profile_ref or (current.profile_ref if current else None),
        source_revision=event.source_revision, state=event.kind,
        profile_active=event.kind == 'profile_active', last_event_id=event.event_id,
    )
    return value, 'applied'


SCHEMAS = (Scope, Invitation, ResolveRequest, Resolution, LifecycleEvent, EventReceipt, CaptureHandshake, Conversion)
