"""Business-scoped projection of the same immutable customer Agent/Config core."""
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..creation_registration.wire import Strict
from . import wire
from .import_wire import ImportProvenance


class Agent(wire.Agent):
    creation_id: UUID | None = None
    registration_id: UUID | None = None
    external_binding_id: UUID | None = None
    source_origin: Literal["creation", "external"]


class ExternalOrigin(Strict):
    kind: Literal["external"] = "external"
    binding_id: UUID
    fingerprint: wire.Digest


class Config(wire.Config):
    import_provenance: ImportProvenance | None = None
    source_origin: ExternalOrigin | None = None


class Detail(wire.Detail):
    agent: Agent
    configuration: Config


class Saved(Detail):
    action: Literal["created", "revised", "replayed"]
    request_id: UUID


class Create(wire.Create):
    source_binding_id: UUID | None = None


class Revise(wire.Revise):
    source_binding_id: UUID | None = None
    source_binding_fingerprint: wire.Digest | None = None

    @model_validator(mode="after")
    def explicit_source_target(self):
        if (self.source_binding_id is None) != (self.source_binding_fingerprint is None):
            raise ValueError("exact_source_revision_target_required")
        return self


class ImportedAgent(Strict):
    key: str = Field(pattern=r"^[A-Za-z0-9_.-]{1,100}$")
    purpose: wire.Purpose
    configuration: wire.Specification
    provenance: ImportProvenance

    @model_validator(mode="after")
    def same_origin_key(self):
        if self.key != self.provenance.origin_agent_key:
            raise ValueError("import_agent_key_mismatch")
        return self


class Import(Strict):
    version: Literal["business-agent-import.v1"] = "business-agent-import.v1"
    request_id: UUID
    source_binding_id: UUID
    source_binding_fingerprint: wire.Digest
    agents: list[ImportedAgent] = Field(min_length=1, max_length=25)

    @model_validator(mode="after")
    def unique_keys(self):
        if len({row.key for row in self.agents}) != len(self.agents):
            raise ValueError("duplicate_import_agent_key")
        return self


class ImportResult(Strict):
    business_id: UUID
    request_id: UUID
    action: Literal["imported", "replayed"]
    items: list[Detail] = Field(min_length=1, max_length=25)
    provider_execution: Literal[False] = False
    channel_activation: Literal["not_performed"] = "not_performed"


class Listing(Strict):
    business_id: UUID
    items: list[Agent] = Field(max_length=50)
    can_create_draft: bool
    source_binding_id: UUID | None = None
    source_binding_fingerprint: wire.Digest | None = None
    configuration_blockers: list[Literal["business_source_required", "agent_business_not_current"]] = Field(max_length=1)
    has_more: bool
    next_cursor: str | None = Field(default=None, max_length=2048)


class Envelope(wire.Envelope):
    contract_version: Literal["business-customer-agents.v1"]
    data: Detail


class SavedEnvelope(Envelope):
    data: Saved


class ListingEnvelope(Envelope):
    data: Listing


class ConfigEnvelope(Envelope):
    data: Config


class ImportEnvelope(Envelope):
    data: ImportResult


class RevisionsEnvelope(Envelope):
    data: wire.Revisions
