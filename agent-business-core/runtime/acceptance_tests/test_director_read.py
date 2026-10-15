"""Opt-in full0028 restricted PostgreSQL; fake adapters are source QA only."""

import asyncio
import hashlib
import importlib.util
import json
import secrets
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_acquisition_correspondence import CONFIG, capture, mutate, snapshot
from test_acquisition_correspondence import lane as _work_lane

from pinet_core.acquisition.ledger import apply_scope
from pinet_core.control.routes import password_hash, scope, token_hash
from pinet_core.db import db
from pinet_core.director.read import ADAPTER_REVISION, CAPTURE, WORK, validate_storage
from pinet_core.tasks import codex, worker

pytestmark = pytest.mark.skipif(
    not CONFIG, reason="Explicit fresh full0028 director QA configuration required"
)
work_lane = _work_lane


@pytest.fixture
async def lane(work_lane, monkeypatch):
    value = work_lane
    for key, item in {
        "director_acquisition_enabled": True,
        "chat_enabled": True,
        "chat_runner_enabled": True,
        "chat_operator_user_id": value.ids["user"],
        "chat_daily_limit": 100,
    }.items():
        monkeypatch.setattr(value.cfg, key, item)
    await validate_storage(db)
    return value


async def submit(lane, message="Show canonical acquisition counts.", thread=None):
    path = (
        f"/operator/v2/chat/threads/{thread}/messages"
        if thread
        else f"/operator/v2/businesses/{lane.ids['business']}/chat/threads"
    )
    reply = await lane.client.post(
        path,
        headers={"Authorization": "Bearer " + lane.token},
        json={"message": message, "idempotency_key": str(uuid4())},
    )
    assert reply.status_code == 202
    return reply.json()["data"]["task"]


async def record(lane, task_id):
    async with lane.admin.connect() as tx:
        row = (
            await tx.execute(
                text("SELECT status,result,run_id,failure_code FROM control_tasks WHERE id=:i"),
                {"i": task_id},
            )
        ).one()
        receipt = (
            await tx.execute(
                text("SELECT data,input_sha256 FROM control_director_contexts WHERE task_id=:i"),
                {"i": task_id},
            )
        ).first()
        usage = await tx.scalar(text("SELECT usage FROM control_task_runs WHERE task_id=:i"), {"i": task_id})
    return row, receipt, usage


async def fake_answer(context, heartbeat):
    assert await heartbeat()
    assert "_director_receipt" not in context
    return {"answer": "Synthetic source QA reply; nothing sent.", "limitations": []}, {
        "input_tokens": 12,
        "output_tokens": 5,
    }


async def test_consultation_uses_same_canonical_snapshot_and_immutable_receipt(lane):
    await capture(lane)
    task = await submit(lane)
    observed = []

    async def fake(context, heartbeat):
        observed.append(context)
        return await fake_answer(context, heartbeat)

    assert await worker.execute_once(fake, kind="chat.consult")
    row, receipt, usage = await record(lane, task["task_id"])
    assert row.status == "succeeded" and receipt and usage == {"input_tokens": 12, "output_tokens": 5}
    value = observed[0]
    assert [item["name"] for item in value["server_tools"]] == [CAPTURE, WORK]
    work = next(item["data"] for item in value["server_tools"] if item["name"] == WORK)
    current = await snapshot(lane)
    assert work["counts"] == current["counts"] and work["watermark"] == current["watermark"]
    assert work["counts"]["outbound_captured"] == 1 and work["external_sent"] is False
    assert hashlib.sha256(codex.prompt_for(value).encode()).hexdigest() == receipt.input_sha256
    stored = receipt.data
    assert stored["context"] == value
    assert (
        hashlib.sha256(
            (
                stored["instruction"] + json.dumps(stored["context"], ensure_ascii=False, sort_keys=True)
            ).encode()
        ).hexdigest()
        == receipt.input_sha256
    )
    headers = {"Authorization": "Bearer " + lane.token}
    sidecar = await lane.client.get(f"/operator/v2/tasks/{task['task_id']}/director-context", headers=headers)
    assert sidecar.status_code == 200
    body = sidecar.json()["data"]["context"]
    assert body["input_sha256"] == receipt.input_sha256 and body["tools"] == value["server_tools"]
    assert (
        '"instruction"' not in sidecar.text
        and '"history"' not in sidecar.text
        and '"message"' not in sidecar.text
    )
    report = await lane.client.get(f"/operator/v2/tasks/{task['task_id']}/report", headers=headers)
    assert (
        report.status_code == 200
        and report.json()["data"]["execution"]["adapter_revision"] == ADAPTER_REVISION
    )
    assert set(report.json()["data"]) == {"agent_id", "task", "execution", "source_revision"}


