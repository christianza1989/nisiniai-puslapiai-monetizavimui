from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..customer.service import host


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Start(Strict):
    portfolio_id: UUID
    display_name: str = Field(min_length=1, max_length=100)
    idea: str = Field(min_length=20, max_length=2500)
    canonical_host: str | None = Field(max_length=253)
    idempotency_key: UUID

    @field_validator("display_name", "idea")
    @classmethod
    def clean_text(cls, value, info):
        value = value.strip()
        if len(value) < (20 if info.field_name == "idea" else 1):
            raise ValueError("Meaningful text required")
        return value

    @field_validator("canonical_host")
    @classmethod
    def domain(cls, value):
        return host(value) if value is not None else None


class Revise(Strict):
    base_revision: int = Field(ge=0, le=20, strict=True)
    message: str = Field(min_length=1, max_length=2500)
    idempotency_key: UUID

    @field_validator("message")
    @classmethod
    def clean_text(cls, value):
        if not value.strip():
            raise ValueError("Meaningful feedback required")
        return value.strip()


Status = Literal["queued", "running", "draft_ready", "failed", "cancelled"]
Stage = Literal["queued", "research", "drafting", "validation", "ready", "failed", "cancelled"]


class Capabilities(Strict):
    can_revise: bool
    can_cancel: bool


class CreationView(Strict):
    creation_id: UUID
    portfolio_id: UUID
    display_name: str
    idea: str
    canonical_host: str | None
    status: Status
    stage: Stage
    current_revision: int | None
    active_job_id: UUID | None
    failure_code: str | None
    created_at: datetime
    updated_at: datetime
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    capabilities: Capabilities
    latest_summary: str | None


class Creations(Strict):
    items: list[CreationView] = Field(max_length=100)


class EventView(Strict):
    event_id: UUID
    sequence: int
    job_id: UUID
    status: Status
    stage: Stage
    message: str
    created_at: datetime


class Events(Strict):
    items: list[EventView] = Field(max_length=200)


class MessageView(Strict):
    message_id: UUID
    job_id: UUID
    role: Literal["user", "assistant"]
    content: str
    revision: int | None
    created_at: datetime


class Messages(Strict):
    items: list[MessageView] = Field(max_length=40)


class ArtifactView(Strict):
    artifact_id: UUID
    revision: int
    kind: Literal["business_plan", "website_preview", "content_package"]
    display_name: str
    media_type: Literal["text/html", "text/markdown", "application/json"]
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes: int = Field(ge=0, le=524288)
    created_at: datetime


class Artifacts(Strict):
    items: list[ArtifactView] = Field(max_length=60)


class ArtifactContent(Strict):
    artifact: ArtifactView
    content: str = Field(max_length=524288)
