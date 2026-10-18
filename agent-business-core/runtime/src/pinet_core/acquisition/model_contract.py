"""Explicit current-owner model work; never reinterpret synthetic capture rights."""
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..contracts import Strict
from ..customer_agents.wire import Revision
from .agent_role_contract import RoleName
from .contracts import Campaign, Prospect
from .correspondence import recipient_hash
from .model_schema import ADAPTER as ADAPTER
from .model_schema import EFFORT as EFFORT
from .model_schema import KIND as KIND
from .model_schema import MODEL as MODEL
from .module_admin import Authority, Digest

Purpose = Literal["customer_research", "email"]
Role = Literal["researcher", "writer", "reviewer"]
ROLES = ("researcher", "writer", "reviewer")
Usage = Annotated[int, Field(strict=True, ge=0, le=1_000_000_000)]
REPLY_KIND = "acquisition.model_reply"
REPLY_ADAPTER = "acquisition-model-reply.v1"


class NativePair(Strict):
    research_authorization_id: UUID
    research_fingerprint: Digest
    email_authorization_id: UUID
    email_fingerprint: Digest

    @model_validator(mode="after")
    def distinct(self):
        if self.research_authorization_id == self.email_authorization_id:
            raise ValueError("distinct_native_agents_required")
        return self


class ResearchHandoff(Strict):
    task_id: UUID
    run_id: UUID
    output_sha256: Digest


class CalibrationReference(Strict):
    manifest_path: str = Field(min_length=1, max_length=1024)
    manifest_sha256: Digest
    case_id: str = Field(pattern=r"^[a-z0-9-]{1,120}$")


class ApproveModel(Authority):
    authorization_id: UUID
    agent_id: UUID
    expected_config_revision: Revision
    expected_config_sha256: Digest
    expected_module_fingerprint: Digest
    model_execution_authorized: bool = Field(strict=True)
    maximum_attempts: int = Field(strict=True, ge=1, le=30)
    duration_seconds: int = Field(strict=True, ge=30, le=3600)
    execution_role: RoleName | None = Field(default=None, exclude_if=lambda v: v is None)

    @model_validator(mode="after")
    def explicit_paid_authority(self):
        if self.model_execution_authorized is not True:
            raise ValueError("explicit_model_authorization_required")
        return self


class StopModel(Authority):
    authorization_id: UUID
    expected_fingerprint: Digest


class PrepareModel(Strict):
    request_id: UUID
    authorization_id: UUID
    recipient: str = Field(min_length=1, max_length=80)
    campaign: Campaign
    prospect: Prospect
    stage: Literal["research", "email"] | None = Field(default=None, exclude_if=lambda v: v is None)
    native: NativePair | None = Field(default=None, exclude_if=lambda v: v is None)
    handoff: ResearchHandoff | None = Field(default=None, exclude_if=lambda v: v is None)
    calibration: CalibrationReference | None = Field(default=None, exclude_if=lambda v: v is None)

    @model_validator(mode="after")
    def bounded(self):
        if self.stage is None:
            if self.native is not None or self.handoff is not None or self.calibration is not None:
                raise ValueError("native_stage_required")
        elif self.native is None or (
            self.stage == "research" and (self.handoff is not None or self.campaign.mode != "research_only"
                or self.authorization_id != self.native.research_authorization_id)
        ) or (self.stage == "email" and (self.handoff is None or self.campaign.mode != "draft_only"
                or self.authorization_id != self.native.email_authorization_id)):
            raise ValueError("exact_native_stage_required")
        recipient_hash(self.recipient)
        if self.campaign.mode not in {"research_only", "draft_only"}:
            raise ValueError("preparation_only")
        if self.campaign.site_id != self.prospect.site_id:
            raise ValueError("foreign_prospect")
        if self.campaign.max_model_calls < 1:
            raise ValueError("model_campaign_budget_empty")
        if len(self.model_dump_json().encode()) > 65536:
            raise ValueError("model_task_input_too_large")
        return self


class ReplyRequest(Strict):
    request_id: UUID
    authorization_id: UUID
    native: NativePair
    prepare_task_id: UUID
    thread_id: UUID
    inbound_id: UUID
    revision: int = Field(strict=True, ge=1)
    input_sha256: Digest
    calibration: CalibrationReference | None = Field(default=None, exclude_if=lambda v: v is None)

    @model_validator(mode="after")
    def email_owner(self):
        if self.authorization_id != self.native.email_authorization_id:
            raise ValueError("email_authorization_required")
        return self


class ReplyInput(ReplyRequest):
    stage: Literal["reply"] = "reply"
    recipient: str
    campaign: Campaign
    prospect: Prospect


def observed_usage(value):
    if not isinstance(value, dict):
        return None
    saved = {key: number for key, number in value.items() if key in {
        "input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"}
        and type(number) is int and 0 <= number <= 1_000_000_000}
    return saved or None


def next_role(previous, role, stage=None):
    """A non-fitting qualification may skip writer; no failed/pending replay."""
    if role not in (*ROLES, "reply_coordinator") or any(row["state"] != "succeeded" for row in previous):
        return False
    names = [row["role"] for row in previous]
    if stage in {"research", "email", "reply"}:
        first = {"research": "researcher", "email": "writer", "reply": "reply_coordinator"}[stage]
        return (names == [] and role == first) or (names == [first] and role == "reviewer")
    return ((names == [] and role == "researcher")
        or (names == ["researcher"] and role in {"writer", "reviewer"})
        or (names == ["researcher", "writer"] and role == "reviewer"))
