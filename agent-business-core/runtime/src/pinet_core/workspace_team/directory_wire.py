"""Canonical saved-agent visibility is separate from execution participants."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..creation_registration.wire import Source, Strict
from ..customer_agents.wire import Digest, Purpose, Revision


class DirectoryEntry(Strict):
    agent_id: UUID
    creation_id: UUID | None = None
    registration_id: UUID | None = None
    external_binding_id: UUID | None = None
    business_id: UUID
    revision_id: UUID
    revision: Revision
    configuration_sha256: Digest
    name: str = Field(min_length=1, max_length=100)
    purpose: Purpose
    goal: str = Field(min_length=10, max_length=2000)
    business_state: Literal["current", "not_current"]
    configuration_state: Literal["draft"] = "draft"
    availability: Literal["not_admitted"] = "not_admitted"
    calibration_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    can_delegate: Literal[False] = False
    provider_execution: Literal[False] = False

    @model_validator(mode="after")
    def genuine_origin(self):
        legacy = self.creation_id is not None and self.registration_id is not None
        external = self.external_binding_id is not None
        if legacy == external or external and (self.creation_id is not None or self.registration_id is not None):
            raise ValueError("exact_agent_origin_required")
        return self


class DirectoryPage(Strict):
    topic_id: UUID
    portfolio_id: UUID
    business_id: UUID
    items: list[DirectoryEntry] = Field(max_length=50)
    total_count: int = Field(strict=True, ge=0)
    snapshot_sha256: Digest
    has_more: bool
    next_cursor: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def coherent(self):
        ids = [str(item.agent_id) for item in self.items]
        if (ids != sorted(set(ids)) or len(ids) > self.total_count
                or any(item.business_id != self.business_id for item in self.items)
                or self.has_more != bool(self.next_cursor) or self.has_more and not self.items):
            raise ValueError("Incoherent scoped directory")
        return self


class DirectoryEnvelope(Strict):
    contract_version: Literal["workspace-directory.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: Source
    observed_at: datetime
    data: DirectoryPage
