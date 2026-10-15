"""Durable owned-Page execution coordinated with the existing desktop account lease."""
import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import func, select

from ..config import settings
from ..db import db
from ..models import new_id, utcnow
from . import browser_service as browser
from . import page_api_graph as graph
from . import service as fb
from .browser_extensions import inspect_media
from .models import FacebookRecord
from .page_api_contracts import PageApiPolicy


async def policy(tx):
    row = await fb.record(tx, "page_api_policy", "publishing")
    return {"revision": row.revision if row else 0,
            "policy": PageApiPolicy.model_validate(row.payload["policy"] if row else {}).model_dump()}


async def enabled(tx):
    await fb.require_enabled(tx)
    value = (await policy(tx))["policy"]
    if not value["enabled"] or value["paused"]:
        raise HTTPException(503, "facebook_page_api_paused_or_disabled")
    return value


async def release(tx, job, uncertain=False):
    lease = await browser.account_row(tx, job.payload["binding"]["account_key"])
    if lease and lease.epoch == job.payload.get("epoch") and lease.owner in {
            "page-api-job:" + job.id, "page-api-uncertain:" + job.id}:
        lease.owner = "page-api-uncertain:" + job.id if uncertain else None
        lease.lease_until = None


async def mark(tx, job, state, reason, uncertain=False):
    job.state, job.revision = state, job.revision + 1
    job.payload = {**job.payload, "reason": reason}
    if uncertain:
        job.payload = {**job.payload, "external_sending": False if job.payload["binding"]["fixture"] else None}
    await release(tx, job, uncertain)


async def cancel_active(tx):
    jobs = (await tx.scalars(select(FacebookRecord).where(FacebookRecord.kind == "page_api_job",
        FacebookRecord.state.in_(["ready", "claimed", "sending"])).with_for_update())).all()
    for job in jobs:
        await mark(tx, job, "uncertain" if job.state == "sending" else "cancelled",
                   "facebook_page_api_policy_stopped", job.state == "sending")


async def update_policy(tx, item, data):
    await fb.module_lock(tx, item)
    current = await policy(tx)
    if current["revision"] != data.base_revision:
        raise HTTPException(409, "facebook_page_api_policy_revision_conflict")
    row = await fb.record(tx, "page_api_policy", "publishing", lock=True)
    if row:
        row.payload, row.revision = {"policy": data.policy.model_dump()}, row.revision + 1
    else:
        row = fb.add(tx, item, "page_api_policy", "publishing", "configured",
                     {"policy": data.policy.model_dump()})
    if not data.policy.enabled or data.policy.paused:
        await cancel_active(tx)
    fb.add(tx, item, "audit", new_id(), "recorded", {"event": "page_api_policy_updated",
        "revision": row.revision, "reason": data.reason})
    await tx.flush()
    return await policy(tx)


async def verify(item, key):
    credential = graph.credentials(item.site_id, key)
    client = graph.Graph(credential)
    try:
        proof = await client.verify()
    except graph.GraphFailure as error:
        raise HTTPException(403, error.reason) from None
    finally:
        await client.close()
    async with db.transaction(item.id, settings().environment) as tx:
        await fb.module_lock(tx, item)
        if credential.fingerprint() != graph.credentials(item.site_id, key).fingerprint():
            raise HTTPException(409, "facebook_page_credentials_changed")
        row = await fb.record(tx, "page_api_binding", key, lock=True)
        if row:
            row.payload, row.revision = proof, row.revision + 1
        else:
            row = fb.add(tx, item, "page_api_binding", key, "verified", proof)
        fb.add(tx, item, "audit", new_id(), "recorded", {"event": "page_api_verified",
            "binding_id": row.id, "credential_key": key, "fixture": proof["fixture"]})
        await tx.flush()
        return fb.view(row)


