"""A new incremental owner-message intent, never an appendable EpisodePlan."""
from typing import Literal
from uuid import UUID, uuid5

from pydantic import Field, model_validator

from ..creation.service import digest
from ..customer_agents.preview import DirectCallIdentity, PreviewSnapshot
from ..customer_agents.provisioning import ProvisioningScope
from ..customer_agents.wire import Strict
from ..customer_text import execution
from ..workspace_topics.wire import AppendMessage

VERSION = "workspace-native-preview-turn.v1"
ADAPTER = "workspace-native-direct-preview.v1"


class PreviewTurnPlan(Strict):
    version: Literal[VERSION] = VERSION
    scope: ProvisioningScope
    snapshot: PreviewSnapshot
    task_id: UUID
    chat_id: UUID
    conversation_id: UUID
    message: str = Field(min_length=1, max_length=2500)
    message_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    text_request_id: UUID
    quality_request_id: UUID
    call_limit: Literal[3] = 3
    model: Literal["gpt-6.1-sol"] = "gpt-6.1-sol"
    effort: Literal["high"] = "high"

    @model_validator(mode="after")
    def exact_current_scope(self):
        AppendMessage.clean_text(self.message)
        value, parent = self.snapshot, self.scope
        if (self.chat_id != value.preview_id or value.creation_id != parent.creation_id
                or value.user_id != parent.user_id or value.registration_id != parent.registration_id
                or value.registration_fingerprint != parent.registration_fingerprint
                or value.environment_id != parent.environment_id or value.execution_source_revision != parent.source_revision
                or value.execution_profile is None or self.text_request_id != uuid5(self.task_id, "native-direct-text.v1")
                or self.quality_request_id != uuid5(self.task_id, "native-direct-quality.v1")
                or value.execution_profile.text.model != self.model or self.message_sha256 != digest(self.message)):
            raise ValueError("Actual saved Config/Profile/business preview scope required")
        return self

    def call_matches(self, call, quality_request_sha256):
        if not isinstance(call, DirectCallIdentity):
            return False
        expected, value = self.snapshot, call
        if (value.preview_id != self.chat_id or value.preview_turn_id != self.task_id
                or value.conversation_id != self.conversation_id or value.episode_id != expected.episode_id
                or value.script_sha256 != expected.script_sha256 or value.source_revision != self.scope.source_revision
                or any(getattr(value, key) != getattr(expected, key) for key in (
                    "creation_id", "agent_id", "config_revision_id", "config_revision", "config_sha256",
                    "admission_id", "admission_fingerprint"))
                or value.execution_profile_sha256 != expected.execution_profile.fingerprint()
                or value.reasoning_effort != "high" or value.protected_case_sha256 is not None):
            return False
        role = execution.role(expected.execution_profile, value.kind)
        if value.model != role["model"]:
            return False
        if value.kind == "customer_text":
            return (value.request_id == self.text_request_id and value.request_input_sha256 == digest(self.message)
                and value.number == 1 and value.call_key == "attempt:" + str(self.text_request_id))
        return (value.kind == "customer_quality" and value.request_id == self.quality_request_id
            and value.request_input_sha256 == quality_request_sha256 and value.number in {1, 2})