async def test_default_off_keeps_legacy_context_without_receipt(lane, monkeypatch):
    monkeypatch.setattr(lane.cfg, "director_acquisition_enabled", False)
    task = await submit(lane)

    async def fake(context, heartbeat):
        assert "server_tools" not in context
        return await fake_answer(context, heartbeat)

    assert await worker.execute_once(fake, kind="chat.consult")
    row, receipt, _ = await record(lane, task["task_id"])
    assert row.status == "succeeded" and receipt is None


@pytest.mark.parametrize("mode", ["stop", "expiry"])
async def test_retained_work_snapshot_after_marketing_stop_or_expiry(lane, mode):
    await capture(lane)
    await mutate(
        lane,
        "UPDATE acquisition_modules SET enabled=false WHERE business_id=:business"
        if mode == "stop"
        else "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business",
    )
    task = await submit(lane)

    async def fake(context, heartbeat):
        capture_data, work_data = context["server_tools"]
        assert capture_data["status"] == "unavailable" and capture_data["data"] is None
        assert work_data["status"] == "available" and work_data["data"]["counts"]["outbound_captured"] == 1
        return await fake_answer(context, heartbeat)

    assert await worker.execute_once(fake, kind="chat.consult")
    assert (await record(lane, task["task_id"]))[0].status == "succeeded"


@pytest.mark.parametrize(
    "mode",
    [
        "work_read",
        "capture_read",
        "stop",
        "expiry",
        "user",
        "membership",
        "grant",
        "session",
        "session_expiry",
        "source",
        "registration",
        "feature_off",
    ],
)
async def test_current_authority_revocation_during_model_discards_answer_and_keeps_usage(
    lane, mode, monkeypatch
):
    task = await submit(lane)

    async def fake(context, heartbeat):
        assert all(item["status"] == "available" for item in context["server_tools"])
        if mode == "registration":
            path = lane.paths["acquisition_work_config"]
            path.write_bytes(path.read_bytes() + b" ")
        elif mode == "source":
            monkeypatch.setattr(lane.cfg, "control_source_revision", "b" * 40)
        elif mode == "feature_off":
            monkeypatch.setattr(lane.cfg, "director_acquisition_enabled", False)
        else:
            sql = {
                "work_read": "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.correspondence.read' WHERE business_id=:business",
                "capture_read": "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.read' WHERE business_id=:business",
                "stop": "UPDATE acquisition_modules SET enabled=false WHERE business_id=:business",
                "expiry": "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business",
                "user": "UPDATE control_users SET enabled=false WHERE id=:user",
                "membership": "UPDATE control_memberships SET enabled=false WHERE id=:membership",
                "grant": "UPDATE control_business_grants SET enabled=false WHERE id=:grant",
                "session": "UPDATE control_sessions SET revoked_at=clock_timestamp() WHERE id=:session",
                "session_expiry": "UPDATE control_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE id=:session",
            }[mode]
            await mutate(lane, sql)
        return {"answer": "Private synthetic answer must not commit.", "limitations": []}, {
            "input_tokens": 12,
            "output_tokens": 5,
        }

    assert await worker.execute_once(fake, kind="chat.consult")
    row, receipt, usage = await record(lane, task["task_id"])
    assert row.status == "failed" and row.result is None and receipt is not None
    assert usage == {"input_tokens": 12, "output_tokens": 5}, (
        "Known attempt usage must survive authority loss"
    )


