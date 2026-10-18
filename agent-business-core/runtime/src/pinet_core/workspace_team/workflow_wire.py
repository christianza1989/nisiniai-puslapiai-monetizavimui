"""Explicit draft plus ONE saved-example test; never calibration admission."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..business_discovery.wire import Digest, Source
from ..creation.wire import Strict
from .preparation_wire import PrepareAgent
from .wire import PublicEvent, Turn

VERSION = "workspace-agent-workflow.v1"


class PrepareAndTest(PrepareAgent):
    purpose: Literal["site_chat"] = "site_chat"


class AgentReceipt(Strict):
    agent_id: UUID
    creation_id: UUID
    purpose: Literal["site_chat"]
    revision_id: UUID
    revision: int = Field(strict=True, ge=1, le=2147483647)
    sha256: Digest


class WorkflowView(Strict):
    workflow_id: UUID
    topic_id: UUID
    creation_id: UUID
    purpose: Literal["site_chat"]
    status: Literal["waiting_preparation", "preparing", "waiting_test", "testing",
        "completed", "clarification_required", "failed", "cancelled"]
    owner_event: PublicEvent
    preparation: Turn
    test: Turn | None
    agent: AgentReceipt | None
    failure_code: str | None = Field(pattern=r"^[a-z_]{1,64}$")
    cancel_requested: bool
    deadline: datetime
    scenario: Literal["saved_example"]
    calibration_status: Literal["UNVERIFIED"]
    module_admission: Literal["not_admitted"]
    channel_activation: Literal["not_performed"]
    old_notes_dispatch: Literal["never_automatic"]

    @model_validator(mode="after")
    def exact_scope(self):
        if (self.owner_event.task_id != self.preparation.task_id
                or self.owner_event.author_type != "user"
                or self.owner_event.topic_id != self.topic_id
                or self.preparation.topic_id != self.topic_id
                or self.test is not None and (self.test.topic_id != self.topic_id
                    or self.test.task_id == self.preparation.task_id or self.agent is None
                    or self.test.native_episode is None)
                or self.agent is not None and self.agent.creation_id != self.creation_id
                or self.status == "completed" and (self.test is None or self.test.status != "succeeded")
                or self.cancel_requested and self.status != "cancelled"):
            raise ValueError("Exact workflow parent, native child and owner provenance required")
        return self


class WorkflowEnvelope(Strict):
    contract_version: Literal["workspace-agent-workflow.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: Source
    observed_at: datetime
    data: WorkflowView
