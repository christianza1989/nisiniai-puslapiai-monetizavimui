"""Bounded allowlist for portal receipts, never worker credentials or model prose."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from ..creation_registration.wire import Source, Strict


class Usage(Strict):
    input_tokens: int | None = Field(default=None, strict=True, ge=0)
    output_tokens: int | None = Field(default=None, strict=True, ge=0)
    cached_input_tokens: int | None = Field(default=None, strict=True, ge=0)
    reasoning_output_tokens: int | None = Field(default=None, strict=True, ge=0)


class Receipt(Strict):
    ticket_id: UUID
    state: Literal["queued", "reserved", "accepted", "rejected", "quarantined", "uncertain"]
    epoch: int = Field(strict=True, ge=0)
    job_id: UUID | None
    proposal_sha256: str | None = Field(pattern=r"^[a-f0-9]{64}$")
    known_model_usage: Usage
    usage_status: Literal["known", "partial", "unknown"]
    started_calls: int = Field(strict=True, ge=0, le=2)
    finished_calls: int = Field(strict=True, ge=0, le=2)
    reason: str | None = Field(max_length=80, pattern=r"^[a-z0-9_]+$")
    provider_execution: Literal[False]
    channel_activation: Literal["not_performed"]
    calibration_status: Literal["UNVERIFIED"]
    live_module_admitted: Literal[False]
    mode: Literal["synthetic_local_proposal"]


class Envelope(Strict):
    contract_version: Literal["xbot-local-receipt.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    observed_at: datetime
    source_revision: Source
    data: Receipt
