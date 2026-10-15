"""One frozen existing lab episode/Quality allowance; never a calibration decision.

Private intent is committed before dispatch. Messages remain test data. Source,
native Snapshot, existing protected reference and review input are independently
verified by the maintained lab/review adapters, not granted by these fields.
"""
from typing import Literal
from uuid import UUID, uuid5

from pydantic import ConfigDict, Field, model_validator

from ..creation.service import digest
from ..customer_agents.lab import Snapshot
from ..customer_agents.provisioning import ProvisioningScope
from ..customer_agents.wire import Digest, Strict
from ..customer_text.wire import Turn


class EpisodePlan(Strict):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    version: Literal["workspace-agent-episode-plan.v1"] = "workspace-agent-episode-plan.v1"
    scope: ProvisioningScope
    snapshot: Snapshot
    episode_id: UUID
    quality_request_id: UUID
    messages: tuple[str, ...] = Field(min_length=1, max_length=8)
    script_sha256: Digest
    quality_request_sha256: Digest
    protected_case_sha256: Digest | None
    model: Literal["gpt-6.1-sol"] = "gpt-6.1-sol"
    effort: Literal["high"] = "high"

    @model_validator(mode="before")
    @classmethod
    def script_fingerprint(cls, value):
        if isinstance(value, dict) and isinstance(value.get("messages"), (list, tuple)):
            result = {**value, "messages": tuple(value["messages"])}
            result.setdefault("script_sha256", digest(list(value["messages"])))
            return result
        return value

    @model_validator(mode="after")
    def coherent(self):
        scope, value = self.scope, self.snapshot
        if (value.creation_id != scope.creation_id or value.user_id != scope.user_id
                or value.session_id != scope.session_id or value.environment_id != scope.environment_id
                or value.execution_source_revision != scope.source_revision
                or value.registration_id != scope.registration_id
                or value.registration_fingerprint != scope.registration_fingerprint
                or self.episode_id == self.quality_request_id
                or self.script_sha256 != digest(list(self.messages))):
            raise ValueError("Exact independent native scope and operation IDs required")
        for message in self.messages:
            # The same canonical normalization applies before freezing the script.
            if Turn(request_id=UUID(int=1), base_need_revision=0, message=message).message != message:
                raise ValueError("Freeze normalized native messages")
        return self

    @property
    def call_limit(self):
        # Existing Quality may make at most two independently accounted calls.
        return len(self.messages) + 2

    def call_matches(self, call):
        """Compare a validated internal CallIdentity, never model-supplied flags."""
        snapshot = self.snapshot
        expected = {
            "creation_id": snapshot.creation_id, "agent_id": snapshot.agent_id,
            "config_revision_id": snapshot.config_revision_id, "config_revision": snapshot.config_revision,
            "config_sha256": snapshot.config_sha256, "admission_id": snapshot.admission_id,
            "admission_fingerprint": snapshot.admission_fingerprint, "episode_id": self.episode_id,
            "source_revision": self.scope.source_revision,
            "protected_case_sha256": self.protected_case_sha256,
            "model": self.model,
            "script_sha256": self.script_sha256,
        }
        if any(getattr(call, key, None) != value for key, value in expected.items()):
            return False
        if call.kind == "customer_text":
            inputs = {uuid5(self.episode_id, "step:"+str(index)): digest(message)
                for index, message in enumerate(self.messages)}
            return (call.number == 1 and call.request_id in inputs and call.call_key == "attempt:"+str(call.request_id)
                and getattr(call, "request_input_sha256", None) == inputs[call.request_id])
        return (call.kind == "customer_quality" and call.request_id == self.quality_request_id
            and getattr(call, "request_input_sha256", None) == self.quality_request_sha256)


def validated_plan(value):
    # Reject bypasses via model_construct/model_copy, and freeze a detached value.
    if not isinstance(value, EpisodePlan):
        raise ValueError("Exact typed episode plan required")
    return EpisodePlan.model_validate_json(value.model_dump_json())
