"""Owned local text sessions, durable single dispatch and separate usage settlement."""
import asyncio
import hashlib
import re
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import or_, select, text

from .. import knowledge, policy
from .. import service as core
from ..config import settings
from ..contracts import KnowledgeQuery, NeedPatch
from ..control.models import BusinessGrant, Session
from ..control.routes import ControlError, identifier, open_cursor, scope, seal_cursor, token_hash
from ..creation.routes import owned
from ..creation.service import binding as owner_binding
from ..creation.service import current_actor, digest
from ..creation_registration import service as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..customer_profile import instructions
from ..customer_profile import service as profiles
from ..customer_profile.models import Admission
from ..db import db
from ..models import Business, Case, CaseSource, Conversation, Event, new_id, utcnow
from ..tasks.codex_transport import RunnerError
from ..text_tools import core_arguments
from . import adapter, execution

# Match the existing HTTP TextEvent wire. Private Quality/protection receipts
# remain available through their dedicated evidence adapter, never this DTO.
TEXT_EVENTS = ("created", "client_transcript", "tool", "provider_attempt", "provider_usage",
    "customer_text_result", "finalized")


def guard(*, execution=True):
    cfg = settings()
    if (cfg.control_mode != "local" or not (cfg.environment in {"local", "test"}
            or cfg.environment.startswith("test-")) or not cfg.customer_enabled
            or not cfg.customer_text_enabled or (execution and not cfg.customer_text_runner_enabled)
            or cfg.voice_enabled or cfg.smtp_enabled):
        raise ControlError(403, "customer_text_unavailable")


def bearer_token(value):
    if not re.fullmatch(r"Bearer [A-Za-z0-9_-]{64}", value):
        raise ControlError(401, "unauthenticated")
    return value[7:]


async def customer_session(tx, token):
    session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(token)))
    if not session or session.revoked_at or session.expires_at <= utcnow():
        raise ControlError(401, "unauthenticated")
    await tx.execute(text("SELECT set_config('pinet.control_user', :u, true), "
        "set_config('pinet.control_token', '', true)"), {"u": session.user_id})
    return session


@asynccontextmanager
async def authority(token, creation_id, *, calibration=None):
    guard()
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        async with transaction_authority(tx, session, creation_id, calibration=calibration) as context:
            yield context


@asynccontextmanager
async def transaction_authority(tx, session, creation_id, *, calibration=None, principal=None):
    """One native binding body; caller has already authenticated its principal."""
    identity = await profiles.pin_registration(tx, creation_id)
    creation = await owned(tx, session, creation_id, lock=True)
    if principal is not None:
        await principal.bind(tx, session, creation, identity)
    task = None
    if calibration is not None:
        from ..customer_agents import lab
        task = await lab.observe(tx, session, creation, identity, calibration)
    current = await profiles.projection(tx, session, creation, registration_identity=identity)
    if not current["profile_current"]:
        raise ControlError(409, "customer_profile_not_current")
    admitted = current["admission"]
    registry = await tx.get(Registration, admitted["registration_id"])
    admission = await tx.get(Admission, admitted["admission_id"])
    business = await tx.get(Business, admitted["business_id"])
    if not registry or not admission or not business:
        raise ControlError(409, "customer_profile_not_current")
    if task:
        lab.profile_matches(task, admission)
    await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": business.id})
    await policy.require(tx, simulation=True, tool="knowledge.resolve")
    await policy.require(tx, simulation=True, tool="need.patch")
    binding = {"creation_id": creation.id, "user_id": session.user_id, "session_id": session.id,
        "environment_id": settings().environment, "registration_id": registry.id,
        "registration_fingerprint": registry.fingerprint,
        "admission_id": admission.id, "admission_fingerprint": admission.fingerprint,
        "profile": admitted, "adapter": adapter.VERSION, "model": adapter.MODEL}
    if task:
        binding["task_calibration"] = task
        if task.get("execution_profile") is not None:
            pin = execution.current(execution.retained(task["execution_profile"]))
            binding.update(execution_profile=pin.model_dump(mode="json"), model=pin.text.model)
    yield tx, session, creation, identity, business, binding
    if principal is not None:
        await principal.check(tx)