async def test_revoked_read_cannot_leak_previous_tool_answer_via_history_or_new_model(lane):
    task = await submit(lane)

    async def canary(context, heartbeat):
        return {"answer": "Private synthetic prior-tool canary.", "limitations": []}, {"input_tokens": 12}

    assert await worker.execute_once(canary, kind="chat.consult")
    await mutate(
        lane,
        "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.correspondence.read' WHERE business_id=:business",
    )
    headers = {"Authorization": "Bearer " + lane.token}
    for path in [
        f"/tasks/{task['task_id']}",
        f"/tasks/{task['task_id']}/report",
        f"/tasks/{task['task_id']}/director-context",
        f"/chat/threads/{task['thread_id']}",
    ]:
        reply = await lane.client.get("/operator/v2" + path, headers=headers)
        assert reply.status_code == 403 and "canary" not in reply.text
    page = await lane.client.get(f"/operator/v2/businesses/{lane.ids['business']}/tasks", headers=headers)
    assert page.status_code == 403 and "canary" not in page.text
    await submit(lane, thread=task["thread_id"])

    async def clean(context, heartbeat):
        assert context["history"] == [] and "canary" not in json.dumps(context)
        assert context["server_tools"][1]["data"] is None
        return await fake_answer(context, heartbeat)

    assert await worker.execute_once(clean, kind="chat.consult")


async def test_receipt_scope_and_immutable_privileges(lane):
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    row, receipt, _ = await record(lane, task["task_id"])
    for field in ["business_id", "site_id", "environment_id", "adapter_id", "environment_class"]:
        async with scope(user=lane.ids["user"]) as tx:
            await apply_scope(tx, lane.scope, lane.adapter)
            await tx.execute(
                text("SELECT set_config('pinet.director_organization',:o,true)"),
                {"o": lane.ids["organization"]},
            )
            await tx.execute(text("SELECT set_config(:k,'foreign',true)"), {"k": "pinet.acq_" + field})
            assert (
                await tx.scalar(
                    text("SELECT count(*) FROM control_director_contexts WHERE id=:i"), {"i": row.run_id}
                )
                == 0
            )
    for action in [
        "UPDATE control_director_contexts SET input_sha256=:v WHERE id=:i",
        "DELETE FROM control_director_contexts WHERE id=:i",
    ]:
        with pytest.raises(DBAPIError):
            async with scope(user=lane.ids["user"]) as tx:
                await apply_scope(tx, lane.scope, lane.adapter)
                await tx.execute(
                    text("SELECT set_config('pinet.director_organization',:o,true)"),
                    {"o": lane.ids["organization"]},
                )
                await tx.execute(text(action), {"i": row.run_id, "v": "b" * 64})
    assert (await record(lane, task["task_id"]))[1].input_sha256 == receipt.input_sha256


async def test_mismatched_run_pointer_never_bypasses_context_read(lane, monkeypatch):
    monkeypatch.setattr(lane.cfg, "director_acquisition_enabled", False)
    legacy = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    other = (await record(lane, legacy["task_id"]))[0]
    monkeypatch.setattr(lane.cfg, "director_acquisition_enabled", True)
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    await mutate(
        lane, "UPDATE control_tasks SET run_id=:r WHERE id=:t", {"r": other.run_id, "t": task["task_id"]}
    )
    reply = await lane.client.get(
        f"/operator/v2/tasks/{task['task_id']}", headers={"Authorization": "Bearer " + lane.token}
    )
    assert reply.status_code == 403 and "Synthetic source QA reply" not in reply.text


async def test_session_expiry_after_module_lock_wait_fences_final_commit(lane):
    task = await submit(lane)
    locked = asyncio.Event()
    release = asyncio.Event()

    async def holder():
        async with lane.admin.connect() as tx:
            transaction = await tx.begin()
            await tx.execute(
                text(
                    "SELECT 1 FROM acquisition_modules WHERE business_id=:b AND environment_id=:e FOR UPDATE"
                ),
                {"b": lane.ids["business"], "e": lane.scope.environment_id},
            )
            locked.set()
            await release.wait()
            await transaction.rollback()

    holding = None

    async def fake(context, heartbeat):
        nonlocal holding
        await mutate(
            lane,
            "UPDATE control_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE id=:session",
        )
        holding = asyncio.create_task(holder())
        await locked.wait()
        return {"answer": "Synthetic stale result.", "limitations": []}, {"input_tokens": 12}

    job = asyncio.create_task(worker.execute_once(fake, kind="chat.consult"))
    try:
        await asyncio.wait_for(locked.wait(), 5)
        async with lane.admin.connect() as tx:
            waited = False
            for _ in range(40):
                await tx.execute(text("SELECT pg_stat_clear_snapshot()"))
                waited = await tx.scalar(
                    text(
                        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%director_pin_reader%')"
                    )
                )
                if waited:
                    break
                await asyncio.sleep(0.05)
            assert waited, "Must observe actual final Module lock wait before deadline"
        await asyncio.sleep(1.1)
        release.set()
        assert await asyncio.wait_for(job, 8)
        row, receipt, usage = await record(lane, task["task_id"])
        assert row.status == "failed" and row.result is None and receipt and usage == {"input_tokens": 12}
    finally:
        release.set()
        if holding:
            await holding
        if not job.done():
            await job


