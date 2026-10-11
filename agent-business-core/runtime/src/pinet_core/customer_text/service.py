"""Owned local text sessions, durable single dispatch and separate usage settlement."""
import asyncio
import hashlib
import re
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select, text

from .. import knowledge, policy
from .. import service as core
from ..config import settings
from ..contracts import KnowledgeQuery, NeedPatch
from ..control.models import Session
from ..control.routes import ControlError, identifier, scope, token_hash
from ..creation.routes import owned
from ..creation.service import digest
from ..creation_registration.models import Registration
from ..customer_profile import instructions
from ..customer_profile import service as profiles
from ..customer_profile.models import Admission
from ..db import db
from ..models import Business, Case, CaseSource, Conversation, Event, new_id, utcnow
from ..tasks.codex_transport import RunnerError
from ..text_tools import core_arguments
from . import adapter


def guard():
    cfg = settings()
    if (cfg.control_mode != "local" or not (cfg.environment in {"local", "test"}
            or cfg.environment.startswith("test-")) or not cfg.customer_enabled
            or not cfg.customer_text_enabled or not cfg.customer_text_runner_enabled
            or cfg.voice_enabled or cfg.smtp_enabled):
        raise ControlError(403, "customer_text_unavailable")


def bearer_token(value):
    if not re.fullmatch(r"Bearer [A-Za-z0-9_-]{64}", value):
        raise ControlError(401, "unauthenticated")
    return value[7:]


@asynccontextmanager
async def authority(token, creation_id):
    guard()
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    async with scope(token=token_hash(token)) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(token)))
        if not session or session.revoked_at or session.expires_at <= utcnow():
            raise ControlError(401, "unauthenticated")
        await tx.execute(text("SELECT set_config('pinet.control_user', :u, true), "
            "set_config('pinet.control_token', '', true)"), {"u": session.user_id})
        identity = await profiles.pin_registration(tx, creation_id)
        creation = await owned(tx, session, creation_id, lock=True)
        current = await profiles.projection(tx, session, creation, registration_identity=identity)
        if not current["profile_current"]:
            raise ControlError(409, "customer_profile_not_current")
        admitted = current["admission"]
        registry = await tx.get(Registration, admitted["registration_id"])
        admission = await tx.get(Admission, admitted["admission_id"])
        business = await tx.get(Business, admitted["business_id"])
        if not registry or not admission or not business:
            raise ControlError(409, "customer_profile_not_current")
        await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": business.id})
        # Explicit local testing authority, separate from live channel activation.
        await policy.require(tx, simulation=True, tool="knowledge.resolve")
        await policy.require(tx, simulation=True, tool="need.patch")
        binding = {"creation_id": creation.id, "user_id": session.user_id, "session_id": session.id,
            "environment_id": settings().environment, "registration_id": registry.id,
            "registration_fingerprint": registry.fingerprint,
            "admission_id": admission.id, "admission_fingerprint": admission.fingerprint,
            "profile": admitted, "adapter": adapter.VERSION,
            "model": adapter.MODEL}
        yield tx, session, creation, identity, business, binding


async def final_authority(tx, session, creation, identity, expected):
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    value = await profiles.projection(tx, session, creation, registration_identity=identity)
    if not value["profile_current"] or value["admission"] != expected["profile"]:
        raise ControlError(409, "customer_profile_not_current")


async def locked(tx, conversation_id, binding):
    row = await tx.scalar(select(Conversation).where(Conversation.id == identifier(conversation_id))
        .with_for_update().execution_options(populate_existing=True))
    if (not row or row.payload.get("transport") != adapter.VERSION
            or row.payload.get("customer_text_binding") != binding):
        raise ControlError(404, "not_found")
    if row.expires_at <= utcnow():
        raise ControlError(409, "customer_text_expired")
    return row


async def history(tx, row):
    values = list(await tx.scalars(select(Event).where(Event.conversation_id == row.id)
        .order_by(Event.sequence.desc()).limit(101)))
    return [{"event_id": item.id, "sequence": item.sequence, "kind": item.kind, "data": item.payload}
        for item in reversed(values[:100])], len(values) > 100


async def view(tx, row):
    events, more = await history(tx, row)
    return {"conversation_id": row.id, "creation_id": row.payload["customer_text_binding"]["creation_id"],
        "state": row.state, "need_revision": row.need_revision, "need": row.payload["need"],
        "events": events, "history_truncated": more, "transport": adapter.VERSION,
        "model": adapter.MODEL, "scope": "local_authenticated_test", "channel_activation": "not_performed",
        "calibration_status": "UNVERIFIED"}


