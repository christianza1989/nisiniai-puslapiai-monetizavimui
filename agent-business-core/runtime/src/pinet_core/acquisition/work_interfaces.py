"""Separate work wire; the deployed capture/projection v1 shapes remain unchanged."""

import re
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, Field, field_validator

from ..conversation_mail import valid_message_id
from .interfaces import NoExternalSend, OpaqueId, Scope, Wire


def synthetic_local_part(value):
    if ".." in value or value.split("@")[0].endswith("."):
        raise ValueError("synthetic_address_invalid")
    return value


# The same type validates native inbound and the correspondence identity key.
# This reserved namespace grants no real recipient or transport authority.
SyntheticAddress = Annotated[str, Field(strict=True, max_length=254,
    pattern=r"^[a-z0-9][a-z0-9._+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*example\.test$"),
    AfterValidator(synthetic_local_part)]
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class InboundCapture(NoExternalSend):
    work_version: Literal["acquisition-work.v1"] = "acquisition-work.v1"
    scope: Scope
    adapter_id: OpaqueId
    request_id: UUID
    thread_id: OpaqueId
    parent_mail_id: OpaqueId
    message_id: str = Field(max_length=250)
    in_reply_to: str = Field(max_length=250)
    references: tuple[str, ...] = Field(default=(), max_length=20)
    sender: SyntheticAddress
    recipient: Literal["info@pinet.lt"]
    subject: str = Field(max_length=200)
    body: str = Field(min_length=1, max_length=16000)

    @field_validator("message_id", "in_reply_to")
    @classmethod
    def message_identity(cls, value):
        if not valid_message_id(value):
            raise ValueError("mail_identity_invalid")
        return value

    @field_validator("references")
    @classmethod
    def reference_identity(cls, value):
        if any(not valid_message_id(item) for item in value) or len(value) != len(set(value)):
            raise ValueError("mail_references_invalid")
        return value

    @field_validator("subject")
    @classmethod
    def header_text(cls, value):
        if re.search(r"[\x00-\x1f\x7f]", value):
            raise ValueError("mail_header_invalid")
        return value


class CorrespondenceReceipt(NoExternalSend):
    work_version: Literal["acquisition-work.v1"] = "acquisition-work.v1"
    thread_id: OpaqueId
    case_id: OpaqueId
    mail_id: OpaqueId
    revision: int = Field(ge=1)
    state: Literal["captured", "held", "blocked", "stop", "hold", "privacy_handoff", "reply_ready"]
    marketing_state: Literal["active", "hold", "stopped"]
    handoff_executed: bool = False
    reasons: tuple[str, ...] = ()


class WorkCounts(Wire):
    outbound_captured: int = Field(ge=0)
    inbound_captured: int = Field(ge=0)
    held_recipients: int = Field(ge=0)
    stopped_recipients: int = Field(ge=0)
    operator_privacy_cases: int = Field(ge=0)


class WorkWatermark(Wire):
    committed_receipts: int = Field(ge=0)
    sha256: Digest


class ThreadSummary(Wire):
    thread_id: OpaqueId
    case_id: OpaqueId
    revision: int = Field(ge=1)
    last_inbound_id: OpaqueId | None


class WorkSnapshot(NoExternalSend):
    work_version: Literal["acquisition-work.v1"] = "acquisition-work.v1"
    scope: Scope
    adapter_id: OpaqueId
    observed_at: AwareDatetime
    time_basis: Literal["all_time"] = "all_time"
    synthetic: Literal[True] = True
    # Only module configuration status; dispatch separately verifies current
    # approving identity/grants/policy/source/TTL after waiting for locks.
    marketing_configuration: Literal["configured", "stopped", "expired", "pending", "source_changed"]
    counts: WorkCounts
    watermark: WorkWatermark
    threads: tuple[ThreadSummary, ...] = Field(max_length=100)
    truncated: bool