async def settle(tx, claimed, *, usage=None, **changes):
    params = {
        "t": claimed["task_id"],
        "r": claimed["run_id"],
        "u": claimed["user_id"],
        "e": claimed["environment_id"],
        "s": claimed["source_revision"],
        "k": claimed["kind"],
        "j": json.dumps(usage) if usage is not None else None,
        "event": str(uuid4()),
        **changes,
    }
    return await tx.scalar(
        text("SELECT director_settle_revoked_task(:t,:r,:u,:e,:s,:k,CAST(:j AS JSONB),:event)"), params
    )


async def test_terminal_settlement_scope_replay_preserves_first_known_usage(lane):
    task = await submit(lane)
    claimed = await worker.claim(kind="chat.consult")
    assert claimed and claimed["task_id"] == task["task_id"]
    await mutate(lane, "UPDATE control_memberships SET enabled=false WHERE id=:membership")
    for changed in [
        {"u": str(uuid4())},
        {"e": "foreign"},
        {"s": "b" * 40},
        {"r": str(uuid4())},
        {"k": "unregistered"},
        {"t": str(uuid4())},
    ]:
        async with scope(user=lane.ids["user"]) as tx:
            assert not await settle(tx, claimed, usage={"input_tokens": 12}, **changed)
    for malformed in [
        {"secret": "private-test"},
        {"input_tokens": -1},
        {"input_tokens": True},
        {"input_tokens": 1.5},
        {"input_tokens": 10**10},
        {"model_calls": 1},
    ]:
        async with scope(user=lane.ids["user"]) as tx:
            assert not await settle(tx, claimed, usage=malformed)
    before = (await record(lane, task["task_id"]))[0]
    assert before.status == "running"
    async with scope(user=lane.ids["user"]) as tx:
        assert await settle(tx, claimed, usage={"input_tokens": 12})
    row, receipt, usage = await record(lane, task["task_id"])
    assert row.status == "failed" and row.result is None and receipt and usage == {"input_tokens": 12}
    async with lane.admin.connect() as tx:
        rows = (
            (
                await tx.execute(
                    text(
                        "SELECT md5(to_jsonb(t)::text) FROM control_task_events t WHERE task_id=:i ORDER BY sequence"
                    ),
                    {"i": task["task_id"]},
                )
            )
            .scalars()
            .all()
        )
    async with scope(user=lane.ids["user"]) as tx:
        assert await settle(tx, claimed, usage={"input_tokens": 99})
    assert (await record(lane, task["task_id"]))[2] == {"input_tokens": 12}
    async with lane.admin.connect() as tx:
        replay = (
            (
                await tx.execute(
                    text(
                        "SELECT md5(to_jsonb(t)::text) FROM control_task_events t WHERE task_id=:i ORDER BY sequence"
                    ),
                    {"i": task["task_id"]},
                )
            )
            .scalars()
            .all()
        )
    assert replay == rows


async def test_cancelled_attempt_usage_settles_after_grant_loss_without_resurrection(lane):
    task = await submit(lane)
    claimed = await worker.claim(kind="chat.consult")
    reply = await lane.client.post(
        f"/operator/v2/tasks/{task['task_id']}/cancel", headers={"Authorization": "Bearer " + lane.token}
    )
    assert reply.status_code == 200
    await mutate(lane, "UPDATE control_business_grants SET enabled=false WHERE id=:grant")
    async with scope(user=lane.ids["user"]) as tx:
        assert await settle(tx, claimed, usage={"input_tokens": 12})
    row, receipt, usage = await record(lane, task["task_id"])
    assert row.status == "cancelled" and row.result is None and receipt and usage == {"input_tokens": 12}