@dataclass(frozen=True)
class _BearerPrincipal:
    """Ephemeral compatibility wrapper; never stored in a native receipt."""
    token: str

    def text_authority(self, creation_id, *, calibration=None):
        if isinstance(calibration, dict) and calibration.get("execution_profile") is not None:
            raise ControlError(409, "conversation_task_not_current")
        return authority(self.token, creation_id, calibration=calibration)

    def agent_authority(self, creation_id, agent_id, *, writing):
        from ..customer_agents import service as agents
        return agents.authority(self.token, creation_id, agent_id, writing=writing)

    async def reserve(self, tx, binding, **fields):
        # Existing public/operator bearer policy is unchanged. Only the new
        # internal Session principal requires a claimed Task allocation.
        return None

    async def start(self, creation_id, value, **options):
        return await start(self.token, creation_id, value, **options)

    async def turn(self, creation_id, conversation_id, value, **options):
        return await turn(self.token, creation_id, conversation_id, value, **options)


def _bearer(token):
    return _BearerPrincipal(token)


async def historical_identity(tx, session, creation, row, frozen):
    """Validate retained immutable identity and fresh ownership, never execution freshness."""
    registry = await tx.scalar(select(Registration).where(Registration.id == frozen["registration_id"])
        .execution_options(populate_existing=True))
    admission = await tx.scalar(select(Admission).where(Admission.id == frozen["admission_id"])
        .execution_options(populate_existing=True))
    if (not registry or not admission or owner_binding(registry) != owner_binding(creation)
            or digest(registrations.stored_material(registry)) != registry.fingerprint
            or registry.fingerprint != frozen["registration_fingerprint"]
            or admission.fingerprint != frozen["admission_fingerprint"]
            or admission.registration_id != registry.id
            or admission.registration_fingerprint != registry.fingerprint
            or owner_binding(admission) != owner_binding(creation)):
        raise ControlError(404, "not_found")
    retained = profiles.admitted(admission).model_dump(mode="json")
    # Revocation is mutable terminal metadata; the original binding remains immutable.
    retained["revoked_at"] = None
    if (retained != frozen["profile"] or row.business_id != registry.business_id
            or row.environment_id != registry.environment_id
            or frozen["environment_id"] != registry.environment_id
            or frozen["creation_id"] != creation.id or frozen["user_id"] != session.user_id):
        raise ControlError(404, "not_found")
    await historical_business(tx, session, creation, registry)


async def historical_business(tx, session, creation, registry):
    pair = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
        .where(BusinessGrant.id == registry.grant_id, BusinessGrant.enabled,
            BusinessGrant.business_id == registry.business_id, BusinessGrant.portfolio_id == creation.portfolio_id,
            BusinessGrant.organization_id == creation.organization_id,
            BusinessGrant.environment_id == settings().environment)
        .execution_options(populate_existing=True))).first()
    if not pair or (pair[1].site_id, pair[1].canonical_host) != (registry.site_id, registry.canonical_host):
        raise ControlError(404, "not_found")
    await current_actor(tx, session, creation.portfolio_id)


def retained_binding(row, creation_id, session):
    frozen = row.payload.get("customer_text_binding") if row else None
    try:
        expected_model = execution.text_model(frozen) if isinstance(frozen, dict) else None
    except ValueError:
        raise ControlError(404, "not_found") from None
    if (not row or row.payload.get("transport") != adapter.VERSION
            or not isinstance(frozen, dict) or frozen.get("creation_id") != creation_id
            or frozen.get("user_id") != session.user_id or frozen.get("environment_id") != settings().environment
            or frozen.get("adapter") != adapter.VERSION or frozen.get("model") != expected_model
            or not all(key in frozen for key in ("registration_id", "registration_fingerprint",
                "admission_id", "admission_fingerprint", "profile"))):
        raise ControlError(404, "not_found")
    return frozen


