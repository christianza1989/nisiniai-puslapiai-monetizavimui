"""Two-transaction retained-identity seam, not historical writer attribution."""

import asyncio
import os
import weakref
from datetime import timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_agent_roles_pg import request, six, submit  # noqa: F401
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_acquisition_model_prepare_pg import stored
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import agent_role_authority, model_handler
from pinet_core.acquisition.agent_role_contract import KIND
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.control.routes import scope
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit isolated retained0050 PG, no providers")


@pytest.mark.parametrize("change", ["renewed", "expired", "terminal", "authority", "unretained"])
async def test_heartbeat_uses_committed_locked_state_after_retained_identity_wait(six, monkeypatch, change):  # noqa: F811
    p = six
    identity = await submit(p, request(p))
    claimed = await worker.claim(kind=KIND, task_id=identity)
    assert claimed and claimed["task_id"] == identity
    if change in {"renewed", "unretained"}:
        async with scope(user=p["user_id"]) as tx:
            task = await tx.get(Task, identity, with_for_update=True)
            task.lease_until = utcnow() + timedelta(seconds=4)
    loaded, updated = asyncio.Event(), asyncio.Event()
    original, retained = model_handler.preflight, []
    snapshot = {}

    async def held_preflight(tx, task):
        if asyncio.current_task().get_name() == "controlled-heartbeat" and not loaded.is_set():
            # Explicit strong-reference seam. Default SQLAlchemy identities are
            # weak; real six-role production retention is NOT established here.
            if change != "unretained":
                retained.append(task)
            snapshot["weak"] = weakref.ref(task)
            snapshot["lease"] = task.lease_until
            snapshot["status"] = task.status
            loaded.set()
            await updated.wait()
        return await original(tx, task)

    monkeypatch.setattr(model_handler, "preflight", held_preflight)
    heartbeat = asyncio.create_task(worker.heartbeat(identity, claimed["run_id"], user_id=p["user_id"], kind=KIND),
                                    name="controlled-heartbeat")
    try:
        await asyncio.wait_for(loaded.wait(), 10)
        if change == "authority":
            async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
                policy = await tx.get(ModelAuthorization, p["team"]["coordinator"]["authorization_id"])
                policy.enabled = False
        else:
            async with scope(user=p["user_id"]) as tx:
                current = await tx.get(Task, identity, populate_existing=True)
                await agent_role_authority.preflight(tx, current)
                current = await tx.scalar(select(Task).where(Task.id == identity).with_for_update()
                                          .execution_options(populate_existing=True))
                now = await tx.scalar(text("SELECT clock_timestamp()"))
                assert current.lease_until > now  # Never renew an already-expired DB lease.
                if change in {"renewed", "unretained"}:
                    await model_handler.renew_role_lease(tx, current, claimed["run_id"], phase="role_settle_after")
                elif change == "expired":
                    current.lease_until = now - timedelta(seconds=1)
                else:
                    current.status, current.failure_code = "failed", "worker_interrupted"
                    await worker.finish_run(tx, current, "failed")
        if change in {"renewed", "unretained"}:
            await asyncio.sleep(max(0, (snapshot["lease"] - utcnow()).total_seconds() + 0.05))
            async with scope(user=p["user_id"]) as tx:
                fresh = await tx.get(Task, identity)
                assert fresh.lease_until > await tx.scalar(text("SELECT clock_timestamp()"))
                assert snapshot["lease"] < utcnow()
        updated.set()
        accepted = await asyncio.wait_for(heartbeat, 20)
        assert accepted is (change in {"renewed", "unretained"})
        task, run, attempts = await stored(p, identity)
        assert not attempts  # Claim/heartbeat only, no provider reservation.
        if change in {"renewed", "unretained"}:
            assert task.status == run.status == "running" and task.run_id == claimed["run_id"]
            if change == "unretained":
                assert snapshot["weak"]() is None
        else:
            assert task.status == run.status == "failed"
    finally:
        updated.set()
        if not heartbeat.done():
            heartbeat.cancel()
        await asyncio.gather(heartbeat, return_exceptions=True)
