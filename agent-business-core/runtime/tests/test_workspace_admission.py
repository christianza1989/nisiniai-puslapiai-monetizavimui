"""Rejected discovery admission cannot leave a parent-only object in normal HTTP reads."""
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import discovery, questions  # noqa: F401
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.business_discovery import service, worker
from pinet_core.business_discovery.models import (
    BuildApproval,
    Discovery,
    DiscoveryAttempt,
    DiscoveryJob,
    Report,
)
from pinet_core.config import settings
from pinet_core.control.routes import ControlError


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model).where(
            model.environment_id == c["environment"])) for model in
            (Discovery, DiscoveryJob, Report, DiscoveryAttempt, BuildApproval)])


def body(me):
    return {"portfolio_id": me["portfolios"][0]["portfolio_id"],
            "message": "Sintetinis atominės užklausos patikros pokalbis.", "idempotency_key": str(uuid4())}


@pytest.mark.parametrize("flag", ["business_discovery_runner_enabled", "creation_runner_enabled"])
async def test_held_start_keeps_all_object_history_counts_unchanged(discovery, monkeypatch, flag):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    before = await counts(c)
    monkeypatch.setattr(settings(), flag, False)
    refused = await c["client"].post("/customer/v2/discoveries", headers=auth, json=body(me))
    assert refused.status_code == 503 and refused.json()["code"] == "discovery_runner_unavailable"
    assert await counts(c) == before
    assert (await c["client"].get("/customer/v2/discoveries", headers=auth)).json()["data"]["items"] == []


async def test_late_refusal_after_job_insert_rolls_back_parent_and_job(discovery, monkeypatch):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    before = await counts(c)
    original = service.enqueue

    async def late(tx, row, session, message, key, fingerprint):
        await original(tx, row, session, message, key, fingerprint)
        raise ControlError(503, "synthetic_late_refusal")

    monkeypatch.setattr(service, "enqueue", late)
    refused = await c["client"].post("/customer/v2/discoveries", headers=auth, json=body(me))
    assert refused.status_code == 503
    assert await counts(c) == before


async def test_quota_refusal_does_not_leave_a_new_parent(discovery, monkeypatch):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    before = await counts(c)

    async def full(tx, user_id):
        raise ControlError(429, "creation_daily_limit")

    monkeypatch.setattr("pinet_core.creation.service.quota", full)
    refused = await c["client"].post("/customer/v2/discoveries", headers=auth, json=body(me))
    assert refused.status_code == 429
    assert await counts(c) == before


async def test_exact_success_replay_remains_readable_when_runner_is_later_held(discovery, monkeypatch):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    value = body(me)
    first = await c["client"].post("/customer/v2/discoveries", headers=auth, json=value)
    assert first.status_code == 202
    did = first.json()["data"]["discovery_id"]
    assert await worker.execute_once(discovery_id=did, role_runner=questions)
    before = await counts(c)
    monkeypatch.setattr(settings(), "business_discovery_runner_enabled", False)
    replay = await c["client"].post("/customer/v2/discoveries", headers=auth, json=value)
    assert replay.status_code == 202 and replay.json()["data"]["discovery_id"] == did
    assert await counts(c) == before
    changed = await c["client"].post("/customer/v2/discoveries", headers=auth,
        json={**value, "message": "Kitas sintetinis to paties rakto tekstas."})
    assert changed.status_code == 409
    assert await counts(c) == before
