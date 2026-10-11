"""Bounded additive customer text requests. No client-selected prompts or providers."""
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..creation_registration.wire import Source, Strict

Revision = Annotated[int, Field(strict=True, ge=0, le=2147483647)]


class Start(Strict):
    request_id: UUID
    admission_id: UUID
    notice_version: Literal["customer-text.local.v1"]
    consent: Literal[True]

    @field_validator("consent", mode="before")
    @classmethod
    def explicit_consent(cls, value):
        if value is not True:
            raise ValueError("explicit_consent_required")
        return value


class Turn(Strict):
    request_id: UUID
    base_need_revision: Revision
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def meaningful_text(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 and c not in "\n\t" for c in value):
            raise ValueError("invalid_message")
        return value


NeedField = Literal["goal", "requirements", "deadline", "budget", "location"]


class NeedValue(Strict):
    value: str = Field(max_length=1000)
    status: Literal["proposed"]
    evidence: UUID
    raw_value: str | None = Field(default=None, max_length=500)


class TextEvent(Strict):
    event_id: UUID
    sequence: Annotated[int, Field(strict=True, ge=1)]
    kind: Literal["created", "client_transcript", "tool", "provider_attempt", "provider_usage",
        "customer_text_result", "finalized"]
    # Private owned event payload; render only whitelisted plain-text fields in UI.
    data: dict[str, Any]


class TurnResult(Strict):
    request_id: UUID
    status: Literal["running", "interrupted", "failed", "succeeded"]
    failure_code: str | None = Field(default=None, min_length=1, max_length=80)
    provider_replayed: Literal[False] | None = None
    reply: str | None = Field(default=None, min_length=1, max_length=4000)

    @model_validator(mode="after")
    def result_shape(self):
        if ((self.status == "succeeded" and (not self.reply or self.failure_code))
                or (self.status != "succeeded" and self.reply is not None)
                or (self.status == "failed" and not self.failure_code)):
            raise ValueError("invalid_text_result")
        return self


class SessionView(Strict):
    conversation_id: UUID
    creation_id: UUID
    state: Literal["created", "finalized"]
    need_revision: Revision
    need: dict[NeedField, NeedValue]
    events: Annotated[list[TextEvent], Field(max_length=100)]
    history_truncated: bool
    transport: Literal["customer-text.v1"]
    model: Literal["gpt-6-luna"]
    scope: Literal["local_authenticated_test"]
    channel_activation: Literal["not_performed"]
    calibration_status: Literal["UNVERIFIED"]
    turn: TurnResult | None = None


class Capability(Strict):
    creation_id: UUID
    admission_id: UUID
    transport: Literal["customer-text.v1"]
    model: Literal["gpt-6-luna"]
    scope: Literal["local_authenticated_test"]
    can_start_text_session: Literal[True]
    can_call_provider: Literal[True]
    consent_required: Literal[True]
    notice_version: Literal["customer-text.local.v1"]
    need_fields: Annotated[list[NeedField], Field(min_length=5, max_length=5)]
    channel_activation: Literal["not_performed"]
    calibration_status: Literal["UNVERIFIED"]


class Envelope(Strict):
    contract_version: Literal["customer-text.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: SessionView


class CapabilityEnvelope(Envelope):
    data: Capability


class Error(Strict):
    code: str
    message: str
    request_id: UUID
