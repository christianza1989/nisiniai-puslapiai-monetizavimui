"""Private drafts and durable queue. No crawler, Meta request or browser submit here."""
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import func, select, text

from .. import knowledge
from ..config import settings
from ..models import Case, CaseSource, new_id, utcnow
from .contracts import ModulePolicy
from .models import FacebookAccountLease, FacebookRecord

ROOT = Path(__file__).resolve().parents[5]


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


async def module_lock(tx, item):
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
                     {"key": f"facebook-policy:{item.id}:{settings().environment}"})


async def record(tx, kind, key, lock=False):
    query = select(FacebookRecord).where(FacebookRecord.kind == kind, FacebookRecord.record_key == key)
    return await tx.scalar(query.with_for_update() if lock else query)


def view(row):
    return {"id": row.id, "kind": row.kind, "key": row.record_key, "state": row.state,
            "revision": row.revision, "created_at": row.created_at.isoformat(),
            "case_id": row.case_id, **row.payload}


async def policy(tx):
    row = await record(tx, "policy", "module")
    return {"revision": row.revision if row else 0,
            "policy": ModulePolicy.model_validate(row.payload["policy"] if row else {}).model_dump(),
            "live": {"groups": "unverified_platform_permission", "page": "not_connected",
                     "external_sending": False}}


async def require_enabled(tx):
    value = (await policy(tx))["policy"]
    if not value["enabled"] or value["paused"]:
        raise HTTPException(503, "facebook_paused" if value["paused"] else "facebook_disabled")
    return value


def add(tx, item, kind, key, state, payload, case_id=None):
    row = FacebookRecord(business_id=item.id, environment_id=settings().environment,
                         kind=kind, record_key=key, state=state, payload=payload, revision=1, case_id=case_id)
    tx.add(row)
    return row


async def update_policy(tx, item, data):
    await module_lock(tx, item)
    current = await policy(tx)
    if current["revision"] != data.base_revision:
        raise HTTPException(409, "facebook_policy_revision_conflict")
    row = await record(tx, "policy", "module", lock=True)
    payload = {"policy": data.policy.model_dump()}
    if not row:
        row = add(tx, item, "policy", "module", "configured", payload)
    else:
        row.payload = payload
        row.revision += 1
    add(tx, item, "audit", new_id(), "recorded",
        {"event": "policy_updated", "reason": data.reason, "revision": row.revision})
    if not data.policy.enabled or data.policy.paused:
        actions = (await tx.scalars(select(FacebookRecord).where(
            FacebookRecord.kind == "action", FacebookRecord.state.in_(["queued", "drafting"])
        ).with_for_update())).all()
        for action in actions:
            action.state = "cancelled"
            action.revision += 1
            token = action.payload.get("task_token")
            if token:
                await finish_attempt(tx, token, "cancelled", "module_paused_or_disabled")
    await tx.flush()
    return await policy(tx)


async def insert_unique(tx, item, kind, key, payload, state="recorded"):
    await module_lock(tx, item)
    await require_enabled(tx)
    old = await record(tx, kind, key)
    if old:
        if old.payload.get("input_hash") != fingerprint(payload):
            raise HTTPException(409, "facebook_idempotency_conflict")
        return view(old)
    row = add(tx, item, kind, key, state, {**payload, "input_hash": fingerprint(payload)})
    await tx.flush()
    return view(row)


async def add_group(tx, item, data):
    return await insert_unique(tx, item, "group", data.key, data.model_dump(mode="json"), "candidate")


async def add_signal(tx, item, data):
    group = await record(tx, "group", data.group_key)
    if not group:
        raise HTTPException(404, "facebook_group_not_in_site")
    if data.data_class == "permitted" and group.payload["reuse"] != "allowed":
        raise HTTPException(403, "facebook_source_reuse_unverified")
    if data.data_class == "synthetic" and not settings().allow_simulation:
        raise HTTPException(403, "facebook_synthetic_not_allowed")
    if data.published_at and data.published_at > utcnow() + timedelta(minutes=5):
        raise HTTPException(422, "facebook_future_source_date")
    return await insert_unique(tx, item, "signal", data.key, data.model_dump(mode="json"))


