"""Canonical bounded readiness wire. Drafts and registry candidates confer no readiness."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Key = Literal["accepted_revision", "source_pin", "private_intake", "business_registration",
    "creation_business_binding", "business_profile", "role_instructions", "v2_knowledge", "v2_session",
    "site_voice", "acquisition", "email_followup", "email_reply", "calibration"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Check(Strict):
    key: Key
    status: Literal["PASS", "FAIL", "UNVERIFIED"]
    scope: Literal["source_code", "current_database", "runtime_configuration", "intake_snapshot", "not_observed"]
    code: str = Field(pattern=r"^[a-z][a-z0-9_]{1,79}$")
    summary: str = Field(min_length=10, max_length=320)
    observed_at: datetime | None

    @model_validator(mode="after")
    def scope_evidence(self):
        if self.scope == "not_observed":
            if self.status != "UNVERIFIED" or self.observed_at is not None:
                raise ValueError("Unobserved evidence cannot pass or fail")
        elif self.observed_at is None:
            raise ValueError("An observation requires its actual time")
        return self


class RegistrationCandidate(Strict):
    business_id: UUID
    site_id: str = Field(min_length=1, max_length=100)
    canonical_host: str = Field(min_length=1, max_length=253)
    registration_source_revision: Source
    connection_status: Literal["pending", "registered", "connected", "stale", "conflict", "unavailable"]
    relationship: Literal["same_host_owned_grant_candidate"] = "same_host_owned_grant_candidate"


class Mapping(Strict):
    state: Literal["missing", "candidate_unbound"]
    candidate: RegistrationCandidate | None
    confirmed_business_id: None = None
    binding: Literal["not_implemented"] = "not_implemented"


class IntakeObservation(Strict):
    state: Literal["not_imported", "private_draft_imported", "intake_failed"]
    import_job_id: UUID | None
    observed_at: datetime | None
    page_count: int = Field(ge=0, le=20)
    approved_page_count: int = Field(ge=0, le=20)
    failure_code: str | None = Field(pattern=r"^[a-z_]{1,80}$")
    observation_scope: Literal["intake_snapshot"] = "intake_snapshot"


class TeamReviewObservation(Strict):
    state: Literal["no_revision", "unreviewed", "accepted"]
    accepted_candidate_sha256: Digest | None
    observation_scope: Literal["current_database"] = "current_database"


class RuntimeObservation(Strict):
    scope: Literal["unmapped", "owned_registration_candidate"]
    profile_registered: bool
    role_instruction_hashes: dict[Literal["conversation", "sales", "supplier", "quality"], Digest] = Field(max_length=4)
    knowledge_state: Literal["not_observed", "missing", "v1", "v2_current", "v2_expired", "v2_revoked", "invalid"]
    knowledge_revision: int | None = Field(ge=1)
    knowledge_sha256: Digest | None
    knowledge_refreshed_at: datetime | None
    knowledge_active_page_count: int = Field(ge=0, le=1000)
    source_admitted: bool | None
    learning_admitted: bool | None
    policy_enabled: bool | None
    policy_paused: bool | None
    followup_enabled: bool | None
    smtp_enabled: bool
    voice_configured: bool
    # Source transport is separate from customer creation/revision session admission.
    v2_index_transport: Literal["implemented"] = "implemented"
    v2_session_admission: Literal["not_implemented"] = "not_implemented"
    business_contacts: Literal["not_verified_for_creation"] = "not_verified_for_creation"


class AgentPreparationView(Strict):
    creation_id: UUID
    accepted_revision: int | None = Field(ge=1, le=20)
    candidate_sha256: Digest | None
    accepted_source_revision: Source | None
    canonical_host: str | None = Field(max_length=253)
    observed_at: datetime
    observation_scope: Literal["current_readiness"] = "current_readiness"
    state: Literal["blocked"] = "blocked"
    team_review: TeamReviewObservation
    mapping: Mapping
    intake: IntakeObservation
    runtime: RuntimeObservation
    checks: list[Check] = Field(min_length=14, max_length=14)
    blocker_keys: list[Key] = Field(min_length=1, max_length=14)
    can_activate: Literal[False] = False
    activation: Literal["not_performed"] = "not_performed"
    calibration: Literal["UNVERIFIED"] = "UNVERIFIED"
    full_f1_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    launch_status: Literal["UNVERIFIED"] = "UNVERIFIED"

    @model_validator(mode="after")
    def bounded_honest_projection(self):
        keys = [value.key for value in self.checks]
        if len(set(keys)) != 14 or self.blocker_keys != [c.key for c in self.checks if c.status != "PASS"]:
            raise ValueError("Every gate and exact blocker must be represented once")
        if (self.mapping.state == "missing") != (self.mapping.candidate is None):
            raise ValueError("Candidate identity is not a durable mapping")
        if (self.accepted_revision is None) != (self.candidate_sha256 is None):
            raise ValueError("Accepted revision and exact candidate identity must agree")
        if (self.accepted_revision is None) != (self.accepted_source_revision is None):
            raise ValueError("Revision and source identity must agree")
        if (self.team_review.state == "no_revision") != (self.accepted_revision is None):
            raise ValueError("Team review must describe the actual current revision")
        if self.team_review.state == "accepted":
            if self.team_review.accepted_candidate_sha256 != self.candidate_sha256:
                raise ValueError("Team acceptance requires the exact current candidate")
        elif self.team_review.accepted_candidate_sha256 is not None:
            raise ValueError("No exact team acceptance without a reviewed candidate")
        if any(c.key == "accepted_revision" and c.status == "PASS" for c in self.checks):
            if self.team_review.state != "accepted":
                raise ValueError("A legacy revision cannot pass exact team acceptance")
        expected_scope = "owned_registration_candidate" if self.mapping.candidate else "unmapped"
        if self.runtime.scope != expected_scope:
            raise ValueError("Runtime observations require the actual owned candidate")
        if self.intake.approved_page_count > self.intake.page_count:
            raise ValueError("Approved page count cannot exceed actual intake")
        return self
