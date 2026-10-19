"""Owned dedicated PG only: a real proof delay, inert provider, no lease rewriting."""
import asyncio
import json
import os
from copy import deepcopy
from time import monotonic

import pytest
from sqlalchemy import func, select
from test_acquisition_model_prepare_pg import Roles, model_pilot, stored, submit  # noqa: F401
from test_acquisition_native_chain_pg import native  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import model_handler
from pinet_core.acquisition.model_contract import KIND
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit leased dedicated QA only; inert adapters, no operating database")


async def test_live_model_ownership_survives_twenty_second_post_result_proof(native, monkeypatch):  # noqa: F811
    p, roles, returned, delayed, witness = native, Roles(), False, False, {}
    original = model_handler.preflight

    async def paced(tx, task):
        nonlocal delayed
        result = await original(tx, task)
        if returned and not delayed:
            delayed = True
            started = monotonic()
            await asyncio.sleep(20)
            lease, now = (await tx.execute(select(Task.lease_until, func.clock_timestamp()).where(
                Task.id == task.id))).one()
            witness.update(elapsed_seconds=monotonic() - started, lease_remaining_seconds=(lease - now).total_seconds())
        return result

    async def adapter(*args):
        nonlocal returned
        result = await roles(*args)
        returned = True
        return result

    monkeypatch.setattr(model_handler, "preflight", paced)
    request = deepcopy(p["request"])
    request.update(stage="research", native=p["pair"])
    request["campaign"]["mode"] = "research_only"
    identity = await submit(p, request)
    assert await asyncio.wait_for(worker.execute_once(adapter, kind=KIND, task_id=identity), timeout=90)
    task, run, attempts = await stored(p, identity)
    witness.update(task_status=task.status, run_status=run.status, failure_code=task.failure_code,
                   attempt_count=len(attempts), usage=run.usage)
    print("inert_post_result_lease_witness=" + json.dumps(witness, sort_keys=True))
    assert 1 <= len(attempts) <= 2 and 1 <= len(roles.calls) <= 2
    assert run.usage["model_calls"] == len(attempts) and run.usage["unknown_usage_calls"] == 0
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(Case)) == 0
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 0
    if task.status == "failed":
        # The predecessor RED must retain its one known attempt, not lose usage
        # or create a CRM/mail effect while rejecting an expired ownership TTL.
        assert task.failure_code in {"authorization_revoked", "worker_interrupted"}
        assert len(attempts) == 1 and attempts[0].state == "failed" and attempts[0].output is None
        assert run.usage["input_tokens"] == 5 and run.usage["output_tokens"] == 2
        assert run.usage["usage_complete"] is True
    assert task.status == run.status == "succeeded", witness
    assert delayed and witness["elapsed_seconds"] >= 20 and witness["lease_remaining_seconds"] > 0
    assert roles.calls == ["researcher", "reviewer"]
    assert len(attempts) == 2 and all(row.state == "succeeded" for row in attempts)
    assert run.usage["input_tokens"] == 10 and run.usage["output_tokens"] == 4
    assert run.usage["model_calls"] == run.usage["settled_calls"] == 2
    assert run.usage["unknown_usage_calls"] == 0 and run.usage["usage_complete"] is True
    assert run.cost_microusd is None