async def by_id(tx, kind, ident):
    row = await tx.scalar(select(FacebookRecord).where(FacebookRecord.id == ident, FacebookRecord.kind == kind))
    if not row:
        raise HTTPException(404, "facebook_record_not_in_site")
    return row


def qualification(signal):
    value = signal.payload
    reasons = []
    if value["role"] != "buyer":
        reasons.append("not_buyer")
    if value["scope_fit"] != "yes":
        reasons.append("scope_unverified_or_excluded")
    if not value["published_at"]:
        reasons.append("recency_unverified")
    else:
        if datetime.fromisoformat(value["published_at"]) < utcnow() - timedelta(days=14):
            reasons.append("stale_signal")
    if value["data_class"] != "permitted":
        reasons.append("not_contactable_source")
    return {"eligible_for_contact_review": not reasons, "reasons": reasons,
            "fulfilment": "unverified", "received_need": False}


async def queue_draft(tx, item, data):
    signal = await by_id(tx, "signal", data.signal_id)
    payload = {**data.model_dump(), "qualification": qualification(signal)}
    return await insert_unique(tx, item, "action", data.key, payload, "queued")


async def listing(tx, kind):
    rows = (await tx.scalars(select(FacebookRecord).where(FacebookRecord.kind == kind)
                            .order_by(FacebookRecord.created_at.desc()).limit(100))).all()
    return [view(row) for row in rows]


async def draft_context(tx, item, signal):
    paths = [ROOT / "SKILLS/niche-client-acquisition/SKILL.md",
             ROOT / "SKILLS/niche-client-acquisition/references/facebook.md"]
    sources = [{"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
               for path in paths]
    cfg_path = ROOT.parent / "dovanos-memorycasting/config/niche-network.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    contact = cfg.get("contactsBySite", {}).get(item.site_id, {})
    facts = await knowledge.projection(tx)
    return {"site_id": item.site_id, "canonical_host": item.canonical_host,
            "operator": contact.get("operatorName", cfg["operatorName"]),
            "contact_email": contact.get("email", cfg["defaultEmail"]),
            "approved_projection": facts, "knowledge_status": "current" if facts else "unavailable",
            "instruction_sources": sources, "instruction_hash": fingerprint(sources),
            "instructions": "\n\n".join(path.read_text(encoding="utf-8") for path in paths),
            "facts_hash": fingerprint(facts), "signal": view(signal),
            "authority": "private_draft_only; no supply, arrival, price or external sending commitment"}


async def tick(tx, item):
    await module_lock(tx, item)
    value = await require_enabled(tx)
    await recover_expired(tx, item)
    used = await daily_usage(tx)
    if used >= value["daily_draft_limit"]:
        return {"state": "limited", "processed": 0}
    action = await tx.scalar(select(FacebookRecord).where(
        FacebookRecord.kind == "action", FacebookRecord.state == "queued"
    ).order_by(FacebookRecord.created_at).with_for_update(skip_locked=True).limit(1))
    if not action:
        return {"state": "idle", "processed": 0}
    signal = await by_id(tx, "signal", action.payload["signal_id"])
    context = await draft_context(tx, item, signal)
    # Intentionally useful preparation without a model/provider call or invented capacity.
    if action.payload["kind"] == "join_draft":
        body = "Peržiūrėti grupės taisykles ir patvirtinti tinkamumą nišai prieš stojimo veiksmą."
    elif context["site_id"] == "auksarankiams":
        body = ("Kad būtų aiškiau įvertinti darbų apimtį, verta nurodyti baldų ar kabinamų gaminių kiekį, "
                "miestą ir pageidaujamą laikotarpį. Kokie konkretūs darbai reikalingi?")
    elif context["site_id"] == "traktoriupadangos":
        body = ("Poreikiui aprašyti praverstų technikos modelis, pilnas esamos padangos žymėjimas, "
                "kiekis ir pageidaujamas laikotarpis. Suderinamumą reikia tikrinti su specialistu.")
    elif context["site_id"] == "greitossvetaines":
        body = ("Kokias paslaugas norėtumėte pristatyti ir kokią užklausą turėtų pateikti lankytojas? "
                "Tai padėtų susidaryti konkrečios svetainės apimties sąrašą.")
    else:
        body = "Kokio konkretaus rezultato reikia, kur ir kokiu laikotarpiu?"
    group = await record(tx, "group", signal.payload["group_key"])
    draft = add(tx, item, "draft", action.id, "draft",
                {"action_id": action.id, "body": body, "generator": "deterministic_need_brief_v1",
                 "context": context, "target_group_url": group.payload["url"],
                 "qualification": qualification(signal), "external_sending": False})
    action.state = "prepared"
    action.revision += 1
    action.payload = {**action.payload, "draft_id": draft.id}
    await tx.flush()
    return {"state": "prepared", "processed": 1, "draft_id": draft.id}


async def claim_account(tx, account_key, owner, seconds=60):
    env = settings().environment
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
                     {"key": f"facebook-account:{env}:{account_key}"})
    row = await tx.scalar(select(FacebookAccountLease).where(
        FacebookAccountLease.environment_id == env, FacebookAccountLease.account_key == account_key
    ).with_for_update())
    if row and row.lease_until and row.lease_until > utcnow():
        raise HTTPException(409, "facebook_account_busy")
    if not row:
        row = FacebookAccountLease(environment_id=env, account_key=account_key, epoch=0)
        tx.add(row)
    row.epoch += 1
    row.owner = owner
    row.lease_until = utcnow() + timedelta(seconds=seconds)
    await tx.flush()
    return {"epoch": row.epoch, "expires_at": row.lease_until.isoformat()}


