"""Additive strict team contract; historical S1 owner notes remain unchanged."""
import hashlib
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..business_discovery.wire import Digest, Source
from ..creation.wire import Strict
from ..workspace_topics.wire import Anchor, AppendMessage
from .episode_types import EpisodeView

Role = Literal["coordinator", "adviser"]


class Send(Strict):
    idempotency_key: UUID
    content: str = Field(min_length=1, max_length=2500)
    reply_to_event_id: UUID | None = None
    _content = field_validator("content")(AppendMessage.clean_text.__func__)


class Cancel(Strict):
    pass  # Cancellation of the URL-bound task is repeatable; it never creates another operation.


class Participant(Strict):
    participant_id: UUID
    role: Role
    name: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=1, max_length=300)
    capability_id: Literal["workspace.consult_coordinator.v1", "workspace.business_adviser.v1"]
    availability: Literal["available", "not_admitted"]
    tools: list = Field(max_length=0)
    external_actions: Literal[False]

    @model_validator(mode="after")
    def capability_matches(self):
        if self.capability_id != ("workspace.consult_coordinator.v1" if self.role == "coordinator" else "workspace.business_adviser.v1"):
            raise ValueError("Wrong member capability")
        return self


class Roster(Strict):
    topic_id: UUID
    portfolio_id: UUID
    anchor: Anchor
    participants: list[Participant] = Field(min_length=2, max_length=2)
    roster_sha256: Digest
    can_send: bool
    blockers: list[Literal["business_anchor_required", "team_execution_disabled", "topic_archived", "topic_capacity_reached"]] = Field(max_length=4)
    max_calls_per_turn: Literal[3]
    old_notes_dispatch: Literal["never_automatic"]

    @model_validator(mode="after")
    def coherent(self):
        if (self.can_send != (not self.blockers) or len({p.participant_id for p in self.participants}) != 2
                or {p.role for p in self.participants} != {"coordinator", "adviser"}
                or any((p.availability == "available") != self.can_send for p in self.participants)):
            raise ValueError("Wrong scoped roster admission")
        return self


class PublicEvent(Strict):
    event_id: UUID
    topic_id: UUID
    task_id: UUID
    sequence: int = Field(strict=True, ge=1, le=2147483647)
    author_type: Literal["user", "coordinator", "adviser"]
    author_user_id: UUID | None
    participant_id: UUID | None
    attempt_id: UUID | None
    native_episode_task_id: UUID | None = Field(default=None, exclude_if=lambda value: value is None)
    native_workflow_intent_id: UUID | None = Field(default=None, exclude_if=lambda value: value is None)
    kind: Literal["owner_message", "assignment", "answer"]
    reply_to_event_id: UUID | None
    content: str = Field(min_length=1, max_length=8000)
    content_sha256: Digest
    source_revision: Source
    created_at: datetime
    _content = field_validator("content")(AppendMessage.clean_text.__func__)

    @model_validator(mode="after")
    def trusted_author(self):
        user = self.author_type == "user"
        native = self.native_episode_task_id is not None
        workflow = self.native_workflow_intent_id is not None
        provenance = (self.attempt_id is not None and not native and not workflow
            or native and not workflow and self.attempt_id is None
                and self.author_type == "coordinator" and self.kind == "answer" and self.native_episode_task_id == self.task_id
            or workflow and not native and self.attempt_id is None
                and self.author_type == "coordinator" and self.kind == "assignment")
        if (user != (self.author_user_id is not None) or user == (self.participant_id is not None)
                or user and (self.attempt_id is not None or native or workflow) or not user and not provenance
                or user != (self.kind == "owner_message") or self.kind == "assignment" and self.author_type != "coordinator"
                or hashlib.sha256(self.content.encode()).hexdigest() != self.content_sha256):
            raise ValueError("Wrong trusted event provenance")
        return self


class ContextReceipt(Strict):
    context_sha256: Digest
    roster_sha256: Digest
    history_cutoff: int = Field(strict=True, ge=1, le=2147483647)
    history_event_ids: list[UUID] = Field(max_length=20)
    omitted_history_events: int = Field(strict=True, ge=0)
    reply_to_event_id: UUID | None


class Turn(Strict):
    task_id: UUID
    topic_id: UUID
    sequence: int = Field(strict=True, ge=1, le=20)
    native_episode: EpisodeView | None = Field(default=None, exclude_if=lambda value: value is None)
    idempotency_key: UUID
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    created_at: datetime
    updated_at: datetime
    failure_code: str | None = Field(pattern=r"^[a-z_]{1,64}$")
    reserved_calls: int = Field(strict=True, ge=0, le=10)
    settled_calls: int = Field(strict=True, ge=0, le=10)
    usage_complete: bool
    cost_status: Literal["UNVERIFIED"]
    context_receipt: ContextReceipt | None
    started_at: datetime | None
    lease_until: datetime | None

    @model_validator(mode="after")
    def counts(self):
        native = self.native_episode
        if (native is None and self.reserved_calls > 3
                or native is not None and (self.reserved_calls, self.settled_calls, self.usage_complete) != (
                    native.reserved_calls, native.settled_calls, native.usage_complete)):
            raise ValueError("Exact native or ordinary turn accounting required")
        if self.settled_calls > self.reserved_calls or self.status == "succeeded" and (
                self.reserved_calls == 0 or self.settled_calls != self.reserved_calls):
            raise ValueError("Wrong accepted turn accounting")
        return self


class Accepted(Strict):
    turn: Turn
    event: PublicEvent

    @model_validator(mode="after")
    def exact_input(self):
        if (self.event.topic_id != self.turn.topic_id or self.event.task_id != self.turn.task_id
                or self.event.author_type != "user"):
            raise ValueError("Wrong accepted owner event")
        return self


class TeamPage(Strict):
    topic_id: UUID
    events: list[PublicEvent] = Field(max_length=50)
    turns: list[Turn] = Field(max_length=20)
    next_cursor: str | None = Field(max_length=2048)
    cutoff_sequence: int = Field(strict=True, ge=0, le=2147483647)

    @model_validator(mode="after")
    def ordered(self):
        sequences = [e.sequence for e in self.events]
        if (sequences != sorted(set(sequences)) or len({e.event_id for e in self.events}) != len(self.events)
                or any(e.topic_id != self.topic_id or e.sequence > self.cutoff_sequence for e in self.events)
                or any(t.topic_id != self.topic_id for t in self.turns)):
            raise ValueError("Wrong scoped team history")
        return self


class Envelope(Strict):
    contract_version: Literal["workspace-team.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: Source
    observed_at: datetime
    data: Roster | Accepted | Turn | TeamPage


class Error(Strict):
    code: str
    request_id: UUID
    message: str | None = Field(default=None, max_length=80, exclude_if=lambda value: value is None,
        description="Optional SafeRoute code echo. When present it must equal code; explicit null or arbitrary prose is invalid.")

    @model_validator(mode="after")
    def code_echo_only(self):
        if "message" in self.model_fields_set and self.message != self.code:
            raise ValueError("Error message must be the same public code")
        return self
