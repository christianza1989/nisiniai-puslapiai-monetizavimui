"""Private evidence pins are observations, never customer permissions."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..creation.service import digest

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
PageId = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")]


class Strict(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)


class NativeProof(Strict):
    revision_id: UUID
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Digest
    accepted_source_revision: Source
    site_id: str = Field(pattern=r"^creation-[a-f0-9]{32}$")
    canonical_host: str = Field(min_length=1, max_length=253, pattern=r"^([a-z0-9-]+\.)+[a-z]{2,}$")
    coordinator_event_id: UUID
    coordinator_sha256: Digest
    intake_sha256: Digest
    intake_request_sha256: Digest
    intake_importer_sha256: Digest
    intake_site_file_sha256: Digest


class Sources(Strict):
    execution_source_revision: Source
    public_source_revision: Source
    bridge_sha256: Digest
    verifier_sha256: Digest
    parser_sha256: Digest


class FoundationScope(Strict):
    user_id: UUID
    organization_id: UUID
    portfolio_id: UUID
    environment_id: str = Field(min_length=1, max_length=100)
    session_id: UUID
    creation_id: UUID
    approval_id: UUID
    approval_fingerprint: Digest
    approval_session_id: UUID
    discovery_id: UUID
    report_id: UUID
    report_revision: int = Field(ge=1, le=20)
    report_sha256: Digest
    accepted: NativeProof
    sources: Sources
    language_review_mode: Literal["required", "paused_local_pilot"]
    site_context_sha256: Digest
    page_snapshot_sha256: Digest
    required_page_ids: list[PageId] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def exact_inventory(self):
        if self.accepted.site_id != "creation-"+self.creation_id.hex:
            raise ValueError("native_site_mismatch")
        if self.required_page_ids != sorted(set(self.required_page_ids)):
            raise ValueError("ordered_unique_page_inventory_required")
        return self

    def fingerprint(self):
        return digest(self.model_dump(mode="json"))


class Release(Strict):
    release_id: UUID
    manifest_sha256: Digest
    package_sha256: Digest
    page_revisions: dict[PageId, Digest]
    asset_sha256: dict[Annotated[str, Field(pattern=r"^[a-zA-Z0-9._-]+\.(webp|avif)$")], Digest]

    @model_validator(mode="after")
    def bounded(self):
        if not 1 <= len(self.page_revisions) <= 200 or len(self.asset_sha256) > 2000:
            raise ValueError("bounded_release_required")
        return self


class Completion(Strict):
    state: Literal["LOCAL_DELIVERY_CHECKS_PASS"]
    checked_at: datetime
    report_sha256: Digest
    audit_sha256: Digest
    review_evidence_sha256: Digest
    preview_sha256: Digest
    public_pages: int = Field(ge=1, le=200)
    requests: int = Field(ge=1, le=5000)


class Observation(Strict):
    version: Literal["native-foundation-evidence.v1"]
    state: Literal["blocked", "candidate", "verified-local"]
    scope_sha256: Digest
    sources: Sources
    site_context_sha256: Digest
    page_snapshot_sha256: Digest
    required_page_ids: list[PageId] = Field(min_length=1, max_length=200)
    blockers: list[Annotated[str, Field(pattern=r"^[a-z0-9_:-]{1,160}$")]] = Field(max_length=500)
    release: Release | None
    completion: Completion | None
    synthetic: bool
    admission: Literal["not_performed"]
    deployment: Literal["not_performed"]
    channel_activation: Literal["not_performed"]
    calibration_status: Literal["UNVERIFIED"]

    @model_validator(mode="after")
    def coherent(self):
        if self.state == "verified-local":
            if not self.release or not self.completion or self.blockers:
                raise ValueError("complete_local_evidence_required")
        elif self.completion is not None:
            raise ValueError("no_unverified_completion_receipt")
        if self.state == "candidate" and not self.release:
            raise ValueError("candidate_release_required")
        if self.state == "blocked" and not self.blockers:
            raise ValueError("explicit_blocker_required")
        if self.release and not set(self.required_page_ids) <= self.release.page_revisions.keys():
            raise ValueError("partial_release")
        return self


class RetainedCheck(Strict):
    version: Literal["native-foundation-evidence.v1"]
    state: Literal["retained-current"]
    scope_sha256: Digest
    observation_sha256: Digest
    sources: Sources
    synthetic: bool
    admission: Literal["not_performed"]
