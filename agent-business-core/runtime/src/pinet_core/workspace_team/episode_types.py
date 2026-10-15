"""Read-only bounded test observations, without execution/admission authority."""
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..creation.wire import Strict
from ..customer_agents.wire import Digest, Revision


class EpisodeView(Strict):
    version: Literal["workspace-agent-episode.v1"] = "workspace-agent-episode.v1"
    creation_id: UUID
    agent_id: UUID
    config_revision: Revision
    config_sha256: Digest
    max_calls: int = Field(strict=True, ge=3, le=10)
    reserved_calls: int = Field(strict=True, ge=0, le=10)
    settled_calls: int = Field(strict=True, ge=0, le=10)
    usage_complete: bool
    scenario: Literal["owner_scenario", "saved_example"]
    model: Literal["gpt-6.1-sol"]
    reasoning_effort: Literal["high"]
    execution_profile_sha256: Digest
    conversation_id: UUID | None = None
    quality_job_id: UUID | None = None
    calibration_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    module_admission: Literal["not_admitted"] = "not_admitted"
    activation: Literal["not_performed"] = "not_performed"

    @model_validator(mode="after")
    def bounded(self):
        if (self.settled_calls > self.reserved_calls or self.reserved_calls > self.max_calls
                or self.usage_complete and (self.reserved_calls == 0 or self.settled_calls != self.reserved_calls)
                or self.quality_job_id is not None and self.conversation_id is None):
            raise ValueError("Exact bounded observation required")
        return self
