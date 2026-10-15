"""Exact safe index references. Workflow observations are not team membership."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..business_discovery.wire import Digest, ReportView, Source
from ..creation.wire import ArtifactView, Strict

SelectionKind = Literal["portfolio", "discovery", "creation", "business"]
Collection = Literal["topics", "tasks", "results"]


class Selection(Strict):
    portfolio_id: UUID
    kind: SelectionKind
    selection_id: UUID


class TopicReference(Strict):
    kind: Literal["discovery", "creation"]
    topic_id: UUID
    portfolio_id: UUID


class Topic(Strict):
    kind: Literal["discovery", "creation"]
    id: UUID
    topic: TopicReference
    title: str = Field(min_length=1, max_length=200)
    stored_status: str = Field(min_length=1, max_length=40)
    current_revision: int = Field(strict=True, ge=0)
    parent_business_id: UUID | None
    association_state: Literal["unregistered", "latest_saved", "stale_saved", "revoked", "grant_revoked"]
    association_basis: Literal["saved_registration_identity"] = "saved_registration_identity"
    created_at: datetime
    updated_at: datetime
    author_semantics: Literal["legacy_user_assistant"] = "legacy_user_assistant"


class Task(Strict):
    kind: Literal["discovery_task", "creation_task"]
    id: UUID
    topic: TopicReference
    title: str = Field(min_length=1, max_length=200)
    sequence: int = Field(strict=True, ge=1)
    base_revision: int = Field(strict=True, ge=0)
    stored_status: str = Field(min_length=1, max_length=40)
    created_at: datetime
    finished_at: datetime | None
    source_revision: Source
    state_basis: Literal["saved_job_record"] = "saved_job_record"


class Result(Strict):
    kind: Literal["discovery_report", "creation_artifact"]
    id: UUID
    topic: TopicReference
    title: str = Field(min_length=1, max_length=200)
    revision: int = Field(strict=True, ge=1)
    sha256: Digest
    media_type: str = Field(min_length=1, max_length=100)
    artifact_kind: str = Field(min_length=1, max_length=80)
    created_at: datetime
    approval_basis: Literal["not_inferred"] = "not_inferred"
    family_basis: Literal["latest_saved_legacy_family", "exact_saved_revision"] = "latest_saved_legacy_family"


Item = Annotated[Topic | Task | Result, Field(discriminator="kind")]


class Page(Strict):
    selection: Selection
    collection: Collection
    items: list[Item] = Field(max_length=50)
    next_cursor: str | None = Field(max_length=2048)
    observation_basis: Literal["saved_legacy_records"] = "saved_legacy_records"
    team_protocol: Literal["not_implemented"] = "not_implemented"

    @model_validator(mode="after")
    def coherent(self):
        kinds = {"topics": {"discovery", "creation"}, "tasks": {"discovery_task", "creation_task"},
                 "results": {"discovery_report", "creation_artifact"}}[self.collection]
        if any(item.kind not in kinds or item.topic.portfolio_id != self.selection.portfolio_id for item in self.items):
            raise ValueError("Wrong collection or portfolio")
        if len({(item.kind, item.id) for item in self.items}) != len(self.items):
            raise ValueError("Repeated index identity")
        for item in self.items:
            expected = "discovery" if item.kind.startswith("discovery") else "creation"
            if item.topic.kind != expected or isinstance(item, Topic) and item.id != item.topic.topic_id:
                raise ValueError("Wrong underlying topic")
            if isinstance(item, Result) and item.family_basis != "latest_saved_legacy_family":
                raise ValueError("List must expose grouped latest saved families")
        return self


class Envelope(Strict):
    contract_version: Literal["workspace-read.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: Page


class ReportDocument(Strict):
    kind: Literal["discovery_report"]
    result: Result
    report: ReportView

    @model_validator(mode="after")
    def exact(self):
        if (self.result.kind != self.kind or self.result.family_basis != "exact_saved_revision" or self.result.topic.kind != "discovery"
                or self.result.topic.topic_id != self.report.discovery_id
                or self.result.revision != self.report.revision or self.result.sha256 != self.report.report_sha256):
            raise ValueError("Wrong report reference")
        return self


class ArtifactDocument(Strict):
    kind: Literal["creation_artifact"]
    result: Result
    artifact: ArtifactView
    content: str = Field(max_length=524288)

    @model_validator(mode="after")
    def exact(self):
        if (self.result.kind != self.kind or self.result.family_basis != "exact_saved_revision" or self.result.topic.kind != "creation"
                or self.result.id != self.artifact.artifact_id or self.result.revision != self.artifact.revision
                or self.result.sha256 != self.artifact.sha256 or self.result.media_type != self.artifact.media_type
                or self.result.artifact_kind != self.artifact.kind):
            raise ValueError("Wrong artifact reference")
        return self


class DocumentEnvelope(Strict):
    contract_version: Literal["workspace-read.v1"]
    environment: Literal["local", "test"]
    source_revision: Source
    observed_at: datetime
    request_id: UUID
    data: Annotated[ReportDocument | ArtifactDocument, Field(discriminator="kind")]


class Error(Strict):
    code: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=80)
    request_id: UUID
