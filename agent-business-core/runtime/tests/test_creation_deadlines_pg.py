"""Native admission/time/attempt fences with inert roles, not paid model timing evidence."""
from time import monotonic

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_creations import creation as creation_fixture
from test_customer_creations import start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.creation import team, worker
from pinet_core.creation.models import Attempt
from pinet_core.tasks.codex_transport import RunnerError

creation = creation_fixture


async def high_case(c, monkeypatch):
    monkeypatch.setattr(settings(), "creation_execution_profile", "local_sol61_high_v1")
    monkeypatch.setattr(settings(), "creation_runner_seconds", 300)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    return row, auth


async def test_high_empty_queued_view_declares_source_bound_job_budget(creation, monkeypatch):
    c = creation
    row, auth = await high_case(c, monkeypatch)
    response = await c["client"].get(f"/customer/v2/creations/{row['creation_id']}/team", headers=auth)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["deadline_seconds"] == 900
    assert response.json()["data"]["attempts"] == []


@pytest.mark.parametrize("role,reserve_seconds", [("creator", 300), ("critic", 150)])
async def test_unreviewable_high_role_cannot_charge_attempt(creation, monkeypatch, role, reserve_seconds):
    c = creation
    row, _ = await high_case(c, monkeypatch)
    claimed = await worker.claim(creation_id=row["creation_id"])
    assert claimed
    with pytest.raises(RunnerError) as failure:
        await team.reserve(claimed, role, 1, deadline=monotonic()+reserve_seconds)
    assert failure.value.code == "run_timeout"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Attempt).where(Attempt.job_id == claimed["job_id"])) == 0


async def test_time_spent_on_quota_locks_still_refuses_before_attempt_insert(creation, monkeypatch):
    c = creation
    row, _ = await high_case(c, monkeypatch)
    claimed = await worker.claim(creation_id=row["creation_id"])
    clock = iter([100., 102.])
    monkeypatch.setattr(team, "monotonic", lambda: next(clock))
    with pytest.raises(RunnerError) as failure:
        await team.reserve(claimed, "creator", 1, deadline=401.)
    assert failure.value.code == "run_timeout"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Attempt).where(Attempt.job_id == claimed["job_id"])) == 0