async def context(tx, item):
    value = await browser.context(tx, item)
    source = fb.ROOT / "SKILLS/niche-client-acquisition/references/facebook-page-api.md"
    return {**value, "page_api_instruction_hash": hashlib.sha256(source.read_bytes()).hexdigest()}


async def guard(tx, item, key, action, job=None):
    await enabled(tx)
    credential = graph.credentials(item.site_id, key)
    binding = await fb.record(tx, "page_api_binding", key)
    if not binding or datetime.fromisoformat(binding.payload["valid_until"]) <= utcnow():
        raise HTTPException(403, "facebook_page_verification_required")
    proof = binding.payload
    if (proof["credential_hash"] != credential.fingerprint()
            or action not in proof["actions"]):
        raise HTTPException(403, "facebook_page_credentials_or_scopes_changed")
    if proof["fixture"] and not (settings().allow_simulation and settings().environment.startswith("test-")):
        raise HTTPException(403, "facebook_page_fixture_requires_test_environment")
    current = await context(tx, item)
    if job and (job.payload["binding"]["credential_hash"] != credential.fingerprint()
                or job.payload["context"] != current
                or job.payload["policy_revision"] != (await policy(tx))["revision"]):
        raise HTTPException(409, "facebook_page_job_context_changed")
    return credential, proof, current


async def media(tx, item, data):
    await enabled(tx)
    return await fb.insert_unique(tx, item, "page_api_media", data.key,
                                 {**data.model_dump(), **inspect_media(data.path)})


async def queue(tx, item, data):
    await fb.module_lock(tx, item)
    await enabled(tx)
    command = data.model_dump()
    old = await fb.record(tx, "page_api_job", data.key)
    if old:
        if old.payload["input_hash"] != fb.fingerprint(command):
            raise HTTPException(409, "facebook_idempotency_conflict")
        return fb.view(old)
    _, proof, snapshot = await guard(tx, item, data.credential_key, data.action)
    if data.purpose == "business" and not proof["fixture"] and not snapshot["facts_available"]:
        raise HTTPException(403, "facebook_business_facts_unavailable")
    if data.parent_post_id and not data.parent_post_id.startswith(proof["page_id"] + "_"):
        raise HTTPException(422, "facebook_comment_requires_owned_page_post")
    asset = None
    if data.media_key:
        row = await fb.record(tx, "page_api_media", data.media_key)
        if not row or inspect_media(row.payload["path"])["sha256"] != row.payload["sha256"]:
            raise HTTPException(409, "facebook_media_changed_requires_new_review")
        asset = row.payload
    row = fb.add(tx, item, "page_api_job", data.key, "ready", {**command, "binding": proof,
        "media": asset, "context": snapshot, "input_hash": fb.fingerprint(command),
        "body_sha256": hashlib.sha256(data.body.encode()).hexdigest(),
        "policy_revision": (await policy(tx))["revision"], "external_sending": False})
    await tx.flush()
    return fb.view(row)


async def recover(tx):
    jobs = (await tx.scalars(select(FacebookRecord).where(FacebookRecord.kind == "page_api_job",
        FacebookRecord.state.in_(["claimed", "sending"])).with_for_update())).all()
    for job in jobs:
        if datetime.fromisoformat(job.payload["lease_until"]) <= utcnow():
            sending = job.state == "sending"
            await mark(tx, job, "uncertain" if sending else "blocked",
                       "facebook_page_api_worker_expired", sending)


