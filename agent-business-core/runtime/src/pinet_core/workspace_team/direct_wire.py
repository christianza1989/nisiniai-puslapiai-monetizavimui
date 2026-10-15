"""Independent direct-chat wire. DTOs never admit a task, tool or native preview."""
import hashlib
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..business_discovery.wire import Digest, Source
from ..creation.wire import Strict
from ..workspace_topics.wire import Anchor, AppendMessage

VERSION = "workspace-direct.v1"
Role = Literal["coordinator", "adviser"]
Mode = Literal["consultant", "agent_preview"]
Blocker = Literal["execution_disabled", "workspace_execution_binding_required", "recipient_not_current",
    "recipient_not_admitted", "preview_not_admitted", "topic_archived", "chat_archived", "chat_full",
    "schema_unavailable", "configuration_changed", "unsupported_anchor"]
Count = Annotated[int, Field(strict=True, ge=0)]


class DirectConsultant(Strict):
    kind: Literal["consultant"]
    participant_id: UUID
    role: Role
    capability_id: Literal["workspace.consult_coordinator.v1", "workspace.business_adviser.v1"]
    configuration_sha256: Digest

    @model_validator(mode="after")
    def exact_capability(self):
        expected = "workspace.consult_coordinator.v1" if self.role == "coordinator" else "workspace.business_adviser.v1"
        if self.capability_id != expected:
            raise ValueError("Exact source-fixed consultant capability required")
        return self


class DirectSavedAgent(Strict):
    kind: Literal["saved_agent"]
    creation_id: UUID
    agent_id: UUID
    revision_id: UUID
    revision: int = Field(strict=True, ge=1, le=2147483647)
    configuration_sha256: Digest


DirectRecipient = Annotated[DirectConsultant | DirectSavedAgent, Field(discriminator="kind")]


class DirectWorkspaceAnchor(Strict):
    kind: Literal["portfolio", "creation", "discovery"]
    selection_id: UUID


class DirectWorkspaceScope(Strict):
    kind: Literal["workspace"]
    portfolio_id: UUID
    parent_topic_id: UUID
    anchor: DirectWorkspaceAnchor


class DirectBusinessScope(Strict):
    kind: Literal["business"]
    portfolio_id: UUID
    parent_topic_id: UUID
    business_id: UUID
    grant_id: UUID


DirectExecutionScope = Annotated[DirectWorkspaceScope | DirectBusinessScope, Field(discriminator="kind")]


class DirectNativeState(Strict):
    configuration_state: Literal["draft"]
    calibration_status: Literal["UNVERIFIED"]
    module_admission: Literal["not_admitted"]
    channel_activation: Literal["not_performed"]
    preview_admitted: bool = Field(strict=True)


class DirectContact(Strict):
    recipient: DirectRecipient
    name: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=1, max_length=2000)
    mode: Mode
    can_create_chat: bool = Field(strict=True)
    blockers: list[Blocker] = Field(max_length=10)
    native_state: DirectNativeState | None
    execution_scope: DirectExecutionScope | None
    tools: list = Field(max_length=0)
    external_actions: Literal[False]

    @model_validator(mode="after")
    def exact_availability(self):
        native = self.recipient.kind == "saved_agent"
        if ((self.mode == "agent_preview") != native or native != (self.native_state is not None)
                or self.can_create_chat != (not self.blockers)
                or len(set(self.blockers)) != len(self.blockers)
                or self.can_create_chat and self.execution_scope is None
                or native and self.execution_scope is not None and self.execution_scope.kind != "business"
                or native and self.can_create_chat and not self.native_state.preview_admitted):
            raise ValueError("Exact recipient mode and observed readiness required")
        return self


class DirectCreate(Strict):
    idempotency_key: UUID
    mode: Mode
    recipient: DirectRecipient

    @model_validator(mode="after")
    def explicit_mode(self):
        if (self.mode == "agent_preview") != (self.recipient.kind == "saved_agent"):
            raise ValueError("Explicit matching consultant or native preview mode required")
        return self


class DirectSend(Strict):
    idempotency_key: UUID
    content: str = Field(min_length=1, max_length=2500)
    reply_to_event_id: UUID | None = None
    _content = field_validator("content")(AppendMessage.clean_text.__func__)


class DirectCancel(Strict):
    pass


