import hashlib
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..business_discovery.wire import Digest, Source
from ..creation.wire import Strict

Kind = Literal["portfolio", "discovery", "creation", "business"]
MAX_CLOCK = 2147483647


class Anchor(Strict):
    kind: Kind
    selection_id: UUID


class Create(Strict):
    idempotency_key: UUID
    anchor: Anchor
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value):
        if not value.strip() or any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in value):
            raise ValueError("Nonblank title without controls required")
        try:
            value.encode("utf-8")
        except UnicodeError:
            raise ValueError("Valid UTF-8 text required") from None
        return value


class SetMetadata(Strict):
    idempotency_key: UUID
    expected_metadata_revision: int = Field(strict=True, ge=1, le=MAX_CLOCK)
    title: str = Field(min_length=1, max_length=120)
    pinned: bool = Field(strict=True)
    archived: bool = Field(strict=True)
    _title = field_validator("title")(Create.clean_title.__func__)


class AppendMessage(Strict):
    idempotency_key: UUID
    content: str = Field(min_length=1, max_length=2500)

    @field_validator("content")
    @classmethod
    def clean_text(cls, value):
        if not value.strip() or any((ord(c) < 32 and c not in "\n\r\t") or 127 <= ord(c) <= 159 for c in value):
            raise ValueError("Nonblank plain text required")
        try:
            value.encode("utf-8")
        except UnicodeError:
            raise ValueError("Valid UTF-8 text required") from None
        return value


class TopicView(Strict):
    topic_id: UUID
    portfolio_id: UUID
    anchor: Anchor
    title: str = Field(min_length=1, max_length=120)
    pinned: bool
    archived_at: datetime | None
    metadata_revision: int = Field(strict=True, ge=1, le=MAX_CLOCK)
    message_sequence: int = Field(strict=True, ge=0, le=MAX_CLOCK)
    created_at: datetime
    updated_at: datetime
    execution: Literal["not_connected"]
    can_store_message: bool
    can_dispatch: Literal[False]
    _title = field_validator("title")(Create.clean_title.__func__)

    @model_validator(mode="after")
    def coherent(self):
        if self.can_store_message != (self.archived_at is None and self.message_sequence < MAX_CLOCK) or self.updated_at < self.created_at:
            raise ValueError("Wrong stored-topic state")
        return self


class MessageView(Strict):
    message_id: UUID
    topic_id: UUID
    sequence: int = Field(strict=True, ge=1, le=MAX_CLOCK)
    author_type: Literal["user"]
    author_user_id: UUID
    content: str = Field(min_length=1, max_length=2500)
    content_sha256: Digest
    stored_source_revision: Source
    created_at: datetime
    dispatch_state: Literal["stored_without_dispatch"]
    _content = field_validator("content")(AppendMessage.clean_text.__func__)

    @model_validator(mode="after")
    def exact_content(self):
        if hashlib.sha256(self.content.encode()).hexdigest() != self.content_sha256:
            raise ValueError("Wrong saved content digest")
        return self


class MetadataSnapshot(Strict):
    topic_id: UUID
    title: str = Field(min_length=1, max_length=120)
    pinned: bool
    archived_at: datetime | None
    metadata_revision: int = Field(strict=True, ge=1, le=MAX_CLOCK)
    created_at: datetime
    updated_at: datetime
    _title = field_validator("title")(Create.clean_title.__func__)


class ReceiptView(Strict):
    receipt_id: UUID
    topic_id: UUID
    idempotency_key: UUID
    operation: Literal["create", "set_metadata", "append_message"]
    accepted_metadata: MetadataSnapshot | None
    message_id: UUID | None
    message_sequence: int | None = Field(strict=True, ge=1, le=MAX_CLOCK)
    content_sha256: Digest | None
    accepted_source_revision: Source
    accepted_at: datetime

    @model_validator(mode="after")
    def exact_operation(self):
        message = self.operation == "append_message"
        if message != all(v is not None for v in (self.message_id, self.message_sequence, self.content_sha256)):
            raise ValueError("Wrong accepted message reference")
        if message and self.accepted_metadata is not None or not message and (
                self.accepted_metadata is None or any(v is not None for v in (
                    self.message_id, self.message_sequence, self.content_sha256))):
            raise ValueError("Wrong accepted metadata reference")
        if self.accepted_metadata and self.accepted_metadata.topic_id != self.topic_id:
            raise ValueError("Wrong snapshot topic")
        return self


class MetadataResult(Strict):
    receipt: ReceiptView
    current_topic: TopicView

    @model_validator(mode="after")
    def coherent(self):
        if self.receipt.operation == "append_message" or self.receipt.topic_id != self.current_topic.topic_id:
            raise ValueError("Wrong topic receipt")
        return self


class MessageResult(Strict):
    receipt: ReceiptView
    message: MessageView

    @model_validator(mode="after")
    def coherent(self):
        r, m = self.receipt, self.message
        if (r.operation != "append_message" or r.topic_id != m.topic_id or r.message_id != m.message_id
                or r.message_sequence != m.sequence or r.content_sha256 != m.content_sha256):
            raise ValueError("Wrong exact accepted message")
        return self


class Topics(Strict):
    portfolio_id: UUID
    anchor: Anchor | None
    items: list[TopicView] = Field(max_length=50)
    next_cursor: str | None = Field(max_length=2048)
    can_create_topic: Literal[True]
    execution: Literal["not_connected"]

    @model_validator(mode="after")
    def coherent(self):
        if (len({t.topic_id for t in self.items}) != len(self.items)
                or any(t.portfolio_id != self.portfolio_id or self.anchor and t.anchor != self.anchor for t in self.items)):
            raise ValueError("Wrong scoped topics")
        return self


class History(Strict):
    topic_id: UUID
    items: list[MessageView] = Field(max_length=50)
    next_cursor: str | None = Field(max_length=2048)
    cutoff_sequence: int = Field(strict=True, ge=0, le=MAX_CLOCK)

    @model_validator(mode="after")
    def coherent(self):
        sequences = [m.sequence for m in self.items]
        if (len({m.message_id for m in self.items}) != len(self.items) or sequences != sorted(set(sequences))
                or any(m.topic_id != self.topic_id or m.sequence > self.cutoff_sequence for m in self.items)):
            raise ValueError("Wrong saved history")
        return self


class Envelope(Strict):
    contract_version: Literal["workspace-topics.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: Topics | History | TopicView | MetadataResult | MessageResult


class Error(Strict):
    code: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=80)
    request_id: UUID