async def claim(tx, item, owner):
    await fb.module_lock(tx, item)
    await recover(tx)
    value = await enabled(tx)
    today = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    used = await tx.scalar(select(func.count()).select_from(FacebookRecord).where(
        FacebookRecord.kind.in_(["page_api_attempt", "browser_attempt"]), FacebookRecord.created_at >= today))
    if used >= value["daily_write_limit"]:
        return {"state": "limited", "processed": 0}
    job = await tx.scalar(select(FacebookRecord).where(FacebookRecord.kind == "page_api_job",
        FacebookRecord.state == "ready").order_by(FacebookRecord.created_at).with_for_update().limit(1))
    if not job:
        return {"state": "idle", "processed": 0}
    try:
        await guard(tx, item, job.payload["credential_key"], job.payload["action"], job)
    except HTTPException as error:
        await mark(tx, job, "blocked", error.detail)
        return {"state": "blocked", "processed": 0, "reason": error.detail}
    try:
        lease = await fb.claim_account(tx, job.payload["binding"]["account_key"], "page-api-job:" + job.id, 120)
    except HTTPException as error:
        return {"state": "account_blocked", "processed": 0, "reason": error.detail}
    token = new_id()
    job.state, job.revision = "claimed", job.revision + 1
    job.payload = {**job.payload, "owner": owner, "task_token": token,
                   "epoch": lease["epoch"], "lease_until": lease["expires_at"]}
    fb.add(tx, item, "page_api_attempt", token, "claimed", {"job_id": job.id})
    await tx.flush()
    return {"state": "claimed", "job_id": job.id, "task_token": token, "epoch": lease["epoch"],
            "command": job.payload}


async def owned(tx, item, packet):
    await fb.module_lock(tx, item)
    job = await fb.by_id(tx, "page_api_job", packet["job_id"])
    if job.payload.get("task_token") != packet["task_token"] or job.payload.get("epoch") != packet["epoch"]:
        raise HTTPException(409, "facebook_page_api_stale_task")
    return job


async def prepare(item, packet):
    async with db.transaction(item.id, settings().environment) as tx:
        job = await owned(tx, item, packet)
        if job.state != "claimed":
            return None
        try:
            credential, _, _ = await guard(tx, item, job.payload["credential_key"], job.payload["action"], job)
            await fb.fenced_account(tx, credential.account_key, "page-api-job:" + job.id, packet["epoch"])
            image = None
            if job.payload["media"]:
                asset = job.payload["media"]
                inspect_media(asset["path"])
                image = Path(asset["path"]).read_bytes()
                if hashlib.sha256(image).hexdigest() != asset["sha256"]:
                    raise HTTPException(409, "facebook_media_changed_requires_new_review")
        except HTTPException as error:
            await mark(tx, job, "blocked", error.detail)
            return None
        # Transaction commits before publish; a crashed sender cannot obtain another write permit.
        job.state, job.revision = "sending", job.revision + 1
        job.payload = {**job.payload, "sending_at": utcnow().isoformat()}
        return credential, dict(job.payload), image


async def fail(item, packet, error):
    async with db.transaction(item.id, settings().environment) as tx:
        job = await owned(tx, item, packet)
        if job.state in {"claimed", "sending", "uncertain"}:
            await mark(tx, job, "uncertain" if error.uncertain else "blocked", error.reason, error.uncertain)
        return fb.view(job)


async def acknowledge(item, packet, receipt):
    async with db.transaction(item.id, settings().environment) as tx:
        job = await owned(tx, item, packet)
        if job.state not in {"sending", "uncertain"}:
            raise HTTPException(409, "facebook_page_api_receipt_state_invalid")
        job.state, job.revision = "accepted", job.revision + 1
        job.payload = {**job.payload, "receipt": receipt, "external_sending": receipt["external_sending"]}
        await release(tx, job, True)
        return fb.view(job)


async def confirmed(item, packet, receipt):
    async with db.transaction(item.id, settings().environment) as tx:
        job = await owned(tx, item, packet)
        if job.state != "accepted" or job.payload["receipt"]["provider_id"] != receipt["provider_id"]:
            raise HTTPException(409, "facebook_page_api_receipt_state_invalid")
        job.state, job.revision = "published", job.revision + 1
        job.payload = {**job.payload, "receipt": receipt}
        await release(tx, job)
        fb.add(tx, item, "audit", new_id(), "recorded", {"event": "page_api_published", "job_id": job.id,
                                                       "external_sending": receipt["external_sending"]})
        return fb.view(job)


