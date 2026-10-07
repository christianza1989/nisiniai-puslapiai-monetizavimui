import hashlib
import hmac
import json
import re
from datetime import timedelta

from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func, select, text

from . import agent_instructions, budget, customer_language, memory, policy, profiles
from . import knowledge as knowledge_store
from .config import settings
from .contracts import ContactInput, KnowledgeQuery, MemoryRecall, NeedPatch, Start, ToolCall
from .db import db
from .models import (
    Admission,
    Artifact,
    Business,
    Case,
    CaseSource,
    Contact,
    Conversation,
    Event,
    Job,
    Outbox,
    new_id,
    utcnow,
)
from .need_values import canonical_value
from .security import digest

BASE_PROMPT = agent_instructions.compose('traktoriupadangos', 'conversation').prompt
PROMPT_HASH = digest(BASE_PROMPT)


async def business(site_id):
    async with db.registry() as tx:
        item = await tx.scalar(select(Business).where(Business.site_id == site_id))
        if not item:
            raise HTTPException(404, "unknown site")
        return item


def scope(item):
    return {"business_id": item.id, "environment_id": settings().environment}


async def conversation(tx, conversation_id, token=None, epoch=None):
    item = await tx.scalar(select(Conversation).where(Conversation.id == conversation_id).with_for_update())
    if not item:
        raise HTTPException(404, "conversation unavailable")
    if token is not None and (not hmac.compare_digest(item.token_hash, digest(token)) or item.expires_at < utcnow()):
        raise HTTPException(401, "session expired or invalid")
    if epoch is not None and (item.epoch != epoch or not item.lease_until or item.lease_until < utcnow()):
        raise HTTPException(409, "stale voice owner")
    return item


async def add_event(tx, convo, key, kind, payload):
    old = await tx.scalar(select(Event).where(Event.conversation_id == convo.id, Event.event_key == key))
    if old:
        if old.kind != kind or old.payload != payload:
            raise HTTPException(409, "idempotency conflict")
        return old
    sequence = 1 + (await tx.scalar(select(func.max(Event.sequence)).where(Event.conversation_id == convo.id)) or 0)
    event = Event(id=new_id(), business_id=convo.business_id, environment_id=convo.environment_id,
                  conversation_id=convo.id, event_key=key, kind=kind, sequence=sequence, payload=payload)
    tx.add(event)
    await tx.flush()
    if kind == 'client_transcript':
        hint = customer_language.select(payload.get('text', ''), event.id, convo.payload.get('language_hint'))
        if hint:
            convo.payload = {**convo.payload, 'language_hint': hint}
        convo.payload = {**convo.payload, 'latest_client_event_id': event.id, 'routing_hint': None}
    return event


async def enqueue(tx, convo, kind):
    if not await tx.scalar(select(Job.id).where(Job.conversation_id == convo.id, Job.kind == kind)):
        tx.add(Job(business_id=convo.business_id, environment_id=convo.environment_id,
                   conversation_id=convo.id, kind=kind))


