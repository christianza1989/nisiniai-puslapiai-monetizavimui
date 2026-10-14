"""Explicit owner intent for a native agent draft, never a tool/channel grant."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from ..creation.wire import Strict
from ..customer_agents.wire import Purpose, Specification
from ..workspace_topics.wire import AppendMessage
from .adapter import Answer
from .wire import Accepted

VERSION = "workspace-agent-preparation.v1"


class PrepareAgent(Strict):
    idempotency_key: UUID
    creation_id: UUID
    purpose: Purpose
    content: str = Field(min_length=1, max_length=2500)
    reply_to_event_id: UUID | None = None
    _content = field_validator("content")(AppendMessage.clean_text.__func__)


class DraftPlan(Answer):
    decision: Literal["clarify", "save_draft"]
    configuration: Specification | None

    @model_validator(mode="after")
    def exact_decision(self):
        if (self.decision == "save_draft") != (self.configuration is not None):
            raise ValueError("One bounded native specification or clarification required")
        return self


class PreparationEnvelope(Strict):
    contract_version: Literal["workspace-agent-preparation.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at: datetime
    data: Accepted
