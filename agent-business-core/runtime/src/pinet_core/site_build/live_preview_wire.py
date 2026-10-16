"""Current customer live-preview capability, separate from opaque preparation."""
from datetime import timedelta
from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

CONTRACT = "customer-live-preview.v1"
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Reason = Annotated[str, Field(pattern=r"^[a-z0-9_:-]{1,160}$")]
Failure = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{0,79}$")]
State = Literal["preparing", "starting", "ready", "closing", "closed", "expired", "revoked", "failed"]
ACTIVE_STATES = frozenset({"preparing", "starting", "ready", "closing"})


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True, revalidate_instances="always")

    @field_validator("local_preview_only", mode="before", check_fields=False)
    @classmethod
    def explicit_boolean(cls, value):
        if type(value) is not bool:
            raise ValueError("explicit local preview flag required")
        return value


class Start(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    site_context_sha256: Digest
    idempotency_key: UUID = Field(strict=False)


class LeaseView(Strict):
    lease_id: UUID
    creation_id: UUID
    idempotency_key: UUID
    state: State
    accepted_revision: int = Field(ge=1, le=20)
    scope_sha256: Digest
    execution_source_revision: Source
    public_source_revision: Source
    site_context_sha256: Digest
    created_at: AwareDatetime
    expires_at: AwareDatetime | None
    preview_url: str | None = Field(pattern=r"^http://127\.0\.0\.1:[1-9][0-9]{0,4}/$")
    failure_code: Failure | None
    local_preview_only: Literal[True]
    full_site_status: Literal["UNVERIFIED"]
    launch_status: Literal["UNVERIFIED"]
    deployment: Literal["not_performed"]

    @field_validator("preview_url")
    @classmethod
    def owned_loopback_format(cls, value):
        if value is not None:
            parsed = urlsplit(value)
            if not parsed.port or not 1 <= parsed.port <= 65535 or value != f"http://127.0.0.1:{parsed.port}/":
                raise ValueError("bounded owned loopback port required")
        return value

    @model_validator(mode="after")
    def current_ready_url_only(self):
        if self.state == "ready":
            if self.preview_url is None or self.expires_at is None or self.expires_at <= self.created_at or self.failure_code is not None:
                raise ValueError("only a current ready lease can expose its bounded URL")
        elif self.preview_url is not None:
            raise ValueError("inactive lease cannot expose a URL")
        return self


class Availability(Strict):
    creation_id: UUID
    can_start: bool
    current_revision: int | None = Field(ge=1, le=20)
    site_context_sha256: Digest | None
    blocked_reasons: list[Reason] = Field(max_length=1024)
    latest_lease: LeaseView | None
    local_preview_only: Literal[True]
    full_site_status: Literal["UNVERIFIED"]
    launch_status: Literal["UNVERIFIED"]

    @model_validator(mode="after")
    def exact_availability(self):
        if self.can_start and (self.current_revision is None or self.site_context_sha256 is None or self.blocked_reasons):
            raise ValueError("start eligibility requires a current exact native binding without blockers")
        if not self.can_start and not self.blocked_reasons:
            raise ValueError("unavailable projection requires an explicit reason")
        if self.latest_lease is not None and self.latest_lease.creation_id != self.creation_id:
            raise ValueError("only this owned Creation's lease can be projected")
        if self.latest_lease is not None and self.latest_lease.state == "ready" and (
                self.latest_lease.accepted_revision != self.current_revision
                or self.latest_lease.site_context_sha256 != self.site_context_sha256):
            raise ValueError("ready lease must match current accepted native context")
        return self


def current_projection(lease, source, observed):
    if lease.created_at > observed:
        raise ValueError("future lease creation is not a current projection")
    if lease.state in ACTIVE_STATES and lease.execution_source_revision != source:
        raise ValueError("active lease must use the current execution source")
    if lease.state == "ready" and not observed < lease.expires_at <= observed + timedelta(seconds=90):
        raise ValueError("ready URL requires an unexpired visible lease of at most90seconds")


class Envelope(Strict):
    contract_version: Literal[CONTRACT]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: AwareDatetime
    request_id: UUID


class LeaseEnvelope(Envelope):
    data: LeaseView

    @model_validator(mode="after")
    def unexpired_projection(self):
        current_projection(self.data, self.source_revision, self.observed_at)
        return self


class AvailabilityEnvelope(Envelope):
    data: Availability

    @model_validator(mode="after")
    def unexpired_latest(self):
        lease = self.data.latest_lease
        if lease is not None:
            current_projection(lease, self.source_revision, self.observed_at)
        return self