async def test_terminal_helper_cannot_change_a_completed_answer(lane):
    task = await submit(lane)
    claimed = await worker.claim(kind="chat.consult")
    # Explicit source QA drives the same already claimed attempt to a retained success.
    async with lane.admin.begin() as tx:
        await tx.execute(
            text("UPDATE control_tasks SET status='succeeded',result=CAST(:v AS JSONB) WHERE id=:i"),
            {
                "i": task["task_id"],
                "v": json.dumps({"answer": "Synthetic retained original", "limitations": []}),
            },
        )
        await tx.execute(
            text("UPDATE control_task_runs SET status='succeeded',usage=CAST(:v AS JSONB) WHERE id=:i"),
            {"i": claimed["run_id"], "v": json.dumps({"input_tokens": 7})},
        )
    async with scope(user=lane.ids["user"]) as tx:
        assert not await settle(tx, claimed, usage={"input_tokens": 99})
    row, receipt, usage = await record(lane, task["task_id"])
    assert (
        row.status == "succeeded"
        and row.result["answer"] == "Synthetic retained original"
        and usage == {"input_tokens": 7}
    )


async def test_real_foreign_session_cannot_read_owner_task_or_director_sidecar(lane):
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    foreign, session, token = str(uuid4()), str(uuid4()), secrets.token_urlsafe(48)
    async with lane.admin.begin() as tx:
        await tx.execute(
            text(
                "INSERT INTO control_users(id,environment_id,username,password_hash,identity_issuer,identity_subject,enabled) VALUES(:u,:e,:u,:p,'synthetic-foreign',:u,true)"
            ),
            {"u": foreign, "e": lane.scope.environment_id, "p": password_hash(str(uuid4()))},
        )
        await tx.execute(
            text(
                "INSERT INTO control_sessions(id,environment_id,user_id,token_hash,created_at,expires_at) VALUES(:s,:e,:u,:t,clock_timestamp(),clock_timestamp()+interval '10 minutes')"
            ),
            {"s": session, "e": lane.scope.environment_id, "u": foreign, "t": token_hash(token)},
        )
    for path in [
        f"/tasks/{task['task_id']}",
        f"/tasks/{task['task_id']}/director-context",
        f"/businesses/{lane.ids['business']}/director-read",
    ]:
        response = await lane.client.get("/operator/v2" + path, headers={"Authorization": "Bearer " + token})
        assert response.status_code == 404 and "Synthetic source QA reply" not in response.text


async def test_context_full_fk_rejects_other_tasks_run(lane, monkeypatch):
    first = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    _, receipt, _ = await record(lane, first["task_id"])
    monkeypatch.setattr(lane.cfg, "director_acquisition_enabled", False)
    second = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    other = (await record(lane, second["task_id"]))[0]
    with pytest.raises(DBAPIError):
        async with scope(user=lane.ids["user"]) as tx:
            await apply_scope(tx, lane.scope, lane.adapter)
            await tx.execute(
                text("SELECT set_config('pinet.director_organization',:o,true)"),
                {"o": lane.ids["organization"]},
            )
            await tx.execute(
                text(
                    "INSERT INTO control_director_contexts(id,task_id,business_id,organization_id,user_id,environment_id,site_id,adapter_id,environment_class,created_at,input_sha256,data) VALUES(:r,:t,:business,:organization,:user,:e,:site,:a,'test',clock_timestamp(),:sha,CAST(:data AS JSONB))"
                ),
                {
                    **lane.ids,
                    "e": lane.scope.environment_id,
                    "site": lane.scope.site_id,
                    "a": lane.adapter,
                    "r": other.run_id,
                    "t": first["task_id"],
                    "sha": receipt.input_sha256,
                    "data": json.dumps(receipt.data),
                },
            )


