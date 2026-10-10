from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..creation.review import CoordinatorDecision, CriticReview, Digest, EvidenceReceipt
from ..creation.team_wire import TokenUsage


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


PageId = Annotated[str, Field(pattern=r"^page-[a-f0-9]{24}$")]
Status = Literal["queued", "running", "succeeded", "failed", "cancelled"]


class StartGuide(Strict):
    accepted_revision: int = Field(ge=1, le=20, strict=True)
    page_id: PageId
    idempotency_key: UUID


class NativeOutput(Strict):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=30, max_length=220)
    intent: str = Field(min_length=10, max_length=300)
    # Structural validation belongs to the maintained native V2 Node validator.
    body: list[dict] = Field(min_length=1, max_length=300)
    factChecks: list[Annotated[str, Field(min_length=1, max_length=600)]] = Field(max_length=30)


class AttemptView(Strict):
    attempt_id: UUID
    sequence: int = Field(ge=1, le=6)
    role: Literal["creator", "critic", "coordinator"]
    round_number: int = Field(ge=1, le=2)
    stage: Literal["content"]
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    instruction_sha256: Digest
    model: Literal["gpt-6-luna"]
    created_at: datetime


class EventPayload(Strict):
    output_sha256: Digest | None = None
    candidate: NativeOutput | None = None
    checks: list[EvidenceReceipt] | None = Field(default=None, min_length=9, max_length=9)
    critic: CriticReview | None = None
    coordinator: CoordinatorDecision | None = None
    usage: TokenUsage | None = None
    trace_sha256: Digest | None = None
    failure_code: str | None = Field(default=None, pattern=r"^[a-z_]{1,80}$")
    # Body and review hashes are authoritative; no provider filenames or raw traces.
    cost_microusd: Literal[None] = None


class EventView(Strict):
    event_id: UUID
    attempt_id: UUID | None
    sequence: int = Field(ge=1, le=100)
    state: Literal["queued", "reserved", "succeeded", "failed", "cancelled", "applied"]
    summary: str = Field(min_length=10, max_length=900)
    created_at: datetime
    data: EventPayload


class PageObservation(Strict):
    page_id: PageId
    revision_sha256: Digest
    state: Literal["blocked", "reviewed"]
    review_current: bool
    has_approved_revision: bool
    blocker_count: int = Field(ge=0, le=100)
    blockers: list[str] = Field(max_length=12)
    hidden_blocker_count: int = Field(ge=0, le=100)
    observed_at: datetime
    observation_scope: Literal["private_write_snapshot"] = "private_write_snapshot"


class JobView(Strict):
    job_id: UUID
    creation_id: UUID
    accepted_revision: int = Field(ge=1, le=20)
    source_sha256: Digest
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    page_id: PageId
    stage: Literal["content"] = "content"
    status: Status
    sequence: int = Field(ge=1, le=20)
    created_at: datetime
    deadline_at: datetime | None
    finished_at: datetime | None
    failure_code: str | None
    can_cancel: bool
    output_sha256: Digest | None
    applied_revision_sha256: Digest | None
    page_observation: PageObservation | None
    observation_scope: Literal["live_job"] = "live_job"
    approval: Literal["not_performed"] = "not_performed"
    source_verification: Literal["not_performed"] = "not_performed"
    media_verification: Literal["not_performed"] = "not_performed"
    full_f1_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    launch_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    attempts: list[AttemptView] = Field(max_length=6)
    events: list[EventView] = Field(max_length=100)


class JobsView(Strict):
    creation_id: UUID
    observation_scope: Literal["live_job"] = "live_job"
    items: list[JobView] = Field(max_length=20)