class DirectChat(Strict):
    chat_id: UUID
    portfolio_id: UUID
    parent_topic_id: UUID
    anchor: Anchor
    execution_scope: DirectExecutionScope
    recipient: DirectRecipient
    mode: Mode
    native_state: DirectNativeState | None
    native_conversation_id: UUID | None
    can_send: bool = Field(strict=True)
    blockers: list[Blocker] = Field(max_length=10)
    turn_count: int = Field(strict=True, ge=0, le=20)
    turn_limit: Literal[20]
    created_at: datetime
    created_source_revision: Source
    tools: list = Field(max_length=0)
    external_actions: Literal[False]

    @model_validator(mode="after")
    def exact_scope_and_mode(self):
        native = self.recipient.kind == "saved_agent"
        if ((self.mode == "agent_preview") != native or native != (self.native_state is not None)
                or not native and self.native_conversation_id is not None
                or self.can_send != (not self.blockers) or len(set(self.blockers)) != len(self.blockers)
                or self.turn_count == self.turn_limit and "chat_full" not in self.blockers
                or native and self.can_send and not self.native_state.preview_admitted
                or self.execution_scope.portfolio_id != self.portfolio_id
                or self.execution_scope.parent_topic_id != self.parent_topic_id
                or self.execution_scope.kind == "workspace" and (
                    native or self.execution_scope.anchor.model_dump() != self.anchor.model_dump()
                    or self.anchor.kind == "portfolio" and self.anchor.selection_id != self.portfolio_id)
                or self.execution_scope.kind == "business" and self.anchor.kind == "business"
                    and self.execution_scope.business_id != self.anchor.selection_id):
            raise ValueError("Exact immutable chat target and current send eligibility required")
        return self


class DirectOwnerAuthor(Strict):
    kind: Literal["owner"]
    user_id: UUID


class DirectConsultantAuthor(Strict):
    kind: Literal["consultant"]
    participant_id: UUID
    role: Role
    attempt_id: UUID


class DirectAgentAuthor(Strict):
    kind: Literal["saved_agent"]
    agent_id: UUID
    configuration_sha256: Digest
    conversation_id: UUID
    native_event_id: UUID


class DirectEvent(Strict):
    event_id: UUID
    chat_id: UUID
    task_id: UUID
    sequence: int = Field(strict=True, ge=1, le=2147483647)
    author: Annotated[DirectOwnerAuthor | DirectConsultantAuthor | DirectAgentAuthor, Field(discriminator="kind")]
    reply_to_event_id: UUID | None
    content: str = Field(min_length=1, max_length=8000)
    content_sha256: Digest
    source_revision: Source
    created_at: datetime
    _content = field_validator("content")(AppendMessage.clean_text.__func__)

    @model_validator(mode="after")
    def exact_bytes(self):
        if hashlib.sha256(self.content.encode()).hexdigest() != self.content_sha256:
            raise ValueError("Exact persisted message bytes required")
        return self


class DirectUsage(Strict):
    reserved_calls: int = Field(strict=True, ge=0, le=3)
    settled_calls: int = Field(strict=True, ge=0, le=3)
    usage_complete: bool = Field(strict=True)
    input_tokens: Count | None
    output_tokens: Count | None
    cost_status: Literal["UNVERIFIED"]

    @model_validator(mode="after")
    def exact_counts(self):
        if self.settled_calls > self.reserved_calls:
            raise ValueError("Settled calls cannot exceed real reservations")
        return self


class DirectPreviewEvidence(Strict):
    conversation_id: UUID
    configuration_sha256: Digest
    transcript_revision: Count
    quality_state: Literal["not_requested", "running", "failed", "succeeded", "UNVERIFIED"]
    quality_current: bool = Field(strict=True)
    quality_artifact_id: UUID | None
    quality_artifact_sha256: Digest | None
    module_admission: Literal["not_admitted"]
    activation: Literal["not_performed"]

    @model_validator(mode="after")
    def exact_quality_evidence(self):
        if ((self.quality_artifact_id is None) != (self.quality_artifact_sha256 is None)
                or self.quality_current and (self.quality_state != "succeeded" or self.quality_artifact_id is None)):
            raise ValueError("Current native Quality needs its real immutable artifact")
        return self


class DirectTurn(Strict):
    task_id: UUID
    chat_id: UUID
    mode: Mode
    sequence: int = Field(strict=True, ge=1, le=20)
    idempotency_key: UUID
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    can_cancel: bool = Field(strict=True)
    failure_code: str | None = Field(pattern=r"^[a-z_]{1,80}$")
    call_limit: Literal[1, 3]
    usage: DirectUsage
    preview: DirectPreviewEvidence | None
    source_revision: Source
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def exact_execution_mode(self):
        native = self.mode == "agent_preview"
        if (self.call_limit != (3 if native else 1) or self.usage.reserved_calls > self.call_limit
                or self.can_cancel and self.status not in {"queued", "running"}
                or not native and self.preview is not None
                or self.status == "succeeded" and (self.usage.reserved_calls == 0
                    or self.usage.settled_calls != self.usage.reserved_calls)
                or native and self.status == "succeeded" and (self.preview is None
                    or self.preview.quality_state != "succeeded" or self.preview.quality_artifact_id is None)):
            raise ValueError("Exact direct/native execution and actual accounting required")
        return self


