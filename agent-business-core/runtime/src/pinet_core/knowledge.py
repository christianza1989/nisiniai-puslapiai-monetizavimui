"""Read only the edge's approved projection; durable revocations override all caches."""
import hashlib
import hmac
import json
import re
import time
from datetime import timedelta
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException
from sqlalchemy import select, text

from .config import settings
from .contracts import Knowledge, KnowledgeQuery, KnowledgeRevocation
from .models import Conversation, Event, KnowledgeState, utcnow
from .security import digest


def validate(item, data: Knowledge):
    if data.site_id != item.site_id or data.canonical_host != item.canonical_host:
        raise HTTPException(409, "knowledge mapping conflict")
    if not data.pages or any(not p.url.startswith(f"https://{item.canonical_host}/") for p in data.pages):
        raise HTTPException(409, "knowledge provenance conflict")
    if len({p.id for p in data.pages}) != len(data.pages):
        raise HTTPException(409, "duplicate knowledge page")


async def current(tx):
    return await tx.scalar(select(KnowledgeState))


async def register(tx, item, data):
    validate(item, data)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                     {"key": f"knowledge:{item.id}:{settings().environment}"})
    state = await current(tx)
    if state and state.payload.get('knowledge', {}).get('schema_version') == 2:
        raise HTTPException(409, 'knowledge_v2_downgrade_forbidden')
    projection = data.model_dump(mode="json")
    # generated_at changes on every refresh; content identity does not.
    hash_value = digest(json.dumps({k: v for k, v in projection.items() if k != "generated_at"}, sort_keys=True))
    if not state:
        state = KnowledgeState(business_id=item.id, environment_id=settings().environment,
            revision=1, payload={"knowledge": projection, "hash": hash_value, "revoked": []})
        tx.add(state)
    elif state.payload["hash"] != hash_value:
        state.revision += 1
        state.payload = {**state.payload, "knowledge": projection, "hash": hash_value}
    state.refreshed_at = utcnow()
    await tx.flush()
    return {"revision": state.revision, "deployment_id": projection["deployment_id"],
            "refreshed_at": state.refreshed_at.isoformat()}


async def resolve(tx, args: KnowledgeQuery):
    state = await current(tx)
    if (not state or not state.payload.get('knowledge')
            or state.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds) < utcnow()):
        return {"status": "unavailable", "reason": "knowledge_snapshot_expired", "sources": []}
    tokens = set(re.findall(r"\w+", args.query.casefold()))
    pages = [p for p in state.payload["knowledge"]["pages"] if p["revision_hash"] not in state.payload["revoked"]]
    scored = sorted(pages, key=lambda p: sum(t in p["text"].casefold() or t in p["title"].casefold()
                                           for t in tokens), reverse=True)
    matching = [p for p in scored if any(t in p["text"].casefold() or t in p["title"].casefold() for t in tokens)]
    sources = []
    for page in matching[:3]:
        offset = 0
        if state.payload['knowledge'].get('schema_version') == 2:
            hits = [page['text'].casefold().find(t) for t in tokens if t in page['text'].casefold()]
            offset = max(0, min(hits, default=0) - 500)
        sources.append({**page, 'text': page['text'][offset:offset + 4000]})
    return {"status": "found" if matching else "no_match",
            "sources": sources,
            "commercial_tools": "disabled", "knowledge_revision": state.revision,
            "deployment_id": state.payload["knowledge"]["deployment_id"],
            "snapshot_ttl_seconds": settings().knowledge_ttl_seconds}


async def projection(tx):
    state = await current(tx)
    if (not state or not state.payload.get('knowledge')
            or state.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds) < utcnow()):
        return None
    value = state.payload["knowledge"]
    return {**value, "pages": [p for p in value["pages"] if p["revision_hash"] not in state.payload["revoked"]],
            "knowledge_revision": state.revision}


async def refresh_from_edge(item):
    from . import onboarding, policy
    from .db import db

    cfg = settings()
    if not cfg.knowledge_refresh_enabled or item.site_id not in cfg.knowledge_refresh_sites:
        return {"status": "disabled"}
    async with db.transaction(item.id, cfg.environment) as tx:
        if not (await onboarding.status(tx, item.site_id))['source_ready']:
            return {'status': 'disabled', 'reason': 'site_source_not_admitted'}
        state = await current(tx)
        if state and state.refreshed_at + timedelta(seconds=cfg.knowledge_refresh_seconds) > utcnow():
            return {"status": "fresh"}
    override = cfg.knowledge_source_overrides.get(item.site_id)
    base = override or cfg.knowledge_source_base_url or f"https://{item.canonical_host}"
    parsed = urlparse(base)
    local = cfg.environment == "local" and parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost"}
    if not local and (parsed.scheme != "https" or (not override and parsed.hostname != item.canonical_host)):
        return {"status": "rejected", "reason": "source_host_not_allowed"}
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        return {"status": "rejected", "reason": "invalid_source_url"}
    path = "/pokalbis/manifestas"
    stamp, nonce = str(int(time.time())), str(uuid4())
    canonical = "\n".join([stamp, nonce, "GET", path, item.site_id, digest("")])
    signature = hmac.new(cfg.edge_secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=4, follow_redirects=False) as client:
            async with client.stream("GET", base.rstrip("/") + path, headers={"Host": parsed.netloc if override else item.canonical_host,
                "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce, "x-pinet-signature": signature}) as response:
                if response.status_code != 200:
                    return {"status": "unavailable", "reason": f"http_{response.status_code}"}
                content = bytearray()
                async for part in response.aiter_bytes():
                    content.extend(part)
                    if len(content) > 220000:
                        return {"status": "rejected", "reason": "manifest_too_large"}
        data = Knowledge.model_validate_json(bytes(content))
        async with db.transaction(item.id, cfg.environment) as tx:
            await policy.lock(tx, item.id, cfg.environment)
            receipt = await register(tx, item, data)
        return {"status": "refreshed", **receipt}
    except Exception as error:
        return {"status": "unavailable", "reason": type(error).__name__}


async def revoke(tx, data: KnowledgeRevocation):
    from .service import finalize

    state = await current(tx)
    if not state or state.revision != data.base_revision:
        raise HTTPException(409, "knowledge_revision_conflict")
    state.revision += 1
    state.payload = {**state.payload, "revoked": sorted(set(state.payload["revoked"] + data.revision_hashes))}
    # End sessions which have already received a revoked fact. It cannot be unspoken
    # or silently erased from a provider context; a subsequent call gets current data.
    affected = set()
    events = (await tx.scalars(select(Event).where(Event.kind == "tool"))).all()
    for event in events:
        sources = event.payload.get("result", {}).get("sources", [])
        if any(p.get("revision_hash") in data.revision_hashes for p in sources):
            affected.add(event.conversation_id)
    stopped = 0
    if affected:
        sessions = (await tx.scalars(select(Conversation).where(Conversation.id.in_(affected),
            Conversation.state != "finalized").order_by(Conversation.id).with_for_update())).all()
        for convo in sessions:
            await finalize(tx, convo)
            stopped += 1
    history = list(state.payload.get("revocation_history", []))
    history.append({"revision": state.revision, "hashes": data.revision_hashes,
                    "reason": data.reason, "at": utcnow().isoformat()})
    state.payload = {**state.payload, "revocation_history": history}
    return {"revision": state.revision, "finalized_sessions": stopped, "revoked": state.payload["revoked"]}
