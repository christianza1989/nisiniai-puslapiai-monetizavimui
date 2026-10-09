from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class KnowledgePage(Strict):
    id: str = Field(max_length=100)
    title: str = Field(max_length=300)
    url: str = Field(max_length=600)
    text: str = Field(max_length=18000)
    revision_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    projection_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class Knowledge(Strict):
    site_id: str
    canonical_host: str
    contact_email: EmailStr
    operator: str
    deployment_id: str = Field(max_length=100)
    generated_at: str
    pages: list[KnowledgePage] = Field(max_length=30)


class Start(Strict):
    request_id: UUID = Field(default_factory=uuid4)
    knowledge: Knowledge
    notice_version: str = Field(max_length=80)
    consent: Literal[True]
    mode: Literal["voice", "voice_pilot", "chat", "simulation"] = "voice"
    remember: bool = False
    memory_token: str | None = Field(default=None, max_length=100)


class NeedPatch(Strict):
    base_revision: int = Field(ge=0)
    fields: dict[str, str] = Field(max_length=20)
    evidence_event_id: str
    confirmed: bool = False

    @field_validator("fields")
    @classmethod
    def allowed_fields(cls, value):
        from .profiles import PROFILES
        allowed = set().union(*(p.need_fields for p in PROFILES.values()))
        if set(value) - allowed or any(len(v) > 500 for v in value.values()):
            raise ValueError("unsupported need field")
        return value


class ContactInput(Strict):
    channel: Literal["email", "phone"]
    value: str = Field(min_length=3, max_length=254)
    purpose: Literal["followup"] = "followup"
    consent: Literal[True]
    notice_version: str = Field(max_length=80)
    base_revision: int | None = Field(default=None, ge=1, strict=True)

    @field_validator("value")
    @classmethod
    def no_controls(cls, value):
        if any(ord(c) < 32 for c in value):
            raise ValueError("invalid contact")
        return value.strip()


class MemoryRecall(Strict):
    query: str = Field(default="", max_length=500)
    before_event_id: UUID | None = None


class KnowledgeQuery(Strict):
    query: str = Field(min_length=1, max_length=500)


class KnowledgeRevocation(Strict):
    base_revision: int = Field(ge=1)
    revision_hashes: list[str] = Field(min_length=1, max_length=30)
    reason: str = Field(min_length=3, max_length=300)

    @field_validator("revision_hashes")
    @classmethod
    def valid_hashes(cls, value):
        import re
        if any(not re.fullmatch(r"[a-f0-9]{64}", item) for item in value):
            raise ValueError("invalid revision hash")
        return list(dict.fromkeys(value))


class WorkerEvent(Strict):
    epoch: int
    event_key: str = Field(min_length=1, max_length=150)
    kind: Literal["client_transcript", "agent_transcript", "interrupted", "connected", "coverage_gap"]
    text: str = Field(default="", max_length=6000)


class ToolCall(Strict):
    epoch: int
    call_id: str = Field(min_length=1, max_length=150)
    name: Literal["knowledge.resolve", "need.patch", "ui.open_contact_form", "memory.recall"]
    arguments: dict


class Analysis(Strict):
    summary: str = Field(max_length=2000)
    requested_next_step: str = Field(max_length=1000)
    missing_information: list[str] = Field(max_length=12)
    evidence_event_ids: list[str] = Field(max_length=40)
    subject: str = Field(max_length=180)
    body: str = Field(max_length=6000)


class Quality(Strict):
    outcome: Literal["needs_review", "helpful", "incomplete", "no_interaction"]
    issues: list[str] = Field(max_length=15)
    evidence_event_ids: list[str] = Field(max_length=40)
    improvement_hint: str = Field(max_length=1000)
    root_cause: Literal["communication", "knowledge", "tool", "transport", "transcription", "unknown"] = "unknown"
    suggested_scope: Literal["clarification", "turn_taking", "contact_invitation"] | None = None


class Candidate(Strict):
    parent_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    instruction: str = Field(min_length=10, max_length=1000)
    issue_artifact_id: str
    scope: Literal["clarification", "turn_taking", "contact_invitation"]


ToolName = Literal["knowledge.resolve", "need.patch", "ui.open_contact_form", "memory.recall"]


class Policy(Strict):
    enabled: bool = False
    jev_enabled: bool = False
    paused: bool = False
    allowed_tools: list[ToolName] = Field(default_factory=lambda: [
        "knowledge.resolve", "need.patch", "ui.open_contact_form", "memory.recall"], max_length=4)
    followup_enabled: bool = False
    max_sessions: int = Field(default=3, ge=1, le=100)
    daily_reserved_seconds: int = Field(default=7200, ge=0, le=8640000)
    daily_budget_microusd: int = Field(default=0, ge=0, le=10000000000)

    @field_validator("allowed_tools")
    @classmethod
    def unique_tools(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("duplicate tool")
        return value


class PolicyUpdate(Strict):
    base_revision: int = Field(ge=0)
    policy: Policy
    reason: str = Field(min_length=3, max_length=300)


class RoutingUpdate(Strict):
    base_revision: int = Field(ge=0)
    enabled: bool


class UsageReceipt(Strict):
    epoch: int = Field(ge=1)
    report_id: UUID
    total_microusd: int = Field(ge=0, le=10000000000, strict=True)
    accounting_basis: Literal["provider_estimate"] = "provider_estimate"
    rate_card_version: Literal["google-standard-2026-09-30"] = "google-standard-2026-09-30"
