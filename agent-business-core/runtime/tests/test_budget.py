import asyncio
from uuid import uuid4

import pytest
from conftest import claim, start, worker
from fastapi import HTTPException
from sqlalchemy import select
from test_policy import configure

from pinet_core import budget, jobs, policy
from pinet_core.config import settings
from pinet_core.contracts import Policy
from pinet_core.db import db
from pinet_core.models import CostReservation
from pinet_core.service import business


async def test_explicit_cost_configuration_required(client, monkeypatch):
    item = await business("traktoriupadangos")
    monkeypatch.setattr(settings(), "global_daily_budget_microusd", 0)
    async with db.transaction(item.id, settings().environment) as tx:
        with pytest.raises(HTTPException, match="cost_budget_not_configured"):
            await budget.reserve(tx, item.id, Policy(daily_budget_microusd=100), "synthetic", 10)


async def test_atomic_concurrent_cost_reservations_and_replay(client, monkeypatch):
    item = await business("traktoriupadangos")
    cfg = settings()
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 100)
    authority = Policy(daily_budget_microusd=100)

    async def reserve(key):
        async with db.transaction(item.id, cfg.environment) as tx:
            await policy.lock(tx, item.id, cfg.environment)
            return await budget.reserve(tx, item.id, authority, key, 30)
    keys = [f"synthetic:{uuid4()}" for _ in range(8)]
    results = await asyncio.gather(*(reserve(key) for key in keys), return_exceptions=True)
    accepted = [key for key, result in zip(keys, results, strict=True) if not isinstance(result, Exception)]
    assert len(accepted) == 3
    replay = await reserve(accepted[0])
    assert replay.reserved_microusd == 30
    async with db.registry() as tx:
        rows = list(await tx.scalars(select(CostReservation).where(CostReservation.environment_id == cfg.environment)))
        assert len(rows) == 3


async def test_late_usage_idempotency_and_overrun_pause(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 1000)
    assert (await configure(client, enabled=True, daily_budget_microusd=1000)).status_code == 200
    session = await start(client)
    epoch = await claim(client, session)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, cfg.environment) as tx:
        await budget.reserve(tx, item.id, Policy(daily_budget_microusd=1000),
                             f"voice:{session['conversation_id']}", 100)
    receipt = {"epoch": epoch, "report_id": str(uuid4()), "total_microusd": 101}
    first = await worker(client, session, "/usage", receipt)
    assert first.status_code == 200 and first.json()["invoice_verified"] is False
    assert (await worker(client, session, "/usage", receipt)).status_code == 200
    status = await worker(client, session, "", method="GET")
    assert status.json()["paused"] is True and status.json()["state"] == "finalized"
    changed = {**receipt, "total_microusd": 102}
    assert (await worker(client, session, "/usage", changed)).status_code == 409
    decreased = {**receipt, "report_id": str(uuid4()), "total_microusd": 50}
    assert (await worker(client, session, "/usage", decreased)).status_code == 409


async def test_analysis_key_alone_cannot_trigger_provider_charge(client, monkeypatch):
    monkeypatch.setattr(settings(), "google_api_key", "synthetic-not-a-real-key")
    monkeypatch.setattr(settings(), "global_daily_budget_microusd", 0)
    item = await business("traktoriupadangos")

    async def forbidden(*args, **kwargs):
        raise AssertionError("Missing budget must suppress paid provider work")
    monkeypatch.setattr(jobs, "model_output", forbidden)
    result = await jobs.evaluate("analysis", {"test": False, "business_id": item.id,
        "evidence": [{"id": "fixture", "speaker": "client", "text": "Synthetic fixture"}]},
        action_key=f"synthetic-analysis:{uuid4()}")
    assert result["engine"] == "programmatic_baseline"
