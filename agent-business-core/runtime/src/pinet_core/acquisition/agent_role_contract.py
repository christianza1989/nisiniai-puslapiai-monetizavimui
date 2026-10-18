"""Exact six-saved-agent work on the common Task/Run and model-attempt ledger."""

from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..contracts import Strict
from .contracts import Assessment, Campaign, Prospect, Review
from .correspondence import recipient_hash
from .dialogue import ReplyDecision

KIND = "acquisition.agent_role"
ADAPTER = "acquisition-agent-role.v1"
ROLES = ("research", "qualification", "writer", "reply", "quality", "coordinator")
RoleName = Literal["research", "qualification", "writer", "reply", "quality", "coordinator"]
PURPOSE = {
    "research": "customer_research",
    "qualification": "customer_research",
    "writer": "email",
    "reply": "email",
    "quality": "custom",
    "coordinator": "custom",
}


class RoleBinding(Strict):
    authorization_id: UUID
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")


class NativeTeam(Strict):
    research: RoleBinding
    qualification: RoleBinding
    writer: RoleBinding
    reply: RoleBinding
    quality: RoleBinding
    coordinator: RoleBinding

    @model_validator(mode="after")
    def distinct(self):
        if len({getattr(self, role).authorization_id for role in ROLES}) != 6:
            raise ValueError("six_distinct_authorizations_required")
        return self


class ParentReceipt(Strict):
    role: RoleName
    task_id: UUID
    run_id: UUID
    output_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class ObservedBinding(Strict):
    id: UUID
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    agent_id: UUID
    config_id: UUID
    config_revision: int = Field(strict=True, ge=1)
    config_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    execution_role: RoleName


class ObservedTeam(Strict):
    research: ObservedBinding
    qualification: ObservedBinding
    writer: ObservedBinding
    reply: ObservedBinding
    quality: ObservedBinding
    coordinator: ObservedBinding

    @model_validator(mode="after")
    def exact_six_configs(self):
        if len({getattr(self, role).agent_id for role in ROLES}) != 6 or any(
            getattr(self, role).execution_role != role for role in ROLES
        ):
            raise ValueError("six_distinct_saved_agent_configs_required")
        return self


class MailContext(Strict):
    thread_id: UUID
    inbound_id: UUID
    revision: int = Field(strict=True, ge=1)
    input_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class RoleCalibration(Strict):
    manifest_path: str = Field(min_length=1, max_length=1024)
    manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    case_id: str = Field(pattern=r"^[a-z0-9-]{1,120}$")
    recipient_namespace: UUID | None = Field(default=None, exclude_if=lambda value: value is None)


class RoleRequest(Strict):
    version: Literal["acquisition-agent-role.v1"] = "acquisition-agent-role.v1"
    request_id: UUID
    authorization_id: UUID
    role: RoleName
    team: NativeTeam
    campaign: Campaign
    prospect: Prospect
    recipient: str = Field(min_length=1, max_length=80)
    job_text: str = Field(min_length=1, max_length=3000)
    parents: tuple[ParentReceipt, ...] = Field(default=(), max_length=6)
    mail: MailContext | None = None
    calibration: RoleCalibration | None = None

    @model_validator(mode="after")
    def exact_role(self):
        if self.authorization_id != getattr(self.team, self.role).authorization_id:
            raise ValueError("exact_role_authorization_required")
        if self.campaign.site_id != self.prospect.site_id or self.campaign.max_model_calls < 1:
            raise ValueError("exact_bounded_campaign_required")
        if len({p.task_id for p in self.parents}) != len(self.parents):
            raise ValueError("distinct_parent_receipts_required")
        expected = {
            "research": {"coordinator"},
            "qualification": {"research"},
            "writer": {"qualification"},
            "quality": {"writer", "reply"},
            "reply": {"quality"},
        }
        if self.role == "coordinator":
            if self.parents and (len(self.parents) != 1 or self.parents[0].role != "quality"):
                raise ValueError("coordinator_current_quality_parent_required")
        elif len(self.parents) != 1 or self.parents[0].role not in expected[self.role]:
            raise ValueError("exact_role_parent_required")
        if (self.role == "reply") != (self.mail is not None):
            raise ValueError("reply_requires_exact_inbound_context")
        recipient_hash(self.recipient)
        if len(self.model_dump_json().encode()) > 65536:
            raise ValueError("bounded_agent_role_request_required")
        return self

    @property
    def native(self):
        # Compatibility with the common handler's legacy pair-proof cache only.
        # The six-agent handler performs its own fresh team proof on every phase.
        return None


class Qualification(Strict):
    fit: Literal["yes", "no", "unknown"]
    intent: Literal["explicit", "possible", "none", "unknown"]
    eligible_for_draft: bool = Field(strict=True)
    evidence_ids: list[str] = Field(max_length=40)
    reason: str = Field(min_length=3, max_length=1500)


class ArtifactReview(Review):
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class RouteDecision(Strict):
    action: Literal["route", "stop", "human_handoff"]
    next_role: RoleName | None
    reason: str = Field(min_length=3, max_length=1200)

    @model_validator(mode="after")
    def routing_only(self):
        if (self.action == "route") != (self.next_role is not None) or self.next_role == "coordinator":
            raise ValueError("bounded_role_route_required")
        return self


OUTPUT = {
    "research": Assessment,
    "qualification": Qualification,
    "writer": Assessment,
    "reply": ReplyDecision,
    "quality": ArtifactReview,
    "coordinator": RouteDecision,
}


def parse_request(value):
    # Existing synthetic v1 stays byte-compatible; evidence is a strict separate
    # shape, never a nullable recipient added to the correspondence contract.
    from .evidence_contract import VERSION, EvidenceRequest

    version = value.get("version") if isinstance(value, dict) else getattr(value, "version", None)
    return (EvidenceRequest if version == VERSION else RoleRequest).model_validate(value)