async def fenced_account(tx, account_key, owner, epoch):
    row = await tx.scalar(select(FacebookAccountLease).where(
        FacebookAccountLease.environment_id == settings().environment,
        FacebookAccountLease.account_key == account_key
    ).with_for_update())
    if not row or row.owner != owner or row.epoch != epoch or not row.lease_until or row.lease_until <= utcnow():
        raise HTTPException(409, "facebook_stale_account_lease")
    return row


async def import_fixture(tx, item, data):
    await module_lock(tx, item)
    await require_enabled(tx)
    if not settings().allow_simulation or not settings().environment.startswith("test-"):
        raise HTTPException(403, "facebook_fixture_requires_isolated_test_environment")
    key = f"{data.page_id}:{data.sender_id}:{data.message_id}"
    old = await record(tx, "inbound_fixture", key)
    payload = data.model_dump()
    if old:
        if old.payload["input_hash"] != fingerprint(payload):
            raise HTTPException(409, "facebook_inbound_conflict")
        return view(old)
    case = Case(business_id=item.id, environment_id=settings().environment,
                payload={"synthetic": True, "source": "facebook_fixture", "need": data.need})
    tx.add(case)
    await tx.flush()
    tx.add(CaseSource(business_id=item.id, environment_id=settings().environment,
                      source_system="facebook_page_fixture", site_id=item.site_id,
                      source_record_id=key, case_id=case.id, payload={"synthetic": True}))
    row = add(tx, item, "inbound_fixture", key, "synthetic",
              {**payload, "input_hash": fingerprint(payload)}, case_id=case.id)
    await tx.flush()
    return view(row)


async def overview(tx):
    counts = dict((await tx.execute(select(FacebookRecord.kind, func.count()).group_by(
        FacebookRecord.kind))).all())
    return {"counts": counts, "received_real_needs": 0, "sent_external_actions": 0,
            "note": "Signals and synthetic case fixtures are not received customer demand."}


async def finish_attempt(tx, token, state, reason=None):
    attempt = await record(tx, "model_attempt", token)
    if attempt:
        attempt.state = state
        attempt.payload = {**attempt.payload, **({"reason": reason} if reason else {})}


async def daily_usage(tx):
    # A CLI attempt consumes a unit even on failure. Its resulting draft is not counted twice.
    today = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return await tx.scalar(select(func.count()).select_from(FacebookRecord).where(
        FacebookRecord.created_at >= today,
        (FacebookRecord.kind == "model_attempt") | (
            (FacebookRecord.kind == "draft") &
            (FacebookRecord.payload["generator"].astext == "deterministic_need_brief_v1"))))


