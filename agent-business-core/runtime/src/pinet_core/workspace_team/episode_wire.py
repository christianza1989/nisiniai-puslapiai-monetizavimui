"""Explicit owner scenario, without model/permissions/corpus selection."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from ..creation.wire import Strict
from ..customer_agents.wire import Revision
from ..customer_text.wire import Turn as TextTurn
from ..workspace_topics.wire import AppendMessage
from .episode_types import EpisodeView  # noqa: F401 - maintained public DTO import
from .wire import Accepted

VERSION = "workspace-agent-episode.v1"


class TestAgent(Strict):
    __test__ = False
    idempotency_key: UUID
    creation_id: UUID
    agent_id: UUID
    expected_revision: Revision
    content: str = Field(min_length=1, max_length=2500)
    messages: list[str] | None = Field(default=None, min_length=1, max_length=8)
    reply_to_event_id: UUID | None = None
    _content = field_validator("content")(AppendMessage.clean_text.__func__)

    @field_validator("messages")
    @classmethod
    def native_messages(cls, value):
        return None if value is None else [TextTurn(request_id=UUID(int=1), base_need_revision=0,
            message=message).message for message in value]


class EpisodeEnvelope(Strict):
    contract_version: Literal["workspace-agent-episode.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at: datetime
    data: Accepted