async def test_mutable_revision_cannot_disguise_an_immutable_context(lane):
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    await mutate(
        lane,
        "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.correspondence.read' WHERE business_id=:business",
    )
    await mutate(
        lane,
        "UPDATE control_task_runs SET adapter_revision='codex-consult.v1' WHERE task_id=:t",
        {"t": task["task_id"]},
    )
    headers = {"Authorization": "Bearer " + lane.token}
    for path in [
        f"/tasks/{task['task_id']}",
        f"/tasks/{task['task_id']}/report",
        f"/tasks/{task['task_id']}/director-context",
        f"/chat/threads/{task['thread_id']}",
        f"/businesses/{lane.ids['business']}/tasks",
    ]:
        reply = await lane.client.get("/operator/v2" + path, headers=headers)
        assert reply.status_code == 403 and "Synthetic source QA reply" not in reply.text


async def test_session_expiry_during_last_purpose_wait_discards_answer(lane, monkeypatch):
    from pinet_core.director import read

    original = read.purposes
    calls = 0

    async def waited(tx, module, receipt):
        nonlocal calls
        calls += 1
        admitted = await original(tx, module, receipt)
        if calls == 2:
            # Last completion authority: Module and Session remain locked, but time advances.
            await asyncio.sleep(2.1)
        return admitted

    monkeypatch.setattr(read, "purposes", waited)
    task = await submit(lane)

    async def fake(context, heartbeat):
        await mutate(
            lane,
            "UPDATE control_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=:session",
        )
        return {"answer": "Synthetic stale last-clock result.", "limitations": []}, {"input_tokens": 12}

    assert await worker.execute_once(fake, kind="chat.consult")
    row, receipt, usage = await record(lane, task["task_id"])
    assert (
        calls == 2
        and row.status == "failed"
        and row.result is None
        and receipt
        and usage == {"input_tokens": 12}
    )


