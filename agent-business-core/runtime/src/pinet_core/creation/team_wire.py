"""Separate team.v1 sidecar: historical creation.v1 DTOs remain byte-compatible."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from .language_mode import LanguageReviewMode
from .wire import Strict

Role = Literal["creator", "critic", "coordinator"]
Digest = str


class CheckView(Strict):
    id: str = Field(pattern=r"^r_[a-z0-9][a-z0-9_-]{0,63}$")
    draft_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    kind: Literal["language_quality", "source", "browser", "seo_geo", "media", "contact_delivery", "publication", "launch", "demand"]
    status: Literal["PASS", "FAIL", "UNVERIFIED", "NA"]
    observed: bool
    summary: str = Field(min_length=10, max_length=700)


class FindingView(Strict):
    id: str
    severity: Literal["blocker", "required", "suggestion"]
    area: str
    explanation: str = Field(max_length=700)
    correction: str = Field(max_length=700)
    evidence_refs: list[str] = Field(max_length=6)


class TokenUsage(Strict):
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    cached_input_tokens: int | None = Field(default=None, ge=0)
    reasoning_output_tokens: int | None = Field(default=None, ge=0)


class EventData(Strict):
    language_review_mode: LanguageReviewMode = "required"
    candidate_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    critic_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    decision: Literal["accept_draft", "revise", "blocked"] | None = None
    findings: list[FindingView] = Field(default_factory=list, max_length=12)
    checks: list[CheckView] = Field(default_factory=list, max_length=9)
    next_actions: list[str] = Field(default_factory=list, max_length=5)
    failure_code: str | None = Field(default=None, pattern=r"^[a-z_]{1,64}$")
    usage: TokenUsage | None = None
    web_search_count: int | None = Field(default=None, ge=0, le=6)
    cost_microusd: int | None = None


class AttemptView(Strict):
    model_config = {**Strict.model_config, "json_schema_extra": {"allOf": [
        {"if": {"properties": {"role": {"const": "creator"}}},
         "then": {"properties": {"model": {"const": "gpt-6-luna"}}}}
    ]}}
    attempt_id: UUID
    job_id: UUID
    sequence: int = Field(ge=1, le=6)
    role: Role
    round_number: int = Field(ge=1, le=2)
    stage: Literal["private_draft"]
    state: Literal["reserved", "succeeded", "failed", "interrupted"]
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    instruction_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    model: Literal["gpt-6-luna", "gpt-6.1-sol"]
    created_at: datetime

    @model_validator(mode="after")
    def model_matches_role(self):
        if self.role == "creator" and self.model != "gpt-6-luna":
            raise ValueError("Creator model must remain Luna")
        return self


class TeamEventView(Strict):
    event_id: UUID
    sequence: int = Field(ge=1)
    job_id: UUID
    attempt_id: UUID
    role: Role
    round_number: int = Field(ge=1, le=2)
    stage: Literal["private_draft"]
    state: Literal["reserved", "succeeded", "failed"]
    summary: str = Field(min_length=10, max_length=900)
    created_at: datetime
    data: EventData


class TeamView(Strict):
    creation_id: UUID
    status: Literal["queued", "running", "draft_ready", "needs_review", "failed", "cancelled"]
    scope: Literal["private_business_and_website_draft"]
    current_revision: int | None
    active_job_id: UUID | None
    latest_job_id: UUID | None
    creation_updated_at: datetime
    accepted_candidate_sha256: str | None = Field(pattern=r"^[a-f0-9]{64}$")
    max_rounds: Literal[2]
    max_calls_per_job: Literal[6]
    deadline_seconds: int = Field(ge=30, le=300)
    full_f1_status: Literal["UNVERIFIED"]
    launch_status: Literal["UNVERIFIED"]
    attempts: list[AttemptView] = Field(max_length=120)
    events: list[TeamEventView] = Field(max_length=300)