async def start(item, data: Start, simulation=False):
    cfg = settings()
    knowledge = data.knowledge
    profile = profiles.get(item.site_id, item.canonical_host)
    from .adaptive_instructions import selected
    release = selected(item.site_id)
    prompt = release.prompt
    knowledge_store.validate(item, knowledge)
    if data.mode == "simulation" and not simulation:
        raise HTTPException(403, "simulation is internal only")
    if not simulation and (item.site_id != "traktoriupadangos" or not cfg.voice_ready):
        raise HTTPException(503, "voice_not_ready")
    if not simulation and cfg.allow_simulation:
        raise HTTPException(503, "disable_simulation_before_live_voice")
    request_id = str(data.request_id)
    token = hmac.new(cfg.worker_secret.encode(), f"{item.id}:{cfg.environment}:{request_id}".encode(), hashlib.sha256).hexdigest()
    fingerprint = digest(json.dumps({"pages": [p.projection_hash for p in knowledge.pages],
                                    "profile_hash": digest(prompt),
                                    "notice": data.notice_version, "mode": data.mode, "remember": data.remember,
                                    "memory": digest(data.memory_token or "")}, sort_keys=True))
    cid, case_id = new_id(), new_id()
    async with db.transaction(item.id, cfg.environment) as tx:
        await policy.lock(tx, item.id, cfg.environment)
        from .onboarding import status as readiness
        if not (await readiness(tx, item.site_id))['source_ready']:
            raise HTTPException(409, 'site_source_not_admitted')
        await tx.execute(text("SELECT pg_advisory_xact_lock(724930)"))
        authority, policy_revision = await policy.require(tx, simulation=simulation)
        previous = await tx.scalar(select(Conversation).where(Conversation.payload["start_request_id"].astext == request_id))
        if previous:
            if previous.payload["start_fingerprint"] != fingerprint or previous.state == "finalized":
                raise HTTPException(409, "session_creation_conflict")
            memory_token = None
            if previous.visitor_id:
                from .models import Visitor
                visitor = await tx.get(Visitor, previous.visitor_id)
                if visitor and not visitor.revoked_at and visitor.expires_at > utcnow():
                    memory_token = memory.credential(item.id, cfg.environment, visitor.payload["creation_seed"])
            return {"conversation_id": previous.id, "session_token": token, "state": previous.state,
                    "test": simulation, "memory_token": memory_token, "memory_max_age": cfg.retention_days * 86400}
        visitor, memory_token = await memory.attach(tx, item, data, request_id)
        await knowledge_store.register(tx, item, knowledge)
        if not simulation:
            active = select(Admission).where(Admission.environment_id == cfg.environment,
                                              Admission.expires_at > utcnow())
            all_active = (await tx.scalars(active)).all()
            if (len(all_active) >= cfg.global_sessions or
                    sum(a.business_id == item.id for a in all_active) >= min(cfg.per_site_sessions, authority.max_sessions)):
                raise HTTPException(429, "session_capacity")
            midnight = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            reserved = (await tx.scalars(select(Admission).where(Admission.environment_id == cfg.environment,
                                                                 Admission.created_at >= midnight))).all()
            if (sum(a.reserved_seconds for a in reserved) + cfg.session_seconds > cfg.global_daily_reserved_seconds or
                sum(a.reserved_seconds for a in reserved if a.business_id == item.id) + cfg.session_seconds >
                    min(cfg.per_site_daily_reserved_seconds, authority.daily_reserved_seconds)):
                raise HTTPException(429, "session_budget")
            tx.add(Admission(id=cid, **scope(item), expires_at=utcnow() + timedelta(seconds=cfg.session_seconds),
                             reserved_seconds=cfg.session_seconds))
            await budget.reserve(tx, item.id, authority, f"voice:{cid}", cfg.voice_cost_ceiling_microusd)
        tx.add(Case(id=case_id, **scope(item), payload={"source": "voice", "test": simulation}))
        await tx.flush()
        tx.add(CaseSource(**scope(item), case_id=case_id, source_system="voice_core",
                          site_id=item.site_id, source_record_id=cid))
        convo = Conversation(id=cid, **scope(item), case_id=case_id, token_hash=digest(token),
                             visitor_id=visitor.id if visitor else None,
                             expires_at=utcnow() + timedelta(seconds=cfg.session_seconds + 1800),
                             state="created", payload={"knowledge": knowledge.model_dump(mode="json"),
                             "notice_version": data.notice_version, "test": simulation,
                             "start_request_id": request_id, "start_fingerprint": fingerprint,
                             "policy_revision": policy_revision,
                             "cost_ceiling_microusd": 0 if simulation else cfg.voice_cost_ceiling_microusd,
                             "release_hash": release.hash, "instruction_sources": list(release.sources),
                             "prompt": prompt, "profile_id": profile.site_id,
                             "model": cfg.live_model, "need": {}, "ui": None, "coverage": "text_only"})
        tx.add(convo)
        await tx.flush()
        await add_event(tx, convo, "start", "created", {"test": simulation})
    return {"conversation_id": cid, "session_token": token, "state": "created", "test": simulation,
            "memory_token": memory_token, "memory_max_age": cfg.retention_days * 86400}


