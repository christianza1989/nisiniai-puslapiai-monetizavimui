"""Exact durable registration readiness, separate from source/profile/channel admission."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..creation_registration.wire import RegistrationView
from .wire import Check, Digest, IntakeObservation, Key, Source, Strict, TeamReviewObservation
from .wire import RuntimeObservation as LegacyRuntimeObservation


class RuntimeObservationV2(LegacyRuntimeObservation):
    scope: Literal["unmapped", "current_registered_business"]


class AgentPreparationViewV2(Strict):
    creation_id: UUID
    accepted_revision: int | None = Field(ge=1, le=20)
    candidate_sha256: Digest | None
    accepted_source_revision: Source | None
    canonical_host: str | None = Field(max_length=253)
    observed_at: datetime
    observation_scope: Literal["current_readiness"] = "current_readiness"
    state: Literal["blocked"] = "blocked"
    team_review: TeamReviewObservation
    registration: RegistrationView
    intake: IntakeObservation
    runtime: RuntimeObservationV2
    checks: list[Check] = Field(min_length=14, max_length=14)
    blocker_keys: list[Key] = Field(min_length=1, max_length=14)
    can_activate: Literal[False] = False
    activation: Literal["not_performed"] = "not_performed"
    calibration: Literal["UNVERIFIED"] = "UNVERIFIED"
    full_f1_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    launch_status: Literal["UNVERIFIED"] = "UNVERIFIED"

    @model_validator(mode="after")
    def exact_current_observation(self):
        keys = [value.key for value in self.checks]
        if len(set(keys)) != 14 or self.blocker_keys != [c.key for c in self.checks if c.status != "PASS"]:
            raise ValueError("Every gate and exact blocker must be represented once")
        if ((self.accepted_revision is None) != (self.candidate_sha256 is None)
                or (self.accepted_revision is None) != (self.accepted_source_revision is None)
                or (self.team_review.state == "no_revision") != (self.accepted_revision is None)):
            raise ValueError("Revision/source/team identity must agree")
        if self.team_review.state == "accepted":
            if self.team_review.accepted_candidate_sha256 != self.candidate_sha256:
                raise ValueError("Team acceptance requires the exact current candidate")
        elif self.team_review.accepted_candidate_sha256 is not None:
            raise ValueError("Unreviewed candidates have no exact team acceptance")
        if any(c.key == "accepted_revision" and c.status == "PASS" for c in self.checks):
            if self.team_review.state != "accepted" or self.registration.revision_pending:
                raise ValueError("Only an idle exact team-reviewed revision can pass")
        if self.registration.creation_id != self.creation_id or self.registration.current_revision != self.accepted_revision:
            raise ValueError("Registration observation must describe this exact creation")
        bound = self.registration.binding_current
        expected_scope = "current_registered_business" if bound else "unmapped"
        if self.runtime.scope != expected_scope:
            raise ValueError("Runtime observations require the exact current durable binding")
        if bound:
            value = self.registration.registration
            if (value.candidate_sha256 != self.candidate_sha256
                    or value.accepted_source_revision != self.accepted_source_revision
                    or value.canonical_host != self.canonical_host or self.team_review.state != "accepted"):
                raise ValueError("Current binding must match the accepted material and host")
        else:
            if (self.runtime.profile_registered or self.runtime.role_instruction_hashes
                    or self.runtime.knowledge_state != "not_observed" or self.runtime.knowledge_revision is not None
                    or self.runtime.knowledge_sha256 is not None or self.runtime.knowledge_refreshed_at is not None
                    or self.runtime.knowledge_active_page_count
                    or any(getattr(self.runtime, key) is not None for key in ("source_admitted", "learning_admitted",
                        "policy_enabled", "policy_paused", "followup_enabled"))):
                raise ValueError("Unbound runtime observations must be absent")
        for check in self.checks:
            if check.key in {"business_registration", "creation_business_binding"}:
                if (check.status == "PASS") != bound or check.scope != "current_database":
                    raise ValueError("Binding checks must describe the canonical current registration")
        if self.intake.approved_page_count > self.intake.page_count:
            raise ValueError("Approved page count cannot exceed actual intake")
        return self