async def recover_expired(tx, item):
    actions = (await tx.scalars(select(FacebookRecord).where(
        FacebookRecord.kind == "action", FacebookRecord.state == "drafting"
    ).with_for_update())).all()
    for action in actions:
        if datetime.fromisoformat(action.payload["lease_until"]) <= utcnow():
            action.state = "uncertain"
            action.revision += 1
            action.payload = {**action.payload, "reason": "model_task_expired_no_automatic_retry"}
            await finish_attempt(tx, action.payload["task_token"], "expired", "worker_lease_expired")
            add(tx, item, "audit", new_id(), "recorded", {
                "event": "expired_draft_task", "action_id": action.id,
                "reason": "Nutrūkęs generavimas pažymėtas neaiškiu; automatiškai nekartojamas."})


async def claim_model_draft(tx, item):
    await module_lock(tx, item)
    value = await require_enabled(tx)
    await recover_expired(tx, item)
    started = await daily_usage(tx)
    if started >= value["daily_draft_limit"]:
        return None
    action = await tx.scalar(select(FacebookRecord).where(
        FacebookRecord.kind == "action", FacebookRecord.state == "queued"
    ).order_by(FacebookRecord.created_at).with_for_update(skip_locked=True).limit(1))
    if not action:
        return None
    signal = await by_id(tx, "signal", action.payload["signal_id"])
    if signal.payload["data_class"] not in {"anonymous", "synthetic"}:
        action.state = "blocked"
        action.revision += 1
        action.payload = {**action.payload, "reason": "personal_data_model_processing_not_enabled"}
        return None
    context = await draft_context(tx, item, signal)
    token = new_id()
    revision = (await policy(tx))["revision"]
    expiry = utcnow() + timedelta(seconds=240)
    action.state = "drafting"
    action.revision += 1
    action.payload = {**action.payload, "task_token": token, "lease_until": expiry.isoformat(),
                      "policy_revision": revision}
    add(tx, item, "model_attempt", token, "started", {"action_id": action.id, "max_cli_calls": 2})
    await tx.flush()
    return {"action_id": action.id, "token": token, "policy_revision": revision, "context": context,
            "kind": action.payload["kind"], "lease_until": expiry.isoformat()}


async def complete_model_draft(tx, item, task, result):
    await module_lock(tx, item)
    await require_enabled(tx)
    action = await by_id(tx, "action", task["action_id"])
    if (action.state != "drafting" or action.payload.get("task_token") != task["token"]
            or datetime.fromisoformat(action.payload["lease_until"]) <= utcnow()
            or (await policy(tx))["revision"] != task["policy_revision"]):
        raise HTTPException(409, "facebook_stale_draft_task")
    signal = await by_id(tx, "signal", action.payload["signal_id"])
    current_context = await draft_context(tx, item, signal)
    if any(current_context[key] != task["context"][key] for key in (
        "facts_hash", "instruction_hash", "operator", "contact_email", "canonical_host")):
        action.state = "blocked"
        action.revision += 1
        action.payload = {**action.payload, "reason": "context_changed_during_generation"}
        await finish_attempt(tx, task["token"], "blocked", "context_changed_during_generation")
        return {"state": "blocked", "processed": 0}
    if not result.get("approved"):
        action.state = "blocked"
        action.revision += 1
        action.payload = {**action.payload, "reason": result.get("reason", "draft_review_failed")}
        await finish_attempt(tx, task["token"], "blocked", action.payload["reason"])
        return {"state": "blocked", "processed": 0}
    group = await record(tx, "group", signal.payload["group_key"])
    draft = add(tx, item, "draft", action.id, "draft",
                {"action_id": action.id, "body": result["body"], "generator": "codex_cli_private_v1",
                 "review": result["review"], "usage": result["usage"], "context": task["context"],
                 "target_group_url": group.payload["url"], "qualification": qualification(signal),
                 "external_sending": False})
    action.state = "prepared"
    action.revision += 1
    action.payload = {**action.payload, "draft_id": draft.id}
    attempt = await record(tx, "model_attempt", task["token"])
    attempt.state = "completed"
    attempt.payload = {**attempt.payload, "usage": result["usage"]}
    await tx.flush()
    return {"state": "prepared", "processed": 1, "draft_id": draft.id}