@asynccontextmanager
async def historical_authority(token, creation_id, conversation_id):
    """Current owner may inspect/end retained history; this grants no provider authority."""
    guard(execution=False)
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation_id, conversation_id = identifier(creation_id), identifier(conversation_id)
        candidate = await profiles.registry_row(tx, creation_id)
        if not candidate or digest(registrations.stored_material(candidate)) != candidate.fingerprint:
            raise ControlError(404, "not_found")
        # RLS-visible server registration supplies the business, never a browser scope.
        await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": candidate.business_id})
        preliminary = await tx.get(Conversation, conversation_id)
        frozen = retained_binding(preliminary, creation_id, session)
        registry = await tx.get(Registration, frozen["registration_id"])
        if not registry or registry.creation_id != creation_id or registry.business_id != candidate.business_id:
            raise ControlError(404, "not_found")
        # Pin the actual historical registration before actor/Creation/Conversation locks.
        await lifetime(tx, settings().environment, registry.id)
        creation = await owned(tx, session, creation_id, lock=True)
        row = await tx.scalar(select(Conversation).where(Conversation.id == conversation_id)
            .with_for_update().execution_options(populate_existing=True))
        if not row or row.payload.get("transport") != adapter.VERSION or row.payload.get("customer_text_binding") != frozen:
            raise ControlError(404, "not_found")
        await historical_identity(tx, session, creation, row, frozen)
        yield tx, row
        await historical_identity(tx, session, creation, row, frozen)
        if not await asyncio.to_thread(adapter.source_current):
            raise ControlError(503, "source_unavailable")


def history_cursor(session, creation_id, kind, after, *, conversation_id=None, expires=None):
    scope_id = creation_id if conversation_id is None else creation_id + ":" + conversation_id
    return seal_cursor({"binding": [session.user_id, session.id, scope_id, settings().environment],
        "snapshot": "customer-text.history." + kind,
        "after": after, "expires": expires or int(utcnow().timestamp()) + 300})


def history_options(limit, cursor, maximum):
    if (type(limit) is not int or not 1 <= limit <= maximum
            or (cursor is not None and (not isinstance(cursor, str) or not 1 <= len(cursor) <= 2048))):
        raise ControlError(400, "invalid_request")


async def sessions(token, creation_id, *, limit=20, cursor=None):
    """Bounded metadata discovery, independently of paid Profile/TTL/runner readiness."""
    history_options(limit, cursor, 50)
    guard(execution=False)
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation_id = identifier(creation_id)
        candidate = await profiles.registry_row(tx, creation_id)
        if candidate and digest(registrations.stored_material(candidate)) != candidate.fingerprint:
            raise ControlError(404, "not_found")
        if candidate:
            await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": candidate.business_id})
        statement = select(Conversation).where(
            Conversation.environment_id == settings().environment,
            Conversation.payload["transport"].astext == adapter.VERSION,
            Conversation.payload["customer_text_binding"]["creation_id"].astext == creation_id,
            Conversation.payload["customer_text_binding"]["user_id"].astext == session.user_id)
        expires = int(utcnow().timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, creation_id, "customer-text.history.sessions")
            anchor = await tx.scalar(statement.where(Conversation.id == after))
            if not anchor:
                raise ControlError(409, "history_cursor_unavailable")
            statement = statement.where(or_(Conversation.created_at < anchor.created_at,
                (Conversation.created_at == anchor.created_at) & (Conversation.id < anchor.id)))
        rows = list(await tx.scalars(statement.order_by(Conversation.created_at.desc(), Conversation.id.desc()).limit(limit + 1)))
        frozen = [retained_binding(row, creation_id, session) for row in rows]
        registry_ids = {identifier(item["registration_id"]) for item in frozen}
        if candidate:
            registry_ids.add(candidate.id)
        # Acquire every known historical lifetime before actor/Creation locks.
        for registry_id in sorted(registry_ids):
            await lifetime(tx, settings().environment, registry_id)
        creation = await owned(tx, session, creation_id, lock=True)
        if candidate:
            await historical_business(tx, session, creation, candidate)
        elif rows:
            raise ControlError(404, "not_found")
        for row, binding in zip(rows, frozen, strict=True):
            if row.business_id != candidate.business_id:
                raise ControlError(404, "not_found")
            await historical_identity(tx, session, creation, row, binding)
        # Observe mutable state and retained identity again after the last awaited lock/read.
        for row, binding in zip(rows, frozen, strict=True):
            await tx.refresh(row)
            if row.payload.get("customer_text_binding") != binding:
                raise ControlError(404, "not_found")
            await historical_identity(tx, session, creation, row, binding)
        await current_actor(tx, session, creation.portfolio_id)
        if candidate:
            await historical_business(tx, session, creation, candidate)
        if not await asyncio.to_thread(adapter.source_current):
            raise ControlError(503, "source_unavailable")
        return {"creation_id": creation_id, "sessions": [{"conversation_id": row.id,
            "created_at": row.created_at, "state": row.state, "need_revision": row.need_revision}
            for row in rows[:limit]], "has_more": len(rows) > limit,
            "next_cursor": history_cursor(session, creation_id, "sessions", rows[limit - 1].id,
                expires=expires) if len(rows) > limit else None,
            "transport": adapter.VERSION, "scope": "local_authenticated_test"}


