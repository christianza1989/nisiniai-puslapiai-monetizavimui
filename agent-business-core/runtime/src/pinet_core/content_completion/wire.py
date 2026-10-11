from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..creation.language_mode import LanguageReviewMode
from ..creation.review import Digest


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


PageId = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")]
Note = Annotated[str, Field(min_length=1, max_length=600)]


class Source(Strict):
    url: str = Field(pattern=r"^https://", max_length=2048)
    label: str = Field(min_length=1, max_length=180)
    reason: str = Field(min_length=1, max_length=500)
    verified: bool


class Page(Strict):
    page_id: PageId
    path: str = Field(pattern=r"^/(?:[a-z0-9-]+/)*$", max_length=300)
    type: Literal["home", "guide", "article", "index", "author", "policy", "about", "contact", "service", "product", "faq", "location"]
    title: str = Field(min_length=1, max_length=1000)
    revision_sha256: Digest
    planning_sha256: Digest
    state: Literal["blocked", "reviewed"]
    blockers: list[Note] = Field(max_length=100)
    fact_notes: list[Note] = Field(max_length=40)
    sources: list[Source] = Field(max_length=20)
    media_count: int = Field(ge=0, le=60)
    media_files_present: bool
    review_current: bool
    reviewed_at: datetime | None
    reviewer: str | None = Field(max_length=120)
    has_approved_revision: bool
    approved_revision_sha256: Digest | None
    internal_planned: int = Field(ge=0, le=30)
    internal_attached: int = Field(ge=0, le=30)

    @model_validator(mode="after")
    def coherent(self):
        if self.has_approved_revision != (self.approved_revision_sha256 is not None):
            raise ValueError("Incoherent approved revision observation")
        if self.review_current and (self.reviewed_at is None or not self.reviewer):
            raise ValueError("Current review must identify its actual receipt")
        return self


class CompletionView(Strict):
    creation_id: UUID
    accepted_revision: int | None = Field(ge=1, le=20)
    accepted_source_revision: str | None = Field(pattern=r"^[a-f0-9]{40}$")
    candidate_sha256: Digest | None
    site_id: str | None = Field(pattern=r"^creation-[a-f0-9]{32}$")
    canonical_host: str | None = Field(min_length=1, max_length=253)
    state: Literal["not_imported", "current"]
    revision_pending: bool
    observed_at: datetime | None
    site_context_sha256: Digest | None
    observation_scope: Literal["current_private_workflow"] = "current_private_workflow"
    language_review_mode: LanguageReviewMode
    language_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    private_release_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    seo_geo_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    full_f1_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    launch_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    deployment: Literal["not_verified_by_studio"] = "not_verified_by_studio"
    permitted_actions: list[Literal["refresh"]] = Field(max_length=1)
    pages: list[Page] = Field(max_length=200)

    @model_validator(mode="after")
    def coherent(self):
        bound = (self.accepted_revision, self.accepted_source_revision, self.candidate_sha256,
                 self.site_id, self.canonical_host, self.observed_at, self.site_context_sha256)
        if self.state == "current" and any(value is None for value in bound):
            raise ValueError("Current observation requires exact intake and time bindings")
        if self.state == "not_imported" and (self.pages or self.observed_at is not None or self.site_context_sha256 is not None):
            raise ValueError("Missing intake has no live page observation")
        if len({p.page_id for p in self.pages}) != len(self.pages) or len({p.path for p in self.pages}) != len(self.pages):
            raise ValueError("Duplicate page identity")
        return self
