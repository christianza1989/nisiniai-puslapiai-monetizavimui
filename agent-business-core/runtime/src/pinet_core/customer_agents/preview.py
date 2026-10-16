"""Explicit incremental native preview binding; immutable scripted Episodes stay v1.

The descriptor names a saved configuration and a single native Conversation. It
never purports to hash a complete future script. Current Session authority comes
from the separately checked principal/Task scope; the original binding is retained.
"""
import json
from typing import Literal
from uuid import UUID

from pydantic import model_validator
from sqlalchemy import select

from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_text import execution
from ..models import Event
from . import lab
from .session import CallIdentity, SessionPrincipal

VERSION = "customer-agent-direct-preview.v1"
CALL_VERSION = "customer-agent-direct-call.v1"
QUALITY_VERSION = "customer-agent-direct-quality.v1"


def descriptor(snapshot, preview_id):
    value = snapshot.model_dump(mode="json") if hasattr(snapshot, "model_dump") else snapshot
    return digest({"version": VERSION, "preview_id": str(preview_id), **{key: value[key] for key in (
        "creation_id", "registration_id", "registration_fingerprint", "admission_id", "admission_fingerprint",
        "agent_id", "config_revision_id", "config_revision", "config_sha256", "execution_source_revision")},
        "execution_profile": value.get("execution_profile")})


class PreviewSnapshot(lab.Episode):
    version: Literal[VERSION] = VERSION
    preview_id: UUID
    execution_profile: execution.Pin

    @model_validator(mode="after")
    def exact_descriptor(self):
        if self.episode_id != self.preview_id or self.script_sha256 != descriptor(self, self.preview_id):
            raise ValueError("Exact versioned configuration descriptor required; never a mutable v1 script")
        return self


class DirectCallIdentity(CallIdentity):
    version: Literal[CALL_VERSION] = CALL_VERSION
    preview_id: UUID
    preview_turn_id: UUID

    @model_validator(mode="after")
    def exact_preview(self):
        if self.episode_id != self.preview_id or self.protected_case_sha256 is not None:
            raise ValueError("Exact ordinary native preview call required")
        return self


async def observe(tx, session, creation, identity, frozen):
    value = PreviewSnapshot.model_validate(frozen)
    # Reuse the maintained canonical Config/Registration/source checks with the
    # actual current Session. Preserve the immutable initial binding in storage.
    original = value.model_dump(mode="json")
    check = {key: original[key] for key in lab.Episode.model_fields}
    check["session_id"] = session.id
    await lab.observe(tx, session, creation, identity, check)
    return original


async def transcript(tx, conversation_id, *, without_request=None):
    rows = list(await tx.scalars(select(Event).where(Event.conversation_id == str(conversation_id),
        Event.kind.in_(["client_transcript", "customer_text_result"])).order_by(Event.sequence).limit(101)))
    if len(rows) > 100:
        raise ControlError(409, "preview_transcript_limit")
    if without_request is not None:
        excluded = {"client:" + str(without_request), "result:" + str(without_request)}
        rows = [row for row in rows if row.event_key not in excluded]
    return rows


def transcript_hash(rows):
    return digest([{key: getattr(row, key) for key in ("id", "event_key", "sequence", "kind", "payload")} for row in rows])


async def check_prefix(tx, conversation_id, request):
    rows = await transcript(tx, conversation_id)
    base = [row for row in rows if row.event_key not in {"client:" + str(request.text_request_id), "result:" + str(request.text_request_id)}]
    client = [row for row in rows if row.event_key == "client:" + str(request.text_request_id)]
    result = [row for row in rows if row.event_key == "result:" + str(request.text_request_id)]
    if (sum(row.kind == "client_transcript" for row in base) != request.base_transcript_revision
            or transcript_hash(base) != request.base_transcript_sha256 or len(client) != 1 or len(result) != 1
            or result[0].payload.get("status") != "succeeded" or result[0].sequence <= client[0].sequence
            or any(row.sequence >= client[0].sequence for row in base)):
        raise ControlError(409, "preview_transcript_changed")
    return request.base_transcript_revision + 1, transcript_hash(rows)


def principal(scope, fence, frozen, *, turn_id=None):
    """No browser construction; metadata admission cannot reserve any model call."""
    snapshot = PreviewSnapshot.model_validate_json(json.dumps(frozen))
    if str(scope.creation_id) != str(snapshot.creation_id) or str(scope.user_id) != str(snapshot.user_id):
        raise ControlError(409, "conversation_task_not_current")

    class PreviewPrincipal(SessionPrincipal):
        async def reserve(self, tx, binding, **fields):
            if turn_id is None:
                raise ControlError(403, "preview_task_required")
            expected = self.validated()
            current = PreviewSnapshot.model_validate(binding.get("task_calibration"))
            if current.model_dump(mode="json") != snapshot.model_dump(mode="json"):
                raise ControlError(409, "conversation_task_not_current")
            try:
                if execution.binding_pin(binding) != self.execution_profile or set(fields) - {
                        "kind", "conversation_id", "request_id", "call_key", "number", "model", "prompt_sha256",
                        "schema_sha256", "request_input_sha256", "protected_case_sha256"}:
                    raise ValueError("Exact native call fields required")
                source = snapshot.model_dump(mode="json")
                call = DirectCallIdentity.model_validate_json(json.dumps({
                    **{key: source[key] for key in ("creation_id", "agent_id", "config_revision_id", "config_revision",
                        "config_sha256", "admission_id", "admission_fingerprint", "episode_id", "script_sha256")},
                    "source_revision": source["execution_source_revision"], "preview_id": str(snapshot.preview_id),
                    "preview_turn_id": str(turn_id), **execution.call_fields(binding, fields.get("kind")), **fields}))
            except (ValueError, TypeError, KeyError):
                raise ControlError(400, "invalid_call_identity") from None
            if call.creation_id != expected.creation_id or call.source_revision != expected.source_revision:
                raise ControlError(409, "conversation_task_not_current")
            await self.fence.reserve(tx, call)
            execution.current(self.execution_profile)

    return PreviewPrincipal(scope, fence, snapshot.execution_profile)
