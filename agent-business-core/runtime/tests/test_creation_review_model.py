"""Real restricted PostgreSQL reservations, additive history and fail-closed rollback."""
import asyncio
import hashlib
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_team import runner, team_read
from test_customer_creations import creation as _creation_fixture
from test_customer_creations import start, verified
from test_customer_public import customers  # noqa: F401 - explicit shared fixture registration

from pinet_core.config import settings
from pinet_core.control.routes import scope
from pinet_core.creation import adapter, worker
from pinet_core.creation.models import Attempt, Job
from pinet_core.models import utcnow

creation = _creation_fixture


async def snapshot(c):
    async with AsyncSession(c["admin"]) as tx:
        rows = (await tx.execute(text("SELECT to_jsonb(a)::text FROM control_creation_attempts a "
            "WHERE environment_id=:e ORDER BY id"), {"e": c["environment"]})).scalars().all()
        return hashlib.sha256(json.dumps(rows).encode()).hexdigest()


async def test_mixed_model_history_and_disabled_ceiling_keep_exact_reservations(creation, monkeypatch):
    c = creation
    monkeypatch.setattr(settings(), "creation_daily_limit", 0)
    monkeypatch.setattr(settings(), "creation_global_daily_limit", 0)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    calls = []
    assert await worker.execute_once(role_runner=runner(calls))
    view = await team_read(c, auth, row["creation_id"])
    assert [a["model"] for a in view["attempts"]] == ["gpt-6-luna", "gpt-6.1-sol", "gpt-6.1-sol"]
    async with scope(user=me["user_id"]) as tx:
        first = await tx.get(Attempt, str(view["attempts"][0]["attempt_id"]))
        legacy = {column.name: getattr(first, column.name) for column in Attempt.__table__.columns}
        # Labelled synthetic historical Luna reservation, separate from new Sol reviews.
        legacy.update(id=str(uuid4()), sequence=4, role="critic", round_number=2, model="gpt-6-luna")
        tx.add(Attempt(**legacy))
    original = await snapshot(c)
    mixed = await team_read(c, auth, row["creation_id"])
    by_id = {attempt["attempt_id"]: attempt for attempt in mixed["attempts"]}
    assert all(by_id[attempt["attempt_id"]] == attempt for attempt in view["attempts"])
    assert by_id[legacy["id"]]["model"] == "gpt-6-luna"
    assert mixed["current_revision"] == 1
    for role, model in [("creator", "gpt-6.1-sol"), ("critic", "customer-selected")]:
        with pytest.raises(DBAPIError):
            async with scope(user=me["user_id"]) as tx:
                tx.add(Attempt(**{**legacy, "id": str(uuid4()), "sequence": 5, "role": role, "model": model}))
                await tx.flush()
    assert await snapshot(c) == original
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"),
            {"e": c["environment"], "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}) == 4


async def test_changed_execution_profile_stops_before_next_reservation(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    claim = await worker.claim()
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(Job, claim["job_id"])
        initial = job.instruction_hash
    profile = adapter.role_profile
    monkeypatch.setattr(adapter, "role_profile", lambda role: {**profile(role), "model": "changed"})
    assert adapter.team_instruction_hash() != initial
    from pinet_core.creation import team
    with pytest.raises(adapter.RunnerError, match="instructions_changed"):
        await team.reserve(claim, "creator", 1)
    assert (await team_read(c, auth, row["creation_id"]))["attempts"] == []


@pytest.mark.parametrize('mode', ['missing', 'modified', 'changed_hash'])
async def test_catalogue_dependency_stops_without_a_reserved_provider_attempt(creation, monkeypatch, tmp_path, mode):
    import hashlib

    from pinet_core.creation import team

    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    claim = await worker.claim()
    original = adapter.REVIEW_MODEL_CATALOGUE.read_bytes()
    changed = tmp_path / 'catalogue.json'
    if mode != 'missing':
        changed.write_bytes(original + b'\n')
    monkeypatch.setattr(adapter, 'REVIEW_MODEL_CATALOGUE', changed)
    if mode == 'changed_hash':
        monkeypatch.setattr(adapter, 'REVIEW_MODEL_CATALOGUE_SHA256', hashlib.sha256(changed.read_bytes()).hexdigest())
    code = 'instructions_changed' if mode == 'changed_hash' else 'runner_unavailable'
    with pytest.raises(adapter.RunnerError, match=code):
        await team.reserve(claim, 'creator', 1)
    assert (await team_read(c, auth, row['creation_id']))['attempts'] == []


async def test_populated_sol_history_blocks_downgrade_without_row_changes(creation):
    c = creation
    assert c["admin"].url.database.startswith("pinet_review_model_qa_")
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    assert await worker.execute_once(role_runner=runner([]))
    view = await team_read(c, auth, row["creation_id"])
    async with scope(user=me["user_id"]) as tx:
        first = await tx.get(Attempt, str(view["attempts"][0]["attempt_id"]))
        historical_sol = {column.name: getattr(first, column.name) for column in Attempt.__table__.columns}
        historical_sol.update(id=str(uuid4()), sequence=4, role="critic", round_number=2, model="gpt-6.1-sol")
        tx.add(Attempt(**historical_sol))
    before = await snapshot(c)
    proc = await asyncio.create_subprocess_exec(sys.executable, "-m", "alembic", "downgrade", "0017_customer_profile",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    output, _ = await proc.communicate()
    Path("artifacts/qa-review-model-downgrade-" + str(uuid4()) + ".private.log").write_bytes(output)
    assert proc.returncode != 0 and b"control_creation_attempts_model_check" in output
    assert await snapshot(c) == before
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(text("SELECT version_num FROM alembic_version")) == "0020_native_review_model"
    assert (await team_read(c, auth, row["creation_id"]))["current_revision"] == 1


async def test_actual_0017_rejected_before_queue_or_first_reservation(creation):
    from pinet_core.creation import team
    from pinet_core.db import db

    c = creation
    assert c["admin"].url.database.startswith("pinet_review_model_qa_")
    async def migrate(target, direction):
        proc = await asyncio.create_subprocess_exec(sys.executable, "-m", "alembic", direction, target,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
        output, _ = await proc.communicate()
        Path("artifacts/qa-review-model-schema-" + str(uuid4()) + ".private.log").write_bytes(output)
        assert proc.returncode == 0
    _, auth, me = await verified(c)
    row, original_body = await start(c, auth, me)
    claim = await worker.claim()
    await migrate("0017_customer_profile", "downgrade")
    try:
        async with db.registry() as tx:
            assert not await team.review_schema_ready(tx)
        with pytest.raises(adapter.RunnerError, match="runner_unavailable"):
            await team.reserve(claim, "creator", 1)
        assert (await team_read(c, auth, row["creation_id"]))["attempts"] == []
        response = await c["client"].post("/customer/v2/creations", headers=auth,
            json={**original_body, "idempotency_key": str(uuid4())})
        assert response.status_code == 503 and response.json()["code"] == "creation_unavailable"
        async with AsyncSession(c["admin"]) as tx:
            assert await tx.scalar(text("SELECT count(*) FROM control_creation_attempts WHERE environment_id=:e"),
                {"e": c["environment"]}) == 0
    finally:
        await migrate("head", "upgrade")
    async with db.registry() as tx:
        assert await team.review_schema_ready(tx)


@pytest.mark.parametrize("failed_role", [None, "critic", "coordinator"])
async def test_actual_model_reservation_and_success_or_failure_receipt_agree(creation, failed_role):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    calls = []
    base = runner(calls)

    async def checked(context, authorized, *, role, seconds):
        expected = "gpt-6-luna" if role == "creator" else "gpt-6.1-sol"
        async with scope(user=me["user_id"]) as tx:
            reserved = await tx.scalar(text("SELECT model FROM control_creation_attempts WHERE creation_id=:c "
                "ORDER BY sequence DESC LIMIT 1"), {"c": row["creation_id"]})
            assert reserved == expected
        if role == failed_role:
            raise adapter.RunnerError("provider_error", {"model": expected,
                "usage": {"input_tokens": 7, "output_tokens": 2}, "web_search_count": 0})
        value, receipt = await base(context, authorized, role=role, seconds=seconds)
        return value, {**receipt, "model": expected}

    assert await worker.execute_once(role_runner=checked)
    view = await team_read(c, auth, row["creation_id"])
    expected_models = ["gpt-6-luna", "gpt-6.1-sol"] + ([] if failed_role == "critic" else ["gpt-6.1-sol"])
    assert [item["model"] for item in view["attempts"]] == expected_models
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(Job, row["active_job_id"])
        assert [item["model"] for item in job.usage["attempts"]] == expected_models
        assert job.status == ("failed" if failed_role else "succeeded")
        if failed_role:
            assert job.usage["attempts"][-1]["failure_code"] == "provider_error"
            assert job.usage["attempts"][-1]["usage"] == {"input_tokens": 7, "output_tokens": 2}
    assert view["current_revision"] == (None if failed_role else 1)
    assert view["attempts"][-1]["state"] == ("failed" if failed_role else "succeeded")
