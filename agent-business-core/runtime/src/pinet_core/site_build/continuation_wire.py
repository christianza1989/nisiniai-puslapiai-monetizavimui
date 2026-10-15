"""A continuation does not certify quality or activate a runtime/channel."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from .receipt_wire import Digest, Source, Strict

VERSION = "site-continuation.v1"


class Resume(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    idempotency_key: UUID = Field(strict=False)


class ContinuationView(Strict):
    continuation_id: UUID
    creation_id: UUID
    accepted_revision: int = Field(ge=1, le=20)
    idempotency_key: UUID
    created_at: datetime
    context_sha256: Digest
    accepted_source_revision: Source
    execution_source_revision: Source
    public_source_revision: Source
    current: bool
    foundation_status: Literal["UNVERIFIED"]
    channel_activation: Literal["not_performed"]
    deployment: Literal["not_performed"]


class ContinuationState(Strict):
    creation_id: UUID
    latest: ContinuationView | None


class ContinuationEnvelope(Strict):
    contract_version: Literal["site-continuation.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: ContinuationView


class StateEnvelope(ContinuationEnvelope):
    data: ContinuationState