async def events(token, creation_id, conversation_id, *, limit=100, cursor=None):
    """Traverse retained events in chronological pages; never renew or dispatch."""
    history_options(limit, cursor, 100)
    async with historical_authority(token, creation_id, conversation_id) as (tx, row):
        session = await customer_session(tx, token)
        creation_id, conversation_id = row.payload["customer_text_binding"]["creation_id"], row.id
        statement = select(Event).where(Event.conversation_id == row.id, Event.kind.in_(TEXT_EVENTS))
        expires = int(utcnow().timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, creation_id + ":" + conversation_id,
                "customer-text.history.events")
            anchor = await tx.scalar(statement.where(Event.id == after))
            if not anchor:
                raise ControlError(409, "history_cursor_unavailable")
            statement = statement.where(Event.sequence < anchor.sequence)
        rows = list(await tx.scalars(statement.order_by(Event.sequence.desc()).limit(limit + 1)))
        return {"creation_id": creation_id, "conversation_id": conversation_id,
            "events": [{"event_id": item.id, "sequence": item.sequence, "kind": item.kind, "data": event_data(item)}
                for item in reversed(rows[:limit])], "has_more": len(rows) > limit,
            "next_cursor": history_cursor(session, creation_id, "events", rows[limit - 1].id,
                conversation_id=conversation_id, expires=expires) if len(rows) > limit else None,
            "transport": adapter.VERSION, "scope": "local_authenticated_test"}


async def final_authority(tx, session, creation, identity, expected):
    if not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "source_unavailable")
    if "task_calibration" in expected:
        from ..customer_agents import lab
        if await lab.observe(tx, session, creation, identity, expected["task_calibration"]) != expected["task_calibration"]:
            raise ControlError(409, "conversation_task_not_current")
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
    values = list(await tx.scalars(select(Event).where(Event.conversation_id == row.id, Event.kind.in_(TEXT_EVENTS))
        .order_by(Event.sequence.desc()).limit(101)))
    return [{"event_id": item.id, "sequence": item.sequence, "kind": item.kind, "data": event_data(item)}
        for item in reversed(values[:100])], len(values) > 100


def event_data(event):
    # Keep authoritative attempt provenance in DB; private case identity is not
    # part of ordinary customer history, context or the existing TextEvent wire.
    return {key: value for key, value in event.payload.items() if key != "protected_case_sha256"}


async def view(tx, row):
    events, more = await history(tx, row)
    return {"conversation_id": row.id, "creation_id": row.payload["customer_text_binding"]["creation_id"],
        "state": row.state, "need_revision": row.need_revision, "need": row.payload["need"],
        "events": events, "history_truncated": more, "transport": adapter.VERSION,
        "model": row.payload["customer_text_binding"]["model"], "scope": "local_authenticated_test", "channel_activation": "not_performed",
        "calibration_status": "UNVERIFIED"}


async def start(token, creation_id, value, *, calibration=None, protection=None):
    return await _start(_bearer(token), creation_id, value, calibration=calibration, protection=protection)


