"""Private registration observation, separate from domain ownership and agent admission."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
RevisionNumber = Annotated[int, Field(strict=True, ge=1, le=20)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Provision(Strict):
    creation_id: UUID
    accepted_revision: RevisionNumber
    candidate_sha256: Digest
    accepted_source_revision: Source
    authorizing_session_id: UUID


class Revoke(Strict):
    registration_id: UUID
    candidate_sha256: Digest


class RegisteredRevision(Strict):
    registration_id: UUID
    business_id: UUID
    site_id: str = Field(pattern=r"^creation-[a-f0-9]{32}$")
    canonical_host: str = Field(min_length=1, max_length=253)
    accepted_revision: RevisionNumber
    candidate_sha256: Digest
    accepted_source_revision: Source
    registered_at: datetime
    revoked_at: datetime | None


class RegistrationView(Strict):
    creation_id: UUID
    current_revision: RevisionNumber | None
    observed_at: datetime
    observation_scope: Literal["current_database"] = "current_database"
    state: Literal["missing", "current", "stale", "revoked", "grant_revoked"]
    registration: RegisteredRevision | None
    revision_pending: bool
    binding_current: bool
    hostname_authority: Literal["UNVERIFIED"] = "UNVERIFIED"
    public_source_admitted: Literal[False] = False
    profile_admitted: Literal[False] = False
    channel_activation: Literal["not_performed"] = "not_performed"
    full_f1_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    launch_status: Literal["UNVERIFIED"] = "UNVERIFIED"

    @model_validator(mode="after")
    def exact_observation(self):
        if (self.state == "missing") != (self.registration is None):
            raise ValueError("Registration identity must describe a real record")
        current = bool(self.registration and self.registration.accepted_revision == self.current_revision)
        if self.state == "current" and (not current or self.registration.revoked_at is not None):
            raise ValueError("Current registration must describe the unrevoked current revision")
        if self.state == "stale" and current:
            raise ValueError("A current revision is not stale")
        if self.state == "revoked" and self.registration.revoked_at is None:
            raise ValueError("Revocation requires its actual record")
        if self.binding_current != (self.state == "current" and not self.revision_pending):
            raise ValueError("Only the idle exact current registration passes this binding gate")
        return self
