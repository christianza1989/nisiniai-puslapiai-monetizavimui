"""Explicit current-owner model work; never reinterpret synthetic capture rights."""
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..contracts import Strict
from ..customer_agents.wire import Revision
from .contracts import Campaign, Prospect
from .correspondence import recipient_hash
from .module_admin import Authority, Digest

KIND = "acquisition.model_prepare"
MODEL, EFFORT = "gpt-6.1-sol", "high"
ADAPTER = "acquisition-model-prepare.v1"
Purpose = Literal["customer_research", "email"]
Role = Literal["researcher", "writer", "reviewer"]
ROLES = ("researcher", "writer", "reviewer")
Usage = Annotated[int, Field(strict=True, ge=0, le=1_000_000_000)]


class ApproveModel(Authority):
    authorization_id: UUID
    agent_id: UUID
    expected_config_revision: Revision
    expected_config_sha256: Digest
    expected_module_fingerprint: Digest
    model_execution_authorized: bool = Field(strict=True)
    maximum_attempts: int = Field(strict=True, ge=1, le=30)
    duration_seconds: int = Field(strict=True, ge=30, le=3600)

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

    @model_validator(mode="after")
    def bounded(self):
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


def observed_usage(value):
    if not isinstance(value, dict):
        return None
    saved = {key: number for key, number in value.items() if key in {
        "input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"}
        and type(number) is int and 0 <= number <= 1_000_000_000}
    return saved or None


def next_role(previous, role):
    """A non-fitting qualification may skip writer; no failed/pending replay."""
    if role not in ROLES or any(row["state"] != "succeeded" for row in previous):
        return False
    names = [row["role"] for row in previous]
    return ((names == [] and role == "researcher")
        or (names == ["researcher"] and role in {"writer", "reviewer"})
        or (names == ["researcher", "writer"] and role == "reviewer"))
