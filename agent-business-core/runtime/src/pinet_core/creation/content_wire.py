"""Bounded actual private content intake snapshot, separate from publication/launch acceptance."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .renderer import ContentPlanItem


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ContentPage(Strict):
    page_id: str = Field(pattern=r"^page-[a-f0-9]{24}$")
    path: str = Field(pattern=r"^/(?:[a-z0-9][a-z0-9-]{0,69}/)?$")
    title: str = Field(min_length=1, max_length=160)
    revision_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    state: Literal["blocked", "reviewed"]
    has_approved_revision: bool
    review_current: bool
    blocker_count: int = Field(ge=0, le=100)
    blockers: list[str] = Field(max_length=12)
    hidden_blocker_count: int = Field(ge=0, le=100)


class ContentView(Strict):
    creation_id: UUID
    current_revision: int | None
    active_job_id: UUID | None
    creation_updated_at: datetime
    import_job_id: UUID | None
    source_revision: str | None = Field(pattern=r"^[a-f0-9]{40}$")
    candidate_sha256: str | None = Field(pattern=r"^[a-f0-9]{64}$")
    state: Literal["not_imported", "private_draft_imported", "intake_failed"]
    failure_code: str | None = Field(pattern=r"^[a-z_]{1,80}$")
    observed_at: datetime | None
    observation_scope: Literal["intake_snapshot"]
    content_plan_state: Literal["not_provided", "partial", "imported_unscheduled"]
    scheduling: Literal["UNVERIFIED"]
    full_f1_status: Literal["UNVERIFIED"]
    launch_status: Literal["UNVERIFIED"]
    plan: list[ContentPlanItem] = Field(max_length=12)
    pages: list[ContentPage] = Field(max_length=20)
    plan_issues: list[str] = Field(max_length=24)