async def run_once(item, owner):
    async with db.transaction(item.id, settings().environment) as tx:
        packet = await claim(tx, item, owner)
    if packet["state"] != "claimed":
        return packet
    credential = graph.credentials(item.site_id, packet["command"]["credential_key"])
    client = graph.Graph(credential)
    try:
        try:
            if client.fixture != packet["command"]["binding"]["fixture"]:
                raise graph.GraphFailure("facebook_page_api_transport_changed")
            await client.preflight(packet["command"])
        except graph.GraphFailure as error:
            return await fail(item, packet, error)
        prepared = await prepare(item, packet)
        if not prepared:
            async with db.transaction(item.id, settings().environment) as tx:
                return fb.view(await fb.by_id(tx, "page_api_job", packet["job_id"]))
        if prepared[0].fingerprint() != credential.fingerprint():
            return await fail(item, packet, graph.GraphFailure("facebook_page_credentials_changed"))
        try:
            receipt = await client.publish(prepared[1], prepared[2])
        except graph.GraphFailure as error:
            return await fail(item, packet, error)
        accepted = await acknowledge(item, packet, receipt)
        try:
            receipt = await client.confirm(prepared[1], receipt)
        except graph.GraphFailure:
            return accepted  # Known provider id, check-only verification; never POST again.
        return await confirmed(item, packet, receipt)
    finally:
        await client.close()


async def check(item, ident):
    async with db.transaction(item.id, settings().environment) as tx:
        job = await fb.by_id(tx, "page_api_job", ident)
        if job.state == "published":
            return fb.view(job)
        if job.state != "accepted":
            raise HTTPException(409, "facebook_page_api_check_requires_known_provider_id")
        command, receipt = dict(job.payload), dict(job.payload["receipt"])
        packet = {"job_id": job.id, "task_token": command["task_token"], "epoch": command["epoch"]}
    credential = graph.credentials(item.site_id, command["credential_key"])
    if credential.page_id != command["binding"]["page_id"] or credential.account_key != command["binding"]["account_key"]:
        raise HTTPException(409, "facebook_page_api_check_actor_changed")
    client = graph.Graph(credential)
    try:
        if client.fixture != command["binding"]["fixture"]:
            raise HTTPException(409, "facebook_page_api_check_transport_changed")
        try:
            proof = await client.confirm(command, receipt)
        except graph.GraphFailure as error:
            raise HTTPException(409, error.reason) from None
        return await confirmed(item, packet, proof)
    finally:
        await client.close()


async def resolve(tx, item, ident, data):
    await fb.module_lock(tx, item)
    job = await fb.by_id(tx, "page_api_job", ident)
    if job.revision != data.base_revision or job.state != "uncertain" or job.payload.get("receipt"):
        raise HTTPException(409, "facebook_page_api_reconciliation_conflict")
    await mark(tx, job, "not_published", "explicit_check_only_evidence")
    job.payload = {**job.payload, "reconciliation": data.model_dump()}
    fb.add(tx, item, "audit", new_id(), "recorded", {"event": "page_api_reconciled", "job_id": job.id,
                                                   "outcome": data.outcome})
    return fb.view(job)


def public_job(value):
    return {key: val for key, val in value.items() if key not in {"task_token", "epoch", "lease_until"}}


async def dashboard(tx, item):
    # Same lock order as pause/claim: module -> jobs -> account. Avoid cross-transport recovery deadlocks.
    await fb.module_lock(tx, item)
    await recover(tx)
    return {**await policy(tx), "bindings": await fb.listing(tx, "page_api_binding"),
            "jobs": [public_job(x) for x in await fb.listing(tx, "page_api_job")],
            "media": await fb.listing(tx, "page_api_media"), "transport": "official_graph_v26.0"}
