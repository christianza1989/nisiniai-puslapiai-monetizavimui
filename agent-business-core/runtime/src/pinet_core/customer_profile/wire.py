"""Customer-safe profile history; observing admission grants no execution authority."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..contracts import KnowledgeReferenceV2
from ..creation_registration.wire import Digest, RevisionNumber, Source, Strict

NeedFields = tuple[Literal["goal"], Literal["requirements"], Literal["deadline"], Literal["budget"], Literal["location"]]
ProfileVersion = Literal["customer-profile.v1"]
Blocker = Literal["accepted_revision_missing", "registration_missing", "registration_stale", "registration_revoked",
    "grant_revoked", "creation_revision_pending", "profile_missing", "profile_revoked", "profile_registration_stale",
    "execution_source_changed", "instructions_changed", "public_source_not_admitted", "public_source_unavailable",
    "public_source_expired", "public_source_changed"]


class Admit(Strict):
    registration_id: UUID
    accepted_revision: RevisionNumber
    candidate_sha256: Digest
    accepted_source_revision: Source
    authorizing_session_id: UUID
    execution_source_revision: Source
    knowledge_ref: KnowledgeReferenceV2

    @model_validator(mode="after")
    def bounded_reference(self):
        if self.knowledge_ref.knowledge_revision > 2147483647:
            raise ValueError("Knowledge revision exceeds the durable index bound")
        return self


class Revoke(Strict):
    admission_id: UUID
    fingerprint: Digest


class AdmittedProfile(Strict):
    admission_id: UUID
    sequence: Annotated[int, Field(strict=True, ge=1, le=20)]
    registration_id: UUID
    business_id: UUID
    site_id: str = Field(pattern=r"^creation-[a-f0-9]{32}$")
    canonical_host: str = Field(min_length=1, max_length=253)
    accepted_revision: RevisionNumber
    candidate_sha256: Digest
    accepted_source_revision: Source
    execution_source_revision: Source
    knowledge_ref: KnowledgeReferenceV2
    index_receipt_sha256: Digest
    profile_version: ProfileVersion
    need_fields: NeedFields = ("goal", "requirements", "deadline", "budget", "location")
    conversation_sha256: Digest
    quality_sha256: Digest
    admitted_at: datetime
    revoked_at: datetime | None


class ProfileView(Strict):
    creation_id: UUID
    current_revision: RevisionNumber | None
    observed_at: datetime
    observation_scope: Literal["current_database_and_code"] = "current_database_and_code"
    facts_scope: Literal["current_admitted_v2"] = "current_admitted_v2"
    state: Literal["missing", "current", "stale", "revoked", "blocked"]
    registration_state: Literal["missing", "current", "stale", "revoked", "grant_revoked"]
    source_state: Literal["unobserved", "not_admitted", "unavailable", "current"]
    admission: AdmittedProfile | None
    blockers: list[Blocker] = Field(max_length=16)
    profile_current: bool = Field(strict=True)
    need_fields: NeedFields = ("goal", "requirements", "deadline", "budget", "location")
    can_start_text_session: Literal[False] = False
    can_call_provider: Literal[False] = False
    voice_enabled: Literal[False] = False
    email_enabled: Literal[False] = False
    acquisition_enabled: Literal[False] = False
    learning_enabled: Literal[False] = False
    calibration_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    channel_activation: Literal["not_performed"] = "not_performed"

    @model_validator(mode="after")
    def truthful(self):
        if len(set(self.blockers)) != len(self.blockers):
            raise ValueError("Duplicate blockers")
        if (self.state == "missing") != (self.admission is None):
            raise ValueError("History must be an actual admission")
        if self.profile_current != (self.state == "current") or self.profile_current != (not self.blockers):
            raise ValueError("Current profile requires all observed gates")
        if self.state == "current" and (self.registration_state != "current" or self.source_state != "current"
                or self.admission.revoked_at or self.admission.accepted_revision != self.current_revision):
            raise ValueError("Current profile requires current identity and source")
        if self.state == "revoked" and (not self.admission.revoked_at or "profile_revoked" not in self.blockers):
            raise ValueError("Revoked profile needs immutable revocation evidence")
        if self.admission and self.admission.revoked_at and self.state != "revoked":
            raise ValueError("Terminal revocation cannot be hidden")
        return self
