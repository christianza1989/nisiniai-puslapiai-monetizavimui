"""Additive account retirement, independent of the locked recipient0.1.0 schema."""
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, model_validator

from .interfaces import InvitationRef, NoExternalSend, OpaqueId, Scope, Wire
from .recipient_binding import RecipientProofRequest


class RecipientRetirement(Wire):
    retirement_contract_version: Literal['0.1.0'] = '0.1.0'
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID
    native_account_ref: OpaqueId
    occurred_at: AwareDatetime
    source_release: OpaqueId
    reason: Literal['account_erasure', 'retention_erasure']
    # Preserve a previously prepared proof in the private atomic erasure outbox.
    # It may recover a lost ACK; it never extends marketing/proof expiry.
    recipient_proof: RecipientProofRequest | None = None

    @model_validator(mode='after')
    def same_binding(self):
        proof = self.recipient_proof
        if proof and (proof.scope != self.scope or proof.adapter_id != self.adapter_id
                      or proof.invitation_ref != self.invitation_ref
                      or proof.native_account_ref != self.native_account_ref):
            raise ValueError('retirement_proof_binding_mismatch')
        return self


class RetirementReceipt(NoExternalSend):
    retirement_contract_version: Literal['0.1.0'] = '0.1.0'
    scope: Scope
    adapter_id: OpaqueId
    invitation_ref: InvitationRef
    request_id: UUID
    state: Literal['recipient_retired', 'candidate_retired']
    retired_at: AwareDatetime


SCHEMAS = (RecipientRetirement, RetirementReceipt)
