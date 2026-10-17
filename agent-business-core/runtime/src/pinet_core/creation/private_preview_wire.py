"""Explicit private native intake observations; never public domain authority."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

VERSION = "creation-private-preview-intake.v1"
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Code = Annotated[str, Field(pattern=r"^[a-z0-9_]{1,80}$")]


class Strict(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class PreparePrivateIntake(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Digest
    idempotency_key: UUID = Field(strict=False)


class PrivateIntakeAttempt(Strict):
    recovery_id: UUID
    idempotency_key: UUID
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Digest
    accepted_source_revision: Source
    source_revision: Source
    native_host: str = Field(min_length=1, max_length=253)
    state: Literal["preparing", "private_draft_imported", "failed", "stale"]
    failure_code: Code | None
    created_at: datetime
    finished_at: datetime | None


class PrivateIntakeView(Strict):
    creation_id: UUID
    current_revision: int | None = Field(ge=1, le=20)
    candidate_sha256: Digest | None
    state: Literal["not_prepared", "preparing", "private_draft_imported", "failed", "stale"]
    public_canonical_host: str | None
    domain_authority: Literal["UNVERIFIED"]
    native_host: str | None
    host_source: Literal["not_bound", "existing_canonical_host", "explicit_private_preview"]
    private_preview_only: Literal[True]
    can_prepare: bool
    latest: PrivateIntakeAttempt | None
    full_f1_status: Literal["UNVERIFIED"]
    launch_status: Literal["UNVERIFIED"]
    deployment: Literal["not_performed"]
    channel_activation: Literal["not_performed"]

    @model_validator(mode="after")
    def coherent(self):
        if (self.current_revision is None) != (self.candidate_sha256 is None):
            raise ValueError("paired_accepted_identity_required")
        if (self.host_source == "not_bound") != (self.native_host is None):
            raise ValueError("bound_native_host_required")
        if self.host_source == "existing_canonical_host" and self.native_host != self.public_canonical_host:
            raise ValueError("existing_host_must_match")
        if self.host_source == "explicit_private_preview" and (self.public_canonical_host is not None or self.latest is None
                or self.latest.native_host != self.native_host or self.latest.accepted_revision != self.current_revision
                or self.latest.candidate_sha256 != self.candidate_sha256 or self.latest.state != self.state):
            raise ValueError("current_explicit_binding_required")
        if self.can_prepare and (self.current_revision is None or self.public_canonical_host is not None
                or self.state in {"preparing", "private_draft_imported"}):
            raise ValueError("eligible_private_prepare_required")
        if self.state == "private_draft_imported" and self.native_host is None:
            raise ValueError("imported_host_required")
        return self


class PrivateIntakeEnvelope(Strict):
    contract_version: Literal["creation-private-preview-intake.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: PrivateIntakeView
