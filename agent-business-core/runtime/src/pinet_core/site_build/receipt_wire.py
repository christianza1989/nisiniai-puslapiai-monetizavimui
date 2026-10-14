"""Owner-facing observations contain no paths, bearer, raw evidence or permissions."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Blocker = Annotated[str, Field(pattern=r"^[a-z0-9_:-]{1,160}$")]
VERSION = "site-foundation.v1"


class Strict(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class Check(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    command: Literal["candidate", "verify-local"]
    idempotency_key: UUID


class ReceiptView(Strict):
    receipt_id: UUID
    idempotency_key: UUID
    command: Literal["candidate", "verify-local"]
    creation_id: UUID
    accepted_revision: int = Field(ge=1, le=20)
    checked_at: datetime
    state: Literal["blocked", "candidate", "verified-local"]
    blockers: list[Blocker] = Field(max_length=500)
    release_id: UUID | None
    package_sha256: Digest | None
    execution_source_revision: Source
    public_source_revision: Source
    synthetic: bool
    calibration_status: Literal["UNVERIFIED"]
    channel_activation: Literal["not_performed"]
    deployment: Literal["not_performed"]

    @model_validator(mode="after")
    def coherent(self):
        if (self.release_id is None) != (self.package_sha256 is None):
            raise ValueError("paired_release_identity_required")
        if self.state == "verified-local" and (self.release_id is None or self.blockers):
            raise ValueError("complete_verified_receipt_required")
        return self


class FoundationView(Strict):
    creation_id: UUID
    current_revision: int = Field(ge=0, le=20)
    observed_at: datetime
    state: Literal["missing", "blocked", "candidate", "verified-local", "stale", "unavailable"]
    foundation_status: Literal["UNVERIFIED", "LOCAL_DELIVERY_CHECKS_PASS"]
    agent_foundation_ready: bool
    can_check: bool
    latest: ReceiptView | None
    blockers: list[Blocker] = Field(max_length=500)
    calibration_status: Literal["UNVERIFIED"]
    channel_activation: Literal["not_performed"]
    deployment: Literal["not_performed"]

    @model_validator(mode="after")
    def coherent(self):
        verified = self.foundation_status == "LOCAL_DELIVERY_CHECKS_PASS"
        if self.agent_foundation_ready != verified:
            raise ValueError("evidence_readiness_must_agree")
        if verified and (self.state != "verified-local" or self.latest is None
                or self.latest.state != "verified-local" or self.latest.accepted_revision != self.current_revision
                or self.blockers):
            raise ValueError("current_complete_evidence_required")
        if self.can_check and self.current_revision == 0:
            raise ValueError("accepted_revision_required")
        return self


class Envelope(Strict):
    contract_version: Literal["site-foundation.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: FoundationView


class ReceiptEnvelope(Strict):
    contract_version: Literal["site-foundation.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: ReceiptView