async def test_downgrade_cannot_hide_populated_force_rls_history(lane, monkeypatch):
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    _, receipt, _ = await record(lane, task["task_id"])
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0028_director_read.py"
    spec = importlib.util.spec_from_file_location("director_downgrade_qa", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    owner = "qa_director_owner_" + uuid4().hex
    refused = False
    async with lane.admin.connect() as connection:
        transaction = await connection.begin()
        try:

            def attempt(tx):
                tx.execute(text("CREATE ROLE " + owner + " NOSUPERUSER NOBYPASSRLS"))
                tx.execute(text("GRANT SELECT ON ALL TABLES IN SCHEMA public TO " + owner))
                for table in ["control_director_contexts", "control_task_runs"]:
                    tx.execute(text("ALTER TABLE " + table + " OWNER TO " + owner))
                for function in [
                    "director_pin_reader(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
                    "director_settle_revoked_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR)",
                ]:
                    tx.execute(text("ALTER FUNCTION " + function + " OWNER TO " + owner))
                tx.execute(text("SET LOCAL ROLE " + owner))
                monkeypatch.setattr(
                    migration,
                    "op",
                    SimpleNamespace(get_bind=lambda: tx, execute=lambda sql: tx.execute(text(sql))),
                )
                migration.downgrade()

            try:
                await connection.run_sync(attempt)
            except (RuntimeError, DBAPIError):
                refused = True
        finally:
            # Even the original unsafe DROP witness is never committed or exported.
            await transaction.rollback()
    retained = (await record(lane, task["task_id"]))[1]
    assert retained and retained.input_sha256 == receipt.input_sha256
    assert refused, "Populated FORCE RLS history must refuse downgrade, including when rows are invisible"


async def test_immutable_presence_helper_rejects_foreign_actor_or_environment(lane):
    task = await submit(lane)
    assert await worker.execute_once(fake_answer, kind="chat.consult")
    async with scope(user=lane.ids["user"]) as tx:
        assert await tx.scalar(
            text("SELECT director_context_exists(:t,:u,:e)"),
            {"t": task["task_id"], "u": lane.ids["user"], "e": lane.scope.environment_id},
        )
        for changed in [{"u": str(uuid4())}, {"e": "foreign"}, {"t": str(uuid4())}]:
            assert not await tx.scalar(
                text("SELECT director_context_exists(:t,:u,:e)"),
                {"t": task["task_id"], "u": lane.ids["user"], "e": lane.scope.environment_id, **changed},
            )


async def test_function_security_guard_refuses_invoker_or_public_execution(lane):
    from pinet_core.director.schema import function_security_sql

    signature = "director_context_exists(VARCHAR,VARCHAR,VARCHAR)"
    async with lane.admin.connect() as tx:
        transaction = await tx.begin()
        try:
            assert await tx.scalar(text(function_security_sql()))
            await tx.execute(text("ALTER FUNCTION " + signature + " SECURITY INVOKER"))
            assert not await tx.scalar(text(function_security_sql()))
            await tx.execute(text("ALTER FUNCTION " + signature + " SECURITY DEFINER"))
            await tx.execute(text("GRANT EXECUTE ON FUNCTION " + signature + " TO PUBLIC"))
            assert not await tx.scalar(text(function_security_sql()))
        finally:
            await transaction.rollback()


@pytest.mark.parametrize("deadline", ["session", "capture_module"])
async def test_last_worker_clock_rechecks_held_authority_deadline(lane, monkeypatch, deadline):
    from sqlalchemy.ext.asyncio import AsyncSession

    original_authority = worker.ChatHandler.authority
    original_scalar = AsyncSession.scalar
    calls = 0
    armed = False
    waited = False

    async def authority(self, tx, task):
        nonlocal calls, armed
        result = await original_authority(self, tx, task)
        if task.status == "running":
            calls += 1
            if calls == 2 and result:
                armed = True
        return result

    async def scalar(tx, statement, *args, **kwargs):
        nonlocal armed, waited
        if armed and str(statement) == "SELECT clock_timestamp()":
            armed = False
            waited = True
            await asyncio.sleep(2.1)
        return await original_scalar(tx, statement, *args, **kwargs)

    monkeypatch.setattr(worker.ChatHandler, "authority", authority)
    monkeypatch.setattr(AsyncSession, "scalar", scalar)
    task = await submit(lane)

    async def fake(context, heartbeat):
        sql = (
            "UPDATE control_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=:session"
            if deadline == "session"
            else "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '2 seconds' WHERE business_id=:business"
        )
        await mutate(lane, sql)
        return {"answer": "Synthetic stale worker-clock result.", "limitations": []}, {"input_tokens": 12}

    assert await worker.execute_once(fake, kind="chat.consult")
    row, receipt, usage = await record(lane, task["task_id"])
    assert (
        waited and row.status == "failed" and row.result is None and receipt and usage == {"input_tokens": 12}
    )


async def test_typed_capture_expiring_at_last_worker_clock_rolls_back_mail(lane, monkeypatch):
    from sqlalchemy.ext.asyncio import AsyncSession

    from pinet_core.acquisition.tasks import CaptureHandler, CaptureTaskInput, submit_capture

    lane.cfg.acquisition_tasks_enabled = True
    await mutate(
        lane,
        'UPDATE acquisition_modules SET permissions=permissions || \'["acquisition.work","acquisition.work.read"]\'::jsonb WHERE business_id=:business',
    )
    task = await submit_capture(
        db,
        CaptureTaskInput(
            scope=lane.scope,
            adapter_id=lane.adapter,
            request_id=lane.request_id,
            recipient="owner@example.test",
            campaign=lane.campaign,
            prospect=lane.prospect,
            prepared=lane.prepared,
        ),
    )
    await mutate(
        lane,
        "UPDATE acquisition_modules SET expires_at=clock_timestamp()+interval '5 seconds' WHERE business_id=:business",
    )
    original_authority = CaptureHandler.authority
    original_scalar = AsyncSession.scalar
    calls = 0
    armed = False
    waited = False

    async def authority(self, tx, task):
        nonlocal calls, armed
        valid = await original_authority(self, tx, task)
        if task.status == "running":
            calls += 1
            if calls == 3 and valid:
                armed = True
        return valid

    async def scalar(tx, statement, *args, **kwargs):
        nonlocal armed, waited
        if armed and str(statement) == "SELECT clock_timestamp()":
            armed = False
            waited = True
            await asyncio.sleep(5.1)
        return await original_scalar(tx, statement, *args, **kwargs)

    monkeypatch.setattr(CaptureHandler, "authority", authority)
    monkeypatch.setattr(AsyncSession, "scalar", scalar)
    assert await worker.execute_once(kind="acquisition.reviewed_capture")
    row, receipt, usage = await record(lane, task.id)
    assert (
        waited
        and row.status == "failed"
        and row.result is None
        and receipt is None
        and usage == {"model_calls": 0}
    )
    current = await snapshot(lane)
    assert current["counts"]["outbound_captured"] == 0