async def _start(principal, creation_id, value, *, calibration=None, protection=None):
    pin = getattr(principal, "execution_profile", None)
    if not (adapter.runner_ready_high(pin) if pin is not None else adapter.runner_ready()) or not await asyncio.to_thread(adapter.source_current):
        raise ControlError(503, "runner_unavailable")
    async with principal.text_authority(creation_id, calibration=calibration) as (tx, session, creation, identity, business, binding):
        if str(value.admission_id) != binding["admission_id"]:
            raise ControlError(409, "profile_admission_conflict")
        from ..customer_agents import protection as protected
        proof = protected.with_parent(protection, binding) if protection is not None else None
        material = {"request": value.model_dump(mode="json"), "binding": binding}
        if proof is not None:
            material["protected_case_sha256"] = digest(proof)
        fingerprint = digest(material)
        old = await tx.scalar(select(Conversation).where(
            Conversation.payload["customer_text_start_key"].astext == str(value.request_id)).with_for_update())
        if old:
            if old.payload["start_fingerprint"] != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            row = await locked(tx, old.id, binding)
            if await protected.observe(tx, row) != proof:
                raise ControlError(409, "idempotency_conflict")
        else:
            if proof is not None:
                await protected.prior_cases(tx, business.id, settings().environment, proof)
            elif not await protected.unbound_allowed(tx, business.id, settings().environment, binding):
                raise ControlError(409, "protected_case_binding_required")
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
            if proof is not None:
                row.payload = {**row.payload, "protected_case": proof}
                await core.add_event(tx, row, protected.EVENT_KEY, protected.VERSION,
                    {"proof": proof, "sha256": digest(proof)})
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
    async with historical_authority(token, creation_id, conversation_id) as (tx, row):
        return await view(tx, row)


async def end(token, creation_id, conversation_id):
    async with historical_authority(token, creation_id, conversation_id) as (tx, row):
        await core.finalize(tx, row)
        row.owner = None
        row.epoch += 1
        return await view(tx, row)


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
    protection_sha256: str | None = None


async def result_event(tx, row, key):
    return await tx.scalar(select(Event).where(Event.conversation_id == row.id, Event.event_key == "result:" + key))


async def prepare(token, creation_id, conversation_id, value, *, calibration=None):
    return await _prepare(_bearer(token), creation_id, conversation_id, value, calibration=calibration)


async def _prepare(principal, creation_id, conversation_id, value, *, calibration=None):
    async with principal.text_authority(creation_id, calibration=calibration) as (tx, session, creation, identity, business, binding):
        row = await locked(tx, conversation_id, binding)
        from ..customer_agents import protection
        await protection.turn(tx, row, value)
        proof = await protection.observe(tx, row)
        proof_material = {"protected_case_sha256": digest(proof)} if proof is not None else {}
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
        pin = execution.binding_pin(binding)
        if not (adapter.runner_ready_high(pin) if pin is not None else adapter.runner_ready()) or not await asyncio.to_thread(adapter.source_current):
            raise ControlError(503, "runner_unavailable")
        event = await core.add_event(tx, row, "client:" + request, "client_transcript", {"text": value.message})
        resolved = await knowledge.resolve(tx, KnowledgeQuery(query=value.message[:500]))
        await core.add_event(tx, row, "knowledge:" + request, "tool", {"name": "knowledge.resolve", "result": resolved})
        events, _ = await history(tx, row)
        context = {"client_message": value.message, "need_revision": row.need_revision, "need": row.payload["need"],
            "knowledge": resolved, "history": [e for e in events if e["kind"] in
                {"client_transcript", "customer_text_result"}][-20:], "evidence_event_id": event.id}
        if "task_calibration" in binding:
            # The model needs the task data/version, never principal/session IDs.
            context["agent_task"] = {key: binding["task_calibration"][key] for key in
                ("agent_id", "config_revision", "config_sha256", "specification")}
        row.owner, row.epoch = new_id(), row.epoch + 1
        row.lease_until = utcnow() + timedelta(seconds=settings().chat_runner_seconds + 10)
        _, input_text, schema_text = adapter.material(context, event.id, row.need_revision)
        attempt = {"request_id": request, "fingerprint": fingerprint, "run_id": row.owner, "epoch": row.epoch,
            "need_revision": row.need_revision, "deadline": row.lease_until.isoformat(), "model": binding["model"],
            "binding_sha256": digest(binding),
            "prompt_sha256": hashlib.sha256(input_text.encode("utf-8")).hexdigest(),
            "schema_sha256": hashlib.sha256(schema_text.encode("utf-8")).hexdigest()}
        attempt.update(proof_material)
        attempt.update(execution.call_fields(binding, "customer_text"))
        await principal.reserve(tx, binding, kind="customer_text", conversation_id=row.id,
            request_id=request, call_key="attempt:" + request, number=1, model=binding["model"],
            prompt_sha256=attempt["prompt_sha256"], schema_sha256=attempt["schema_sha256"],
            request_input_sha256=digest(value.message),
            protected_case_sha256=proof_material.get("protected_case_sha256"))
        await core.add_event(tx, row, "attempt:" + request, "provider_attempt", attempt)
        await final_authority(tx, session, creation, identity, binding)
        return Dispatch(business.id, settings().environment, row.id, creation.id, request, row.owner,
            row.epoch, row.need_revision, event.id, context, binding, proof_material.get("protected_case_sha256"))