class DirectAccepted(Strict):
    chat_id: UUID
    turn: DirectTurn
    event: DirectEvent

    @model_validator(mode="after")
    def exact_owner_input(self):
        if (self.chat_id != self.turn.chat_id or self.chat_id != self.event.chat_id
                or self.turn.task_id != self.event.task_id or self.event.author.kind != "owner"):
            raise ValueError("Exact chat-bound accepted owner message required")
        return self


class DirectRecipients(Strict):
    portfolio_id: UUID
    parent_topic_id: UUID
    anchor: Anchor
    items: list[DirectContact] = Field(max_length=52)
    has_more: bool = Field(strict=True)
    next_cursor: str | None = Field(max_length=2048)

    @model_validator(mode="after")
    def exact_directory(self):
        ids = [(item.recipient.kind, item.recipient.participant_id if item.recipient.kind == "consultant" else item.recipient.agent_id)
            for item in self.items]
        if (len(set(ids)) != len(ids) or self.has_more != bool(self.next_cursor)
                or self.has_more and not self.items
                or any(item.execution_scope is not None and (
                    item.execution_scope.portfolio_id != self.portfolio_id
                    or item.execution_scope.parent_topic_id != self.parent_topic_id
                    or item.execution_scope.kind == "workspace"
                        and item.execution_scope.anchor.model_dump() != self.anchor.model_dump()) for item in self.items)):
            raise ValueError("Unique typed recipients and exact cursor state required")
        return self


class DirectChats(Strict):
    portfolio_id: UUID
    parent_topic_id: UUID
    items: list[DirectChat] = Field(max_length=50)
    next_cursor: str | None = Field(max_length=2048)

    @model_validator(mode="after")
    def exact_parent_scope(self):
        if (len({item.chat_id for item in self.items}) != len(self.items)
                or any(item.portfolio_id != self.portfolio_id or item.parent_topic_id != self.parent_topic_id for item in self.items)):
            raise ValueError("Unique chats from one exact owned parent required")
        return self


class DirectHistory(Strict):
    chat: DirectChat
    events: list[DirectEvent] = Field(max_length=50)
    turns: list[DirectTurn] = Field(max_length=20)
    cutoff_sequence: int = Field(strict=True, ge=0, le=2147483647)
    next_cursor: str | None = Field(max_length=2048)

    @model_validator(mode="after")
    def exact_chat_history(self):
        sequences = [event.sequence for event in self.events]
        if (sequences != sorted(set(sequences)) or len({e.event_id for e in self.events}) != len(self.events)
                or any(e.chat_id != self.chat.chat_id or e.sequence > self.cutoff_sequence for e in self.events)
                or any(t.chat_id != self.chat.chat_id or t.mode != self.chat.mode for t in self.turns)):
            raise ValueError("Ordered exact chat-bound history required")
        if any(turn.preview is not None and (self.chat.recipient.kind != "saved_agent"
                or turn.preview.conversation_id != self.chat.native_conversation_id
                or turn.preview.configuration_sha256 != self.chat.recipient.configuration_sha256) for turn in self.turns):
            raise ValueError("Native preview evidence must belong to this exact conversation and configuration")
        recipient = self.chat.recipient
        for event in self.events:
            author = event.author
            if author.kind == "owner":
                continue
            if (author.kind != recipient.kind
                    or author.kind == "consultant" and (author.participant_id != recipient.participant_id or author.role != recipient.role)
                    or author.kind == "saved_agent" and (author.agent_id != recipient.agent_id
                        or author.configuration_sha256 != recipient.configuration_sha256
                        or author.conversation_id != self.chat.native_conversation_id)):
                raise ValueError("Author must be the immutable recipient, never a UI impersonation")
        return self


class DirectEnvelope(Strict):
    contract_version: Literal["workspace-direct.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: Source
    observed_at: datetime


class DirectRecipientsEnvelope(DirectEnvelope):
    data: DirectRecipients


class DirectChatsEnvelope(DirectEnvelope):
    data: DirectChats


class DirectChatEnvelope(DirectEnvelope):
    data: DirectChat


class DirectHistoryEnvelope(DirectEnvelope):
    data: DirectHistory


class DirectAcceptedEnvelope(DirectEnvelope):
    data: DirectAccepted


class DirectTurnEnvelope(DirectEnvelope):
    data: DirectTurn


class DirectError(Strict):
    code: str
    request_id: UUID
