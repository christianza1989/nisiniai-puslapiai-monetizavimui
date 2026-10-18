"""Known inert role-boundary timing; never reads a protected calibration case."""
import asyncio
import json
import os
from copy import deepcopy
from datetime import timedelta
from time import monotonic

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_model_prepare_pg import Roles, model_pilot, stored, submit  # noqa: F401
from test_acquisition_native_chain_pg import native  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import model_handler, model_observation
from pinet_core.acquisition.model_contract import KIND
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task
from pinet_core.tasks.service import lease_deadline

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit owned native lease PostgreSQL QA only; inert adapters")


@pytest.mark.parametrize("barrier", ["expired-lease", "revoked-authorization"])
async def test_role_boundary_never_revives_late_lease_or_authority(native, monkeypatch, tmp_path, barrier):  # noqa: F811
    p, roles = native, Roles()
    diagnostics = tmp_path/"guard-observations"
    monkeypatch.setattr(model_observation, "ROOT", diagnostics)
    monkeypatch.setattr(settings(), "acquisition_model_guard_observation_enabled", True)
    request = deepcopy(p["request"])
    request.update(stage="research", native=p["pair"])
    request["campaign"]["mode"] = "research_only"
    identity = await submit(p, request)

    async def adapter(role, schema, instruction, data, heartbeat, deadline):
        result = await roles(role, schema, instruction, data, heartbeat, deadline)
        assert role == "researcher"
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            if barrier == "expired-lease":
                await tx.execute(update(Task).where(Task.id == identity).values(lease_until=utcnow()-timedelta(seconds=1)))
            else:
                await tx.execute(update(ModelAuthorization).where(
                    ModelAuthorization.id == p["pair"]["research_authorization_id"]).values(enabled=False))
        return result

    assert await worker.execute_once(adapter, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == run.status == "failed" and task.lease_until is None
    assert roles.calls == ["researcher"] and len(attempts) == 1
    assert attempts[0].state == "failed" and attempts[0].output is None
    assert run.usage["input_tokens"] == 5 and run.usage["unknown_usage_calls"] == 0
    assert run.usage["model_calls"] == 1 and run.usage["usage_complete"]
    rows = [json.loads(path.read_text()) for path in diagnostics.glob("*/*.json")]
    wanted = "lease_expired" if barrier == "expired-lease" else "acquisition_model_authorization_stale"
    assert any(row["code"] == wanted for row in rows)
    assert any(row["phase"] == "role_execution" and row["usage_known"] is True for row in rows)
    if barrier == "expired-lease":
        witness = next(row for row in rows if row["phase"] == "role_settle_before")
        assert witness["clock_source"] == "database" and witness["lease_until"] < witness["observed_at"]
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(Case)) == 0
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 0


async def test_native_inter_role_proofs_preserve_live_fifteen_second_lease(native, monkeypatch):  # noqa: F811
    p, roles, started, checkpoints = native, Roles(), None, []
    assert 14.5 < (lease_deadline()-utcnow()).total_seconds() <= 15
    original = model_handler.preflight

    async def paced(tx, task):
        result = await original(tx, task)
        if started is not None and len(checkpoints) < 4:
            # Real database time, unchanged15s lease. Stand in for expensive
            # native/Git proof returns at4/8/12/16s after the last role heartbeat.
            position = len(checkpoints)+1
            await asyncio.sleep(max(0, started+4*position-monotonic()))
            lease, now = (await tx.execute(select(Task.lease_until, func.clock_timestamp()).where(
                Task.id == task.id))).one()
            checkpoints.append({"proof": position, "elapsed": round(monotonic()-started, 3),
                "lease_remaining": round((lease-now).total_seconds(), 3)})
        return result

    async def adapter(role, schema, instruction, data, heartbeat, deadline):
        nonlocal started
        result = await roles(role, schema, instruction, data, heartbeat, deadline)
        if role == "researcher":
            started = monotonic()
        return result

    monkeypatch.setattr(model_handler, "preflight", paced)
    request = deepcopy(p["request"])
    request.update(stage="research", native=p["pair"])
    request["campaign"]["mode"] = "research_only"
    identity = await submit(p, request)
    assert await worker.execute_once(adapter, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    witness = {"default_lease_seconds": 15, "role_limit_seconds": settings().acquisition_model_runner_seconds,
        "checkpoints": checkpoints, "task_status": task.status, "task_failure": task.failure_code,
        "attempts": [{"role": a.role, "state": a.state, "usage_known": a.usage is not None} for a in attempts],
        "usage": run.usage}
    print("inert_role_boundary_witness="+json.dumps(witness, sort_keys=True))
    assert task.status == run.status == "succeeded", witness
    assert len(checkpoints) == 4 and checkpoints[-1]["elapsed"] >= 16
    assert all(c["lease_remaining"] > 0 for c in checkpoints)
    assert roles.calls == ["researcher", "reviewer"]
    assert [a.state for a in attempts] == ["succeeded", "succeeded"]
    assert run.usage["model_calls"] == 2 and run.usage["unknown_usage_calls"] == 0
    assert 14.5 < (lease_deadline()-utcnow()).total_seconds() <= 15