async def start(token, creation_id, value):
    if not adapter.runner_ready() or not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "runner_unavailable")
    async with authority(token, creation_id) as (tx, session, creation, identity, business, binding):
        if str(value.admission_id) != binding["admission_id"]:
            raise ControlError(409, "profile_admission_conflict")
        fingerprint = digest({"request": value.model_dump(mode="json"), "binding": binding})
        old = await tx.scalar(select(Conversation).where(
            Conversation.payload["customer_text_start_key"].astext == str(value.request_id)).with_for_update())
        if old:
            if old.payload["start_fingerprint"] != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            row = await locked(tx, old.id, binding)
        else:
            cid, case_id = new_id(), new_id()
            scoped = {"business_id": business.id, "environment_id": settings().environment}
            tx.add(Case(id=case_id, **scoped, payload={"source": adapter.VERSION, "test": True}))
            await tx.flush()
            tx.add(CaseSource(**scoped, case_id=case_id, source_system="customer_text",
                site_id=business.site_id, source_record_id=cid))
            row = Conversation(id=cid, **scoped, case_id=case_id, token_hash=digest({"id": cid}),
                expires_at=min(session.expires_at, utcnow() + timedelta(seconds=settings().session_seconds + 1800)),
                state="created", payload={"transport": adapter.VERSION, "test": True,
                    "customer_text_binding": binding, "need_fields": list(instructions.NEED_FIELDS), "need": {},
                    "customer_text_start_key": str(value.request_id), "start_fingerprint": fingerprint,
                    "notice_version": value.notice_version, "ui": None})
            tx.add(row)
            await tx.flush()
            await core.add_event(tx, row, "start", "created", {"transport": adapter.VERSION,
                "admission_id": binding["admission_id"], "source_revision": settings().control_source_revision})
        result = await view(tx, row)
        await final_authority(tx, session, creation, identity, binding)
        return result


async def capability(token, creation_id):
    """Current local consumer authority only; no reservation, mutation or renewal."""
    if not adapter.runner_ready():
        raise ControlError(503, "runner_unavailable")
    async with authority(token, creation_id) as (tx, session, creation, identity, _, binding):
        result = {"creation_id": creation.id, "admission_id": binding["admission_id"],
            "transport": adapter.VERSION, "model": adapter.MODEL, "scope": "local_authenticated_test",
            "can_start_text_session": True, "can_call_provider": True, "consent_required": True,
            "notice_version": "customer-text.local.v1", "need_fields": list(instructions.NEED_FIELDS),
            "channel_activation": "not_performed", "calibration_status": "UNVERIFIED"}
        await final_authority(tx, session, creation, identity, binding)
        return result


async def status(token, creation_id, conversation_id):
    async with authority(token, creation_id) as (tx, session, creation, identity, _, binding):
        row = await locked(tx, conversation_id, binding)
        result = await view(tx, row)
        await final_authority(tx, session, creation, identity, binding)
        return result


async def end(token, creation_id, conversation_id):
    async with authority(token, creation_id) as (tx, session, creation, identity, _, binding):
        row = await locked(tx, conversation_id, binding)
        await core.finalize(tx, row)
        row.owner = None
        row.epoch += 1
        result = await view(tx, row)
        await final_authority(tx, session, creation, identity, binding)
        return result


@dataclass(frozen=True)
class Dispatch:
    business_id: str
    environment_id: str
    conversation_id: str
    creation_id: str
    request_id: str
    run_id: str
    epoch: int
    revision: int
    event_id: str
    context: dict
    binding: dict


async def result_event(tx, row, key):
    return await tx.scalar(select(Event).where(Event.conversation_id == row.id, Event.event_key == "result:" + key))


async def prepare(token, creation_id, conversation_id, value):
    async with authority(token, creation_id) as (tx, session, creation, identity, business, binding):
        row = await locked(tx, conversation_id, binding)
        request = str(value.request_id)
        fingerprint = digest(value.model_dump(mode="json"))
        reserved = await tx.scalar(select(Event).where(Event.conversation_id == row.id,
            Event.event_key == "attempt:" + request))
        if reserved:
            if reserved.payload["fingerprint"] != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            completed = await result_event(tx, row, request)
            if completed:
                result = {"turn": completed.payload, **await view(tx, row)}
            elif row.owner == reserved.payload["run_id"] and row.lease_until and row.lease_until > utcnow():
                result = {"turn": {"status": "running", "request_id": request}, **await view(tx, row)}
            else:
                terminal = await core.add_event(tx, row, "result:" + request, "customer_text_result",
                    {"status": "interrupted", "request_id": request, "provider_replayed": False})
                result = {"turn": terminal.payload, **await view(tx, row)}
            await final_authority(tx, session, creation, identity, binding)
            return result
        if row.state == "finalized":
            raise ControlError(409, "conversation_finalized")
        if row.owner and row.lease_until and row.lease_until > utcnow():
            raise ControlError(409, "customer_text_busy")
        if value.base_need_revision != row.need_revision:
            raise ControlError(409, "stale_need_revision")
        if not adapter.runner_ready() or not await asyncio.to_thread(adapter.source_current):
            raise ControlError(503, "runner_unavailable")
        event = await core.add_event(tx, row, "client:" + request, "client_transcript", {"text": value.message})
        resolved = await knowledge.resolve(tx, KnowledgeQuery(query=value.message[:500]))
        await core.add_event(tx, row, "knowledge:" + request, "tool", {"name": "knowledge.resolve", "result": resolved})
        events, _ = await history(tx, row)
        context = {"client_message": value.message, "need_revision": row.need_revision, "need": row.payload["need"],
            "knowledge": resolved, "history": [e for e in events if e["kind"] in
                {"client_transcript", "customer_text_result"}][-20:], "evidence_event_id": event.id}
        row.owner, row.epoch = new_id(), row.epoch + 1
        row.lease_until = utcnow() + timedelta(seconds=settings().chat_runner_seconds + 10)
        _, input_text, schema_text = adapter.material(context, event.id, row.need_revision)
        attempt = {"request_id": request, "fingerprint": fingerprint, "run_id": row.owner, "epoch": row.epoch,
            "need_revision": row.need_revision, "deadline": row.lease_until.isoformat(), "model": adapter.MODEL,
            "binding_sha256": digest(binding),
            "prompt_sha256": hashlib.sha256(input_text.encode("utf-8")).hexdigest(),
            "schema_sha256": hashlib.sha256(schema_text.encode("utf-8")).hexdigest()}
        await core.add_event(tx, row, "attempt:" + request, "provider_attempt", attempt)
        await final_authority(tx, session, creation, identity, binding)
        return Dispatch(business.id, settings().environment, row.id, creation.id, request, row.owner,
            row.epoch, row.need_revision, event.id, context, binding)