async def finalize(tx, convo):
    if convo.state == "finalized":
        return
    convo.state = "finalized"
    convo.lease_until = utcnow()
    await add_event(tx, convo, "finalized", "finalized", {})
    await enqueue(tx, convo, "analysis")
    await enqueue(tx, convo, "quality")
    # End only the live slot; daily inference reservation remains conservative.
    slot = await tx.get(Admission, convo.id)
    if slot:
        slot.expires_at = utcnow()


async def request_end(tx, convo):
    """Let a live owner flush its final audio transcript before queuing post-call jobs."""
    live_transport = not convo.payload["test"] or convo.payload.get("m0_probe") is True
    if (live_transport and convo.state == "active" and convo.owner
            and convo.lease_until and convo.lease_until > utcnow()):
        convo.payload = {**convo.payload, "stop_requested": True}
        await add_event(tx, convo, "end-requested", "end_requested", {})
        return "ending"
    await finalize(tx, convo)
    return "finalized"


async def submit_contact(tx, convo, data: ContactInput):
    value = data.value
    if data.channel == "email":
        try:
            value = str(TypeAdapter(EmailStr).validate_python(value))
        except ValueError:
            raise HTTPException(422, "invalid_email") from None
    elif not re.fullmatch(r"\+?[0-9 ()-]{7,25}", value):
        raise HTTPException(422, "invalid_phone")
    existing = await tx.scalar(select(Contact).where(Contact.conversation_id == convo.id,
                                                     Contact.channel == data.channel))
    if existing and existing.value != value:
        revision = existing.payload.get("revision", 1)
        if data.base_revision != revision:
            raise HTTPException(409, "stale_contact_revision")
        deliveries = (await tx.scalars(select(Outbox).where(Outbox.conversation_id == convo.id,
            Outbox.kind == data.channel).with_for_update())).all()
        if any(row.state in {"dispatched", "accepted", "unknown"} for row in deliveries):
            raise HTTPException(409, "contact_delivery_started")
        for row in deliveries:
            if row.state == "prepared":
                row.state = "superseded_contact"
        existing.value = value
        existing.payload = {**existing.payload, "revision": revision + 1, "verified": False,
                            "consent_at": utcnow().isoformat(), "notice_version": data.notice_version}
        await add_event(tx, convo, f"contact:{data.channel}:{revision + 1}", "contact_corrected",
                        {"channel": data.channel, "ref": existing.id, "revision": revision + 1})
        # No raw contact value is written into the transcript, model input or audit.
        job = await tx.scalar(select(Job).where(Job.conversation_id == convo.id, Job.kind == "followup").with_for_update())
        if job and data.channel == "email":
            job.state, job.owner, job.lease_until = "queued", None, None
            job.generation += 1
            job.run_after = utcnow()
    if not existing:
        existing = Contact(id=new_id(), business_id=convo.business_id, environment_id=convo.environment_id,
                           conversation_id=convo.id, channel=data.channel, value=value,
                           payload={"purpose": data.purpose, "notice_version": data.notice_version,
                                    "revision": 1, "verified": False, "consent_at": utcnow().isoformat()})
        tx.add(existing)
        await tx.flush()
        await add_event(tx, convo, f"contact:{data.channel}", "contact_ready", {"channel": data.channel, "ref": existing.id})
    if data.channel == "email":
        await enqueue(tx, convo, "followup")
    return {"contact_id": existing.id, "saved": True, "channel": data.channel,
            "revision": existing.payload.get("revision", 1),
            "delivery": "pending" if data.channel == "email" else "channel_unavailable"}


async def patch_need(tx, convo, data: NeedPatch):
    profile = profiles.get(convo.payload["knowledge"]["site_id"], convo.payload["knowledge"]["canonical_host"])
    if set(data.fields) - profile.need_fields:
        raise HTTPException(422, "field_not_allowed_for_business_profile")
    if data.base_revision != convo.need_revision:
        raise HTTPException(409, "stale_need_revision")
    evidence = await tx.scalar(select(Event).where(Event.id == data.evidence_event_id,
                                                   Event.conversation_id == convo.id,
                                                   Event.kind == "client_transcript"))
    if not evidence:
        raise HTTPException(422, "client_evidence_required")
    payload = dict(convo.payload)
    need = dict(payload["need"])
    for key, value in data.fields.items():
        canonical = canonical_value(key, value)
        need[key] = {"value": canonical, "status": "proposed", "evidence": evidence.id}
        if canonical != value:
            need[key]['raw_value'] = value
    # An LLM flag is insufficient confirmation. Explicit UI confirmation is a separate future contract.
    payload["need"] = need
    payload["recommendations"] = []
    convo.payload = payload
    convo.need_revision += 1
    return {"revision": convo.need_revision, "fields": need, "recommendations_invalidated": True}


