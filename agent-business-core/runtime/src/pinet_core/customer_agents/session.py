"""Internal Session-ID principal over canonical native authority, never a login.

Only a server-owned claimed Task may construct this principal. Public bearer
routes/CLI requests stay unchanged. No default fence, executor or provider.
"""
import asyncio
import inspect
import json
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from ..control.routes import ControlError, scope
from ..creation.service import digest
from ..creation_registration.models import Registration
from ..customer_text import service as chat
from ..models import utcnow
from . import provisioning
from . import service as agents

Hash = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class CallIdentity(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    version: Literal["customer-agent-session-call.v1"] = "customer-agent-session-call.v1"
    kind: Literal["customer_text", "customer_quality"]
    creation_id: UUID
    agent_id: UUID
    config_revision_id: UUID
    config_revision: int = Field(ge=1, le=2147483647)
    config_sha256: Hash
    admission_id: UUID
    admission_fingerprint: Hash
    episode_id: UUID
    script_sha256: Hash
    conversation_id: UUID
    request_id: UUID
    call_key: str = Field(min_length=1, max_length=150)
    number: int = Field(ge=1, le=2)
    model: str = Field(min_length=1, max_length=100)
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    prompt_sha256: Hash
    schema_sha256: Hash
    request_input_sha256: Hash
    protected_case_sha256: Hash | None = None

    @model_validator(mode="after")
    def native_key(self):
        if self.kind == "customer_text":
            if self.number != 1 or self.call_key != "attempt:" + str(self.request_id):
                raise ValueError("text_call_identity_conflict")
        else:
            prefix, job, number = self.call_key.split(":")
            if prefix != "quality-attempt" or str(UUID(job)) != job or number != str(self.number):
                raise ValueError("quality_call_identity_conflict")
        return self

    def fingerprint(self):
        return digest(self.model_dump(mode="json"))


class TaskFence(ABC):
    """Root implements fresh SQL claim checks and an actual durable allocation.

    check runs after native parent/actor locks and before policy/index locks.
    reserve consumes one existing allocation in the same native reservation tx.
    Neither method may call heartbeat or recursively acquire native authority.
    """

    @abstractmethod
    async def check(self, tx) -> None:
        raise NotImplementedError

    @abstractmethod
    async def reserve(self, tx, call: CallIdentity) -> None:
        raise NotImplementedError


@dataclass(frozen=True)
class SessionPrincipal:
    scope: provisioning.ProvisioningScope
    fence: TaskFence

    def validated(self):
        if (not isinstance(self.scope, provisioning.ProvisioningScope)
                or not isinstance(self.fence, TaskFence)
                or not inspect.iscoroutinefunction(self.fence.check)
                or not inspect.iscoroutinefunction(self.fence.reserve)):
            raise ControlError(403, "task_fence_required")
        try:
            return provisioning.ProvisioningScope.model_validate_json(self.scope.model_dump_json())
        except (ValueError, TypeError, ValidationError):
            raise ControlError(400, "invalid_session_scope") from None

    async def check(self, tx):
        expected = self.validated()
        provisioning.source_matches(expected)
        if await self.fence.check(tx) is not None:
            raise ControlError(403, "task_fence_required")
        provisioning.source_matches(expected)

    @staticmethod
    def last_time(session):
        # Native locks protect mutable Session state, but a Task SQL await can
        # still cross the deadline after the canonical actor observation.
        if session.revoked_at or session.expires_at <= utcnow():
            raise ControlError(401, "unauthenticated")

    async def bind(self, tx, session, creation, identity):
        expected = self.validated()
        registry = await tx.get(Registration, str(expected.registration_id), populate_existing=True)
        if not registry or identity != (registry.id, registry.fingerprint):
            raise ControlError(409, "agent_business_not_current")
        provisioning.native_matches(expected, session, creation, registry)
        provisioning.source_matches(expected)
        await self.check(tx)
        self.last_time(session)

    @asynccontextmanager
    async def agent_authority(self, creation_id, agent_id, *, writing):
        expected = self.validated()
        if str(expected.creation_id) != str(creation_id):
            raise ControlError(409, "agent_business_not_current")
        async with scope(user=str(expected.user_id)) as tx:
            session = await provisioning.authorizing_session(tx, expected)
            async with agents.transaction_authority(tx, session, creation_id, agent_id, writing=writing) as context:
                _, session, creation, registry, _ = context
                await self.bind(tx, session, creation, (registry.id, registry.fingerprint))
                yield context
            # Canonical source/Foundation waits above cannot hide Task expiry.
            await self.check(tx)
            self.last_time(session)

    @asynccontextmanager
    async def text_authority(self, creation_id, *, calibration=None):
        expected = self.validated()
        if str(expected.creation_id) != str(creation_id) or calibration is None:
            raise ControlError(409, "conversation_task_not_current")
        chat.guard()
        if not await asyncio.to_thread(chat.adapter.source_current):
            raise ControlError(503, "source_unavailable")
        async with scope(user=str(expected.user_id)) as tx:
            session = await provisioning.authorizing_session(tx, expected)
            async with chat.transaction_authority(tx, session, creation_id,
                    calibration=calibration, principal=self) as context:
                yield context
            self.last_time(session)

    async def reserve(self, tx, binding, **fields):
        expected = self.validated()
        task = binding.get("task_calibration")
        if not isinstance(task, dict):
            raise ControlError(409, "conversation_task_not_current")
        try:
            if set(fields) - {"kind", "conversation_id", "request_id", "call_key", "number", "model",
                    "prompt_sha256", "schema_sha256", "request_input_sha256", "protected_case_sha256"}:
                raise ValueError("native_call_binding_is_not_overrideable")
            call = CallIdentity.model_validate_json(json.dumps({
                **{k: task[k] for k in ("creation_id", "agent_id", "config_revision_id", "config_revision",
                                      "config_sha256", "admission_id", "admission_fingerprint", "episode_id", "script_sha256")},
                "source_revision": task["execution_source_revision"], **fields}))
        except (ValueError, TypeError, KeyError, ValidationError):
            raise ControlError(400, "invalid_call_identity") from None
        if call.creation_id != expected.creation_id or call.source_revision != expected.source_revision:
            raise ControlError(409, "conversation_task_not_current")
        if await self.fence.reserve(tx, call) is not None:
            raise ControlError(403, "task_fence_required")

    async def start(self, creation_id, value, **options):
        return await chat._start(self, creation_id, value, **options)

    async def turn(self, creation_id, conversation_id, value, **options):
        return await chat._turn(self, creation_id, conversation_id, value, **options)


def required(principal):
    if not isinstance(principal, SessionPrincipal):
        raise ControlError(403, "task_fence_required")
    principal.validated()
    return principal
