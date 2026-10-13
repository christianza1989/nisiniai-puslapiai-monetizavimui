"""Discovery conversation/report, separate from publication and channel grants."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..creation.renderer import PublicSourceURL
from ..creation.wire import Strict

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Area = Literal["business", "customers", "acquisition", "fulfilment", "economics",
               "website", "content_seo_geo", "brand", "agents", "risks"]
AREAS = set(Area.__args__)
Status = Literal["queued", "running", "needs_input", "plan_ready", "failed", "cancelled", "archived", "build_started"]


class Start(Strict):
    portfolio_id: UUID
    message: str = Field(min_length=1, max_length=2500)
    idempotency_key: UUID

    @field_validator("message")
    @classmethod
    def meaningful(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Meaningful customer text required")
        return value


class Message(Strict):
    base_revision: int = Field(strict=True, ge=0)
    message: str = Field(min_length=1, max_length=2500)
    idempotency_key: UUID

    _message = field_validator("message")(Start.meaningful)


class Approve(Strict):
    report_revision: int = Field(strict=True, ge=1)
    report_sha256: Digest
    idempotency_key: UUID


class Archive(Strict):
    idempotency_key: UUID


class Question(Strict):
    id: str = Field(pattern=r"^q_[a-z0-9_-]{1,50}$")
    question: str = Field(min_length=5, max_length=500)
    reason: str = Field(min_length=10, max_length=500)
    required_for_build: bool = Field(strict=True)
    suggestions: list[str] = Field(max_length=5)


class Section(Strict):
    area: Area
    title: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=20, max_length=1800)
    decisions: list[str] = Field(min_length=1, max_length=12)
    unknowns: list[str] = Field(max_length=12)


class SourceEvidence(Strict):
    url: PublicSourceURL = Field(max_length=1024)
    title: str = Field(min_length=1, max_length=180)
    finding: str = Field(min_length=10, max_length=1200)
    status: Literal["candidate", "client_provided", "model_read_claim", "conflict"]
    independent_verification: Literal["UNVERIFIED"]

    @field_validator("url")
    @classmethod
    def public_source(cls, value):
        from ..public_projects.projection import public_url
        return public_url(value)


class Channel(Strict):
    name: str = Field(min_length=1, max_length=120)
    buyer_segment: str = Field(min_length=5, max_length=500)
    buying_signal: str = Field(min_length=10, max_length=700)
    source_or_discovery_method: str = Field(min_length=10, max_length=1000)
    useful_offer: str = Field(min_length=10, max_length=700)
    experiment: str = Field(min_length=10, max_length=1000)
    economics_or_unknowns: str = Field(min_length=10, max_length=700)
    rights_and_admission: str = Field(min_length=10, max_length=700)
    stop_rule: str = Field(min_length=10, max_length=700)
    activation: Literal["not_performed"]


class Tool(Strict):
    name: str = Field(min_length=1, max_length=160)
    purpose: str = Field(min_length=10, max_length=700)
    capability_key: str = Field(min_length=1, max_length=100)
    access: Literal["available", "unavailable", "planned"]
    coverage: str = Field(min_length=10, max_length=1000)
    cost_or_unknowns: str = Field(min_length=10, max_length=700)
    alternative: str = Field(min_length=10, max_length=700)
    admission: str = Field(min_length=10, max_length=700)


class Deliverable(Strict):
    id: str = Field(pattern=r"^d_[a-z0-9_-]{1,64}$")
    title: str = Field(min_length=3, max_length=180)
    purpose: str = Field(min_length=10, max_length=1000)
    depends_on: list[str] = Field(max_length=30)
    acceptance: list[str] = Field(min_length=1, max_length=12)


class Plan(Strict):
    business_name: str = Field(min_length=1, max_length=100)
    summary: str = Field(min_length=30, max_length=2500)
    canonical_host_candidate: str | None = Field(max_length=253)
    domain_authority: Literal["UNVERIFIED"]
    sections: list[Section] = Field(min_length=10, max_length=10)
    acquisition_channels: list[Channel] = Field(min_length=1, max_length=20)
    tools: list[Tool] = Field(min_length=1, max_length=30)
    sources: list[SourceEvidence] = Field(max_length=60)
    deliverables: list[Deliverable] = Field(min_length=1, max_length=100)
    alternatives: list[str] = Field(min_length=1, max_length=12)
    publication_blockers: list[str] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def complete_and_acyclic(self):
        if {item.area for item in self.sections} != AREAS:
            raise ValueError("Cover all business decisions without duplicate areas")
        seen = set()
        for item in self.deliverables:
            if item.id in seen or any(key not in seen for key in item.depends_on):
                raise ValueError("Use unique deliverable identities and earlier real dependencies")
            seen.add(item.id)
        if self.canonical_host_candidate:
            from ..creation.wire import Start as CreationStart
            CreationStart(portfolio_id=UUID(int=1), idempotency_key=UUID(int=2),
                          display_name=self.business_name, idea=self.summary,
                          canonical_host=self.canonical_host_candidate)
        return self


class Reply(Strict):
    assistant_message: str = Field(min_length=10, max_length=4000)
    state: Literal["needs_input", "plan_ready"]
    questions: list[Question] = Field(max_length=5)
    plan: Plan | None

    @model_validator(mode="after")
    def readiness(self):
        if self.state == "plan_ready" and (
                self.plan is None or any(q.required_for_build for q in self.questions)):
            raise ValueError("Ready plans require a complete report and no unanswered required question")
        if self.state == "needs_input" and not self.questions:
            raise ValueError("A waiting conversation must ask useful questions")
        if len({q.id for q in self.questions}) != len(self.questions):
            raise ValueError("Question identities must be unique")
        return self


class PlanReview(Strict):
    candidate_sha256: Digest
    approved: bool = Field(strict=True)
    summary: str = Field(min_length=10, max_length=1200)
    required_changes: list[str] = Field(max_length=12)
    suggestions: list[str] = Field(max_length=12)

    @model_validator(mode="after")
    def decision(self):
        if self.approved and self.required_changes:
            raise ValueError("Approved plans cannot retain required changes")
        if not self.approved and not self.required_changes:
            raise ValueError("Rejection must identify concrete changes")
        return self


class DiscoveryView(Strict):
    discovery_id: UUID
    portfolio_id: UUID
    title: str
    initial_message: str
    status: Status
    current_revision: int = Field(ge=0)
    active_job_id: UUID | None
    linked_creation_id: UUID | None
    latest_report_sha256: Digest | None
    source_revision: Source
    failure_code: str | None
    created_at: datetime
    updated_at: datetime
    can_message: bool
    can_build: bool
    foundation_status: Literal["UNVERIFIED"]
    can_create_agents: Literal[False]
    can_open_designer: Literal[False]
    channel_activation: Literal["not_performed"]
    launch_status: Literal["UNVERIFIED"]


class ReportView(Strict):
    discovery_id: UUID
    revision: int = Field(ge=1)
    report_sha256: Digest
    source_revision: Source
    created_at: datetime
    reply: Reply
    reviews: list[PlanReview] = Field(max_length=2)


class ArchiveView(Strict):
    creation_id: UUID
    archived_at: datetime
    history_preserved: Literal[True]
    provider_calls: Literal[0]


class BuildResult(Strict):
    discovery: DiscoveryView
    creation_id: UUID
    report_revision: int = Field(ge=1)
    report_sha256: Digest
    approval_id: UUID


class ArchivedDiscovery(Strict):
    discovery: DiscoveryView
    history_preserved: Literal[True]
    provider_calls: Literal[0]


class MessageItem(Strict):
    message_id: UUID
    role: Literal["user", "assistant"]
    content: str
    revision: int = Field(ge=0)
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    created_at: datetime


class History(Strict):
    items: list[MessageItem] = Field(max_length=100)
    offset: int = Field(ge=0)
    limit: int = Field(ge=1, le=50)
    has_more: bool


class JobView(Strict):
    job_id: UUID
    sequence: int = Field(ge=1)
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    base_revision: int = Field(ge=0)
    failure_code: str | None
    source_revision: Source
    instruction_hash: Digest | None
    finished_at: datetime | None


class AttemptView(Strict):
    attempt_id: UUID
    job_id: UUID
    sequence: int = Field(ge=1, le=6)
    role: Literal["creator", "critic", "coordinator"]
    state: Literal["reserved", "succeeded", "failed", "interrupted"]
    round_number: int = Field(ge=1, le=2)
    model: Literal["gpt-6-luna", "gpt-6.1-sol"]
    source_revision: Source
    instruction_hash: Digest
    created_at: datetime


class SourceRead(Strict):
    url: str
    status: Literal["observed", "unavailable"]
    http_status: int | None
    observed_at: datetime | None
    title: str | None
    body_sha256: Digest | None
    text_sha256: Digest | None
    response_bytes: int | None
    error: str | None


class Execution(Strict):
    jobs: list[JobView] = Field(max_length=20)
    attempts: list[AttemptView] = Field(max_length=120)
    source_reads: list[SourceRead] = Field(max_length=2000)
    cost_status: Literal["UNVERIFIED"]
    channel_activation: Literal["not_performed"]