def live(row, dispatch):
    return bool(row and row.state != "finalized" and row.owner == dispatch.run_id and row.epoch == dispatch.epoch
        and row.need_revision == dispatch.revision and row.expires_at > utcnow()
        and row.lease_until and row.lease_until > utcnow())


async def authorized(token, dispatch):
    return await _authorized(_bearer(token), dispatch)


async def _authorized(principal, dispatch):
    try:
        if not await asyncio.to_thread(adapter.source_current):
            return False
        async with principal.text_authority(dispatch.creation_id, calibration=dispatch.binding.get("task_calibration")) as (tx, session, creation, identity, _, binding):
            row = await locked(tx, dispatch.conversation_id, binding)
            result = binding == dispatch.binding and live(row, dispatch) and await protected_current(tx, row, dispatch)
            await final_authority(tx, session, creation, identity, binding)
            return result
    except (ControlError, HTTPException, ValueError, RunnerError):
        return False


async def protected_current(tx, row, dispatch):
    from .. import evaluation_contract
    from ..customer_agents import protection

    proof = await protection.observe(tx, row)
    return (digest(proof) if proof is not None else None) == dispatch.protection_sha256 and (
        proof is None or proof["evaluator_sha256"] == evaluation_contract.fingerprint())


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
            {"request_id": dispatch.request_id, "run_id": dispatch.run_id, "model": dispatch.binding["model"],
                "usage": usage_receipt(usage), "failure_code": failure,
                **execution.retained_fields(dispatch.binding, "customer_text"),
                **({"execution": execution.observation(usage)} if execution.binding_pin(dispatch.binding) is not None else {})})


async def finish(token, dispatch, output, failure):
    return await _finish(_bearer(token), dispatch, output, failure)


async def _finish(principal, dispatch, output, failure):
    async with principal.text_authority(dispatch.creation_id, calibration=dispatch.binding.get("task_calibration")) as (tx, session, creation, identity, _, binding):
        row = await locked(tx, dispatch.conversation_id, binding)
        if binding != dispatch.binding or not live(row, dispatch) or not await protected_current(tx, row, dispatch):
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


async def turn(token, creation_id, conversation_id, value, *, calibration=None):
    return await _turn(_bearer(token), creation_id, conversation_id, value, calibration=calibration)


async def _turn(principal, creation_id, conversation_id, value, *, calibration=None):
    reserved = await _prepare(principal, creation_id, conversation_id, value, calibration=calibration)
    if not isinstance(reserved, Dispatch):
        return reserved
    output, usage, failure = None, None, None
    try:
        if not await _authorized(principal, reserved):
            raise RunnerError("authorization_revoked")
        pin = execution.binding_pin(reserved.binding)
        args = (reserved.context, reserved.event_id, reserved.revision, lambda: _authorized(principal, reserved))
        output, usage = await adapter.run_high(pin, *args) if pin is not None else await adapter.run(*args)
        if pin is not None and not execution.verified(usage, reserved.binding, "customer_text"):
            raise RunnerError("instructions_changed", usage)
    except RunnerError as error:
        usage, failure = error.receipt, error.code
    except asyncio.CancelledError as error:
        await asyncio.shield(settle(reserved, getattr(error, "receipt", None), "request_interrupted"))
        raise
    await settle(reserved, usage, failure)
    if not await _authorized(principal, reserved):
        raise ControlError(409, "text_authorization_changed")
    return await _finish(principal, reserved, output, failure)