async def tool(tx, convo, data: ToolCall):
    if convo.state == "finalized":
        raise HTTPException(409, "conversation_finalized")
    await policy.require(tx, simulation=convo.payload["test"], tool=data.name)
    cached = await tx.scalar(select(Event).where(Event.conversation_id == convo.id,
                                                 Event.event_key == f"tool:{data.call_id}"))
    args_hash = digest(__import__("json").dumps(data.arguments, sort_keys=True))
    if cached and (cached.payload["name"] != data.name or cached.payload["args_hash"] != args_hash):
        raise HTTPException(409, "tool_idempotency_conflict")
    if data.name == "memory.recall":
        # Re-read authority on every call, including provider retries after device revocation.
        try:
            args = MemoryRecall.model_validate(data.arguments)
        except ValidationError:
            raise HTTPException(422, "unsupported memory arguments") from None
        result = await memory.recall(tx, convo, query=args.query, before_event_id=args.before_event_id)
        if not cached:
            await add_event(tx, convo, f"tool:{data.call_id}", "tool", {"name": data.name, "args_hash": args_hash,
                "result": {"status": result["status"], "evidence_refs": [e["event_id"]
                    for group in result["conversations"] for e in group["evidence"]]}})
        return result
    if data.name == "knowledge.resolve":
        try:
            args = KnowledgeQuery.model_validate(data.arguments)
        except ValidationError:
            raise HTTPException(422, "unsupported knowledge arguments") from None
        # A read retry gets current content, never an old source from event cache.
        result = await knowledge_store.resolve(tx, args)
        key = f"tool:{data.call_id}" if not cached else f"knowledge:{data.call_id}:{result.get('knowledge_revision', 'expired')}"
        await add_event(tx, convo, key, "tool", {"name": data.name, "args_hash": args_hash, "result": result})
        return result
    if cached:
        return cached.payload["result"]
    if data.name == "need.patch":
        try:
            patch = NeedPatch.model_validate(data.arguments)
        except ValidationError:
            raise HTTPException(422, "unsupported need arguments") from None
        result = await patch_need(tx, convo, patch)
    else:
        if data.arguments:
            raise HTTPException(422, "unsupported UI arguments")
        payload = dict(convo.payload)
        existing = payload.get("ui")
        request_id = existing["id"] if existing and existing["state"] in {"requested", "shown"} else new_id()
        payload["ui"] = {"id": request_id, "state": existing["state"] if existing and existing["id"] == request_id else "requested",
                         "fields": ["email", "phone"], "purpose": "followup"}
        convo.payload = payload
        result = {"status": "requested", "request_id": request_id}
    await add_event(tx, convo, f"tool:{data.call_id}", "tool", {"name": data.name, "args_hash": args_hash, "result": result})
    return result


async def public_status(tx, convo):
    from . import routing

    authority, policy_revision = await policy.read(tx)
    contacts = (await tx.scalars(select(Contact).where(Contact.conversation_id == convo.id))).all()
    artifacts = (await tx.scalars(select(Artifact).where(Artifact.conversation_id == convo.id).order_by(Artifact.revision.desc()))).all()
    return {"state": convo.state, "need_revision": convo.need_revision, "need": convo.payload["need"],
            "ui": convo.payload.get("ui"), "contacts": [{"channel": c.channel, "saved": True,
                "revision": c.payload.get("revision", 1)} for c in contacts],
            "followup": next((a.payload for a in artifacts if a.kind == "followup"), None),
            "test": convo.payload["test"], "policy_revision": policy_revision,
            "paused": authority.paused, "allowed_tools": authority.allowed_tools,
            "language_hint": convo.payload.get('language_hint'),
            "routing": routing.view(convo, authority, policy_revision)}
