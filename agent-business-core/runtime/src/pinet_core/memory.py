"""First-party device memory. A cookie is a capability, not proof of a person's identity."""
import hashlib
import hmac
import re
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import and_, or_, select

from .config import settings
from .models import Conversation, Event, Visitor, new_id, utcnow
from .security import digest


def credential(business_id, environment_id, seed):
    return hmac.new(settings().worker_secret.encode(),
                    f"memory:{business_id}:{environment_id}:{seed}".encode(), hashlib.sha256).hexdigest()


async def resolve(tx, token, lock=False):
    if not token or not re.fullmatch(r"[a-f0-9]{64}", token):
        return None
    query = select(Visitor).where(Visitor.token_hash == digest(token), Visitor.revoked_at.is_(None),
                                 Visitor.expires_at > utcnow())
    return await tx.scalar(query.with_for_update() if lock else query)


async def attach(tx, item, data, request_id):
    if not data.remember:
        return None, None
    visitor = await resolve(tx, data.memory_token, lock=True)
    if visitor and visitor.payload["test"] != (data.mode == "simulation"):
        visitor = None
    if visitor:
        visitor.expires_at = utcnow() + timedelta(days=settings().retention_days)
        return visitor, data.memory_token
    token = credential(item.id, settings().environment, request_id)
    visitor = Visitor(id=new_id(), business_id=item.id, environment_id=settings().environment,
                      token_hash=digest(token), expires_at=utcnow() + timedelta(days=settings().retention_days),
                      payload={"consent_version": data.notice_version, "creation_seed": request_id,
                               "test": data.mode == "simulation", "identity_assurance": "device_only"})
    tx.add(visitor)
    await tx.flush()
    return visitor, token


async def recall(tx, convo, query="", before_event_id=None):
    if not convo.visitor_id:
        return {"status": "no_memory", "conversations": []}
    visitor = await tx.get(Visitor, convo.visitor_id)
    if not visitor or visitor.revoked_at or visitor.expires_at <= utcnow():
        return {"status": "unavailable", "reason": "memory_revoked_or_expired", "conversations": []}
    earliest = utcnow() - timedelta(days=settings().retention_days)
    previous = select(Conversation.id).where(
        Conversation.visitor_id == visitor.id, Conversation.id != convo.id,
        Conversation.created_at >= earliest)
    matches = select(Event).where(Event.conversation_id.in_(previous),
        Event.kind.in_(["client_transcript", "agent_transcript"]))
    tokens = list(dict.fromkeys(re.findall(r"\w+", query.casefold())))[:12]
    if tokens:
        matches = matches.where(or_(*(Event.payload["text"].astext.ilike(f"%{token}%") for token in tokens)))
    if before_event_id:
        cursor = await tx.scalar(select(Event).where(Event.id == str(before_event_id), Event.conversation_id.in_(previous)))
        if not cursor:
            raise HTTPException(422, "invalid_memory_cursor")
        matches = matches.where(or_(Event.created_at < cursor.created_at,
            and_(Event.created_at == cursor.created_at, Event.id < cursor.id)))
    events = (await tx.scalars(matches.order_by(Event.created_at.desc(), Event.id.desc()).limit(41))).all()
    result, groups, remaining, last = [], {}, 18000, None
    for event in events[:40]:
        if remaining < len(event.payload["text"]) and last is not None:
            break
        prior = await tx.get(Conversation, event.conversation_id)
        if prior.id not in groups:
            group = {"conversation_id": prior.id, "started_at": prior.created_at.isoformat(),
                     "evidence": [], "need": prior.payload["need"], "source": "historical_untrusted"}
            groups[prior.id] = group
            result.append(group)
        value = event.payload["text"][:remaining]
        groups[prior.id]["evidence"].insert(0, {"event_id": event.id,
            "speaker": "client" if event.kind == "client_transcript" else "agent", "text": value})
        remaining -= len(value)
        last = event
    included = sum(len(group["evidence"]) for group in result)
    return {"status": "remembered" if result else "no_history", "identity_assurance": "device_only",
            "conversations": result, "retention_days": settings().retention_days,
            "history_is_not_current_business_truth": True, "bounded_context": True,
            "next_event_id": last.id if last and included < len(events) else None}


async def forget(tx, token):
    from .service import finalize

    visitor = await resolve(tx, token, lock=True)
    if visitor:
        visitor.revoked_at = utcnow()
        # Revoke current/future retrieval and remove links without destroying enquiry records.
        sessions = (await tx.scalars(select(Conversation).where(
            Conversation.visitor_id == visitor.id).order_by(Conversation.id).with_for_update())).all()
        for convo in sessions:
            if convo.state != "finalized":
                await finalize(tx, convo)
            convo.visitor_id = None
    return {"remembered": False}
