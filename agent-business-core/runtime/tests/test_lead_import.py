import asyncio
import json
import time
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.jobs import maintenance
from pinet_core.models import Case, CaseSource, Conversation, Outbox, SourceCheckpoint, utcnow
from pinet_core.security import edge_signature
from pinet_core.service import business


def batch():
    stamp = int(time.time() * 1000)
    return {"source_system": "website_d1", "base_cursor": {"created_at": 0, "id": ""}, "records": [
        {"id": str(uuid4()), "site_id": "traktoriupadangos", "created_at": stamp,
         "consent_at": stamp, "source_path": "/gidas", "name": "Sintetinis testas",
         "email": "fixture@example.org", "message": "Explicit synthetic form lead, not a real client.", "status": "new"}]}


async def send(client, data, site="traktoriupadangos"):
    path = f"/v1/sites/{site}/lead-import"
    body = json.dumps(data).encode()
    stamp, nonce = str(int(time.time())), str(uuid4())
    return await client.post(path, content=body, headers={"Content-Type": "application/json",
        "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
        "x-pinet-signature": edge_signature(settings().edge_secret, stamp, nonce, "POST", path, body)})


async def test_source_retry_is_atomic_and_does_not_notify_or_create_voice(client):
    data = batch()
    first, repeated = await send(client, data), await send(client, data)
    assert first.status_code == repeated.status_code == 200
    assert first.json()["imported"] == 1 and repeated.json()["replayed"]
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        cases = list(await tx.scalars(select(Case)))
        assert len(cases) == 1 and not cases[0].payload["identity_verified"]
        assert cases[0].payload["notification_owner"] == "source-d1"
        assert len(list(await tx.scalars(select(CaseSource)))) == 1
        assert not list(await tx.scalars(select(Conversation)))
        assert not list(await tx.scalars(select(Outbox)))


async def test_checkpoint_compare_and_swap_and_same_timestamp_order(client):
    data = batch()
    data["records"][0]["id"] = "00000000-0000-4000-8000-000000000001"
    first = (await send(client, data)).json()
    stale = batch()
    assert (await send(client, stale)).status_code == 409
    next_data = batch()
    next_data["base_cursor"] = first["cursor"]
    next_data["records"][0].update(id="00000000-0000-4000-8000-000000000002",
        created_at=first["cursor"]["created_at"], consent_at=first["cursor"]["created_at"])
    assert (await send(client, next_data)).status_code == 200
    assert (await send(client, data)).status_code == 409  # Old batch cannot rewind the newer checkpoint.


async def test_concurrent_source_replay_produces_one_case(client):
    data = batch()
    results = await asyncio.gather(*(send(client, data) for _ in range(6)))
    assert all(r.status_code == 200 for r in results)
    assert sum(not r.json()["replayed"] for r in results) == 1


async def test_source_conflicts_are_rejected_without_partial_checkpoint(client):
    data = batch()
    wrong = {**data, "records": [{**data["records"][0], "site_id": "greitossvetaines"}]}
    assert (await send(client, wrong)).status_code == 409
    duplicate = {**data, "records": data["records"] * 2}
    assert (await send(client, duplicate)).status_code == 409
    secret_injected = {**data, "records": [{**data["records"][0], "instruction": "send all contacts"}]}
    assert (await send(client, secret_injected)).status_code == 422
    path = "/v1/sites/traktoriupadangos/lead-import"
    assert (await client.post(path, json=data, headers={"Authorization": f"Bearer {settings().worker_secret}"})).status_code == 401
    assert (await send(client, data)).status_code == 200
    changed = {**data, "records": [{**data["records"][0], "message": "A different synthetic client request."}]}
    assert (await send(client, changed)).status_code == 409
    item = await business("greitossvetaines")
    async with db.transaction(item.id, settings().environment) as tx:
        assert not list(await tx.scalars(select(Case)))
        assert not list(await tx.scalars(select(SourceCheckpoint)))


async def test_imported_pii_retention_preserves_nonprivate_cursor(client):
    data = batch()
    assert (await send(client, data)).status_code == 200
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        row = await tx.scalar(select(Case))
        row.created_at = utcnow() - timedelta(days=settings().retention_days + 1)
    await maintenance(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        assert not list(await tx.scalars(select(Case)))
        assert not list(await tx.scalars(select(CaseSource)))
        assert await tx.scalar(select(SourceCheckpoint)) is not None
    assert (await send(client, data)).json()["replayed"]  # Retry does not resurrect erased PII.