def live(row, dispatch):
    return bool(row and row.state != "finalized" and row.owner == dispatch.run_id and row.epoch == dispatch.epoch
        and row.need_revision == dispatch.revision and row.expires_at > utcnow()
        and row.lease_until and row.lease_until > utcnow())


async def authorized(token, dispatch):
    try:
        if not await asyncio.to_thread(adapter.source_current):
            return False
        async with authority(token, dispatch.creation_id) as (tx, session, creation, identity, _, binding):
            row = await locked(tx, dispatch.conversation_id, binding)
            result = binding == dispatch.binding and live(row, dispatch)
            await final_authority(tx, session, creation, identity, binding)
            return result
    except (ControlError, HTTPException):
        return False


def usage_receipt(value):
    value = value if isinstance(value, dict) else {}
    tokens = {key: number for key, number in (value or {}).items() if key.endswith("_tokens")
        and type(number) is int and 0 <= number <= 1_000_000_000}
    return {"known": bool(tokens), "tokens": tokens or None, "cost_usd": None}


async def settle(dispatch, usage, failure):
    """Internal frozen business binding: usage survives customer auth/profile revocation."""
    async with db.transaction(dispatch.business_id, dispatch.environment_id) as tx:
        await policy.lock(tx, dispatch.business_id, dispatch.environment_id)
        row = await tx.scalar(select(Conversation).where(Conversation.id == dispatch.conversation_id).with_for_update())
        if not row or row.payload.get("customer_text_binding") != dispatch.binding:
            raise ControlError(409, "text_attempt_unavailable")
        attempt = await tx.scalar(select(Event).where(Event.conversation_id == row.id,
            Event.event_key == "attempt:" + dispatch.request_id))
        if not attempt or attempt.payload["run_id"] != dispatch.run_id or attempt.payload["epoch"] != dispatch.epoch:
            raise ControlError(409, "text_attempt_unavailable")
        await core.add_event(tx, row, "usage:" + dispatch.request_id, "provider_usage",
            {"request_id": dispatch.request_id, "run_id": dispatch.run_id, "model": adapter.MODEL,
                "usage": usage_receipt(usage), "failure_code": failure})


async def finish(token, dispatch, output, failure):
    async with authority(token, dispatch.creation_id) as (tx, session, creation, identity, _, binding):
        row = await locked(tx, dispatch.conversation_id, binding)
        if binding != dispatch.binding or not live(row, dispatch):
            raise ControlError(409, "stale_text_attempt")
        payload = {"request_id": dispatch.request_id, "status": "failed" if failure else "succeeded",
            "failure_code": failure, "provider_replayed": False}
        if not failure:
            for call in output.calls:
                result = await core.patch_need(tx, row, NeedPatch.model_validate(core_arguments(call)))
                await core.add_event(tx, row, "need:" + dispatch.request_id, "tool",
                    {"name": "need.patch", "result": result})
            payload["reply"] = output.reply
        await core.add_event(tx, row, "result:" + dispatch.request_id, "customer_text_result", payload)
        row.owner, row.lease_until = None, None
        result = {"turn": payload, **await view(tx, row)}
        await final_authority(tx, session, creation, identity, binding)
        return result


async def turn(token, creation_id, conversation_id, value):
    reserved = await prepare(token, creation_id, conversation_id, value)
    if not isinstance(reserved, Dispatch):
        return reserved
    output, usage, failure = None, None, None
    try:
        if not await authorized(token, reserved):
            raise RunnerError("authorization_revoked")
        output, usage = await adapter.run(reserved.context, reserved.event_id, reserved.revision,
            lambda: authorized(token, reserved))
    except RunnerError as error:
        usage, failure = error.receipt, error.code
    except asyncio.CancelledError as error:
        await asyncio.shield(settle(reserved, getattr(error, "receipt", None), "request_interrupted"))
        raise
    await settle(reserved, usage, failure)
    if not await authorized(token, reserved):
        raise ControlError(409, "text_authorization_changed")
    return await finish(token, reserved, output, failure)
