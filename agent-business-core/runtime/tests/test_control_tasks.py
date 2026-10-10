"""PostgreSQL task admission, durable state, RLS and worker fencing; no provider calls."""
import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_control_portfolio import login
from test_control_portfolio import pilot as portfolio_pilot

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session
from pinet_core.control.routes import scope
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskEvent, TaskRun, Thread
from pinet_core.tasks.service import authority

pilot = portfolio_pilot


@pytest.fixture
async def chat(pilot, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "chat_enabled", True)
    monkeypatch.setattr(cfg, "chat_runner_enabled", True)
    monkeypatch.setattr(cfg, "chat_operator_user_id", pilot["receipts"][0]["user_id"])
    headers = await login(pilot)
    try:
        yield {**pilot, "headers": headers, "business": pilot["receipts"][0]["business_ids"][0]}
    finally:
        async with AsyncSession(pilot["admin"]) as tx, tx.begin():
            await tx.execute(delete(Thread).where(Thread.environment_id == cfg.environment))


async def start(chat, message="Kokį vieną paklausos bandymą pasiūlytumėte?", key=None):
    return await chat["client"].post(f"/operator/v2/businesses/{chat['business']}/chat/threads",
           json={"message": message, "idempotency_key": key or str(uuid4())}, headers=chat["headers"])


async def safe_adapter(context, heartbeat):
    assert await heartbeat()
    return {"answer": "Sintetinis regresijos atsakymas.", "limitations": ["Tai testas, ne realus modelis."]}, {"input_tokens": 12}


async def test_durable_worker_history_events_and_usage(chat):
    accepted = await start(chat)
    assert accepted.status_code == 202
    item = accepted.json()["data"]
    assert item["task"]["status"] == "queued"
    assert await worker.execute_once(safe_adapter)
    task_id, thread_id = item["task"]["task_id"], item["thread_id"]
    result = await chat["client"].get(f"/operator/v2/tasks/{task_id}", headers=chat["headers"])
    assert result.status_code == 200 and result.headers["cache-control"] == "private, no-store"
    assert result.json()["data"]["status"] == "succeeded"
    history = await chat["client"].get(f"/operator/v2/chat/threads/{thread_id}", headers=chat["headers"])
    assert history.json()["data"]["tasks"] == [result.json()["data"]]
    events = await chat["client"].get(f"/operator/v2/tasks/{task_id}/events", headers=chat["headers"])
    assert [e["status"] for e in events.json()["data"]["items"]] == ["queued", "running", "succeeded"]
    assert events.json()["data"]["next_sequence"] == 3
    async with scope(user=settings().chat_operator_user_id) as tx:
        run = await tx.scalar(select(TaskRun).where(TaskRun.task_id == task_id))
        assert run.usage == {"input_tokens": 12} and run.cost_microusd is None


async def test_duplicate_concurrent_key_and_changed_payload(chat):
    key = str(uuid4())
    a, b = await asyncio.gather(start(chat, key=key), start(chat, key=key))
    assert a.status_code == b.status_code == 202
    assert a.json()["data"]["task"]["task_id"] == b.json()["data"]["task"]["task_id"]
    assert (await start(chat, message="Kitokia žinutė", key=key)).status_code == 409
    async with scope(user=settings().chat_operator_user_id) as tx:
        assert len(list(await tx.scalars(select(Thread)))) == 1


async def test_two_org_task_thread_and_sql_denial(chat):
    item = (await start(chat)).json()["data"]
    other = await login(chat, 1)
    for path in [f"/tasks/{item['task']['task_id']}", f"/tasks/{item['task']['task_id']}/events",
                 f"/chat/threads/{item['thread_id']}"]:
        assert (await chat["client"].get("/operator/v2" + path, headers=other)).status_code == 404
    assert (await chat["client"].post(f"/operator/v2/tasks/{item['task']['task_id']}/cancel", headers=other)).status_code == 404
    async with scope(user=chat["receipts"][1]["user_id"]) as tx:
        assert list(await tx.scalars(select(Task))) == []
        assert list(await tx.scalars(select(TaskEvent))) == []
    async with scope() as tx:
        assert list(await tx.scalars(select(Task))) == []
    async with scope(user=settings().chat_operator_user_id) as tx:
        info = (await tx.execute(text("SELECT rolbypassrls,rolsuper FROM pg_roles WHERE rolname=current_user"))).one()
        assert info == (False, False)
        assert await tx.scalar(text("SELECT bool_and(relforcerowsecurity AND relrowsecurity) FROM pg_class "
                                    "WHERE relname IN ('control_tasks','control_task_threads','control_task_runs','control_task_events')"))


async def test_cancel_fences_late_result_and_is_idempotent(chat):
    item = (await start(chat)).json()["data"]
    task_id = item["task"]["task_id"]
    async def cancel_during_run(context, heartbeat):
        assert await heartbeat()
        assert (await chat["client"].post(f"/operator/v2/tasks/{task_id}/cancel", headers=chat["headers"])).json()["data"]["status"] == "cancelled"
        assert not await heartbeat()
        return {"answer": "Late synthetic result must never commit", "limitations": []}, None
    assert await worker.execute_once(cancel_during_run)
    result = (await chat["client"].post(f"/operator/v2/tasks/{task_id}/cancel", headers=chat["headers"])).json()["data"]
    assert result["status"] == "cancelled" and result["result"] is None
    events = (await chat["client"].get(f"/operator/v2/tasks/{task_id}/events", headers=chat["headers"])).json()["data"]["items"]
    assert [e["status"] for e in events] == ["queued", "running", "cancelled"]


async def test_session_revoked_before_claim_no_adapter(chat):
    item = (await start(chat)).json()["data"]
    await chat["client"].post("/operator/v2/auth/logout", headers=chat["headers"])
    called = False
    async def forbidden(*_):
        nonlocal called
        called = True
    assert not await worker.execute_once(forbidden) and not called
    fresh = await login(chat)
    result = (await chat["client"].get(f"/operator/v2/tasks/{item['task']['task_id']}", headers=fresh)).json()["data"]
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked"


@pytest.mark.parametrize("model", [BusinessGrant, Membership])
async def test_scope_revocation_hides_history_and_prevents_result(chat, model):
    item = (await start(chat)).json()["data"]
    task_id = item["task"]["task_id"]
    async def revoke(context, heartbeat):
        async with AsyncSession(chat["admin"]) as tx, tx.begin():
            await tx.execute(update(model).where(model.environment_id == settings().environment).values(enabled=False))
        assert not await heartbeat()
        return {"answer": "Revoked result must not persist", "limitations": []}, None
    assert await worker.execute_once(revoke)
    assert (await chat["client"].get(f"/operator/v2/tasks/{task_id}", headers=chat["headers"])).status_code == 404
    async with AsyncSession(chat["admin"]) as tx:
        task = await tx.get(Task, task_id)
        assert task.result is None


async def test_dead_lease_does_not_retry_provider(chat):
    item = (await start(chat)).json()["data"]
    assert await worker.claim()
    async with AsyncSession(chat["admin"]) as tx, tx.begin():
        await tx.execute(update(Task).where(Task.id == item["task"]["task_id"]).values(lease_until=utcnow()-timedelta(seconds=1)))
    assert not await worker.execute_once(safe_adapter)
    result = (await chat["client"].get(f"/operator/v2/tasks/{item['task']['task_id']}", headers=chat["headers"])).json()["data"]
    assert result["status"] == "failed" and result["failure_code"] == "worker_interrupted"


async def test_failure_sanitization_and_thread_admission(chat):
    item = (await start(chat)).json()["data"]
    url = f"/operator/v2/chat/threads/{item['thread_id']}/messages"
    body = {"message": "Kitas klausimas", "idempotency_key": str(uuid4())}
    assert (await chat["client"].post(url, json=body, headers=chat["headers"])).status_code == 409
    async def provider_failure(*_):
        raise RuntimeError("Private raw credential must never be returned")
    assert await worker.execute_once(provider_failure)
    result = (await chat["client"].get(f"/operator/v2/tasks/{item['task']['task_id']}", headers=chat["headers"])).json()["data"]
    assert result["failure_code"] == "provider_error" and "credential" not in str(result)
    assert (await chat["client"].post(url, json=body, headers=chat["headers"])).status_code == 202


async def test_strict_input_default_off_and_daily_limit(chat, monkeypatch):
    assert (await start(chat, message=" ")).status_code == 400
    assert (await start(chat, message=123)).status_code == 400
    assert (await start(chat, key="no-id")).status_code == 400
    monkeypatch.setattr(settings(), "chat_enabled", False)
    assert (await start(chat)).status_code == 403
    monkeypatch.setattr(settings(), "chat_enabled", True)
    monkeypatch.setattr(settings(), "chat_daily_limit", 1)
    assert (await start(chat)).status_code == 202
    assert (await start(chat)).status_code == 429


async def test_origin_session_expiry_before_persist(chat):
    item = (await start(chat)).json()["data"]
    async def expire(context, heartbeat):
        async with AsyncSession(chat["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.user_id == settings().chat_operator_user_id).values(expires_at=utcnow()-timedelta(seconds=1)))
        assert not await heartbeat()
        return {"answer": "Expired result must not persist", "limitations": []}, None
    assert await worker.execute_once(expire)
    fresh = await login(chat)
    result = (await chat["client"].get(f"/operator/v2/tasks/{item['task']['task_id']}", headers=fresh)).json()["data"]
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked" and result["result"] is None


async def test_single_claim_source_change_and_bounded_thread(chat):
    item = (await start(chat)).json()["data"]
    a, b = await asyncio.gather(worker.claim(), worker.claim())
    assert sum(bool(v) for v in (a, b)) == 1
    async with AsyncSession(chat["admin"]) as tx, tx.begin():
        await tx.execute(update(Task).where(Task.id == item["task"]["task_id"]).values(source_revision="e"*40))
    claimed = a or b
    assert not await worker.heartbeat(claimed["task_id"], claimed["run_id"])
    async with AsyncSession(chat["admin"]) as tx, tx.begin():
        await tx.execute(update(Thread).where(Thread.id == item["thread_id"]).values(last_sequence=20))
    response = await chat["client"].post(f"/operator/v2/chat/threads/{item['thread_id']}/messages",
             json={"message": "Virš ribos", "idempotency_key": str(uuid4())}, headers=chat["headers"])
    assert response.status_code == 409 and response.json()["code"] == "thread_full"


async def test_final_authority_session_lock_serializes_revocation(chat):
    item = (await start(chat)).json()["data"]
    async with scope(user=settings().chat_operator_user_id) as tx:
        task = await tx.get(Task, item["task"]["task_id"])
        assert await authority(tx, task)
        async def revoke():
            async with AsyncSession(chat["admin"]) as admin, admin.begin():
                await admin.execute(update(Session).where(Session.id == task.session_id).values(revoked_at=utcnow()))
        pending = asyncio.create_task(revoke())
        await asyncio.sleep(0.05)
        assert not pending.done()  # Actual PostgreSQL row lock, not a mocked race.
    await asyncio.wait_for(pending, 5)
    assert (await chat["client"].get(f"/operator/v2/tasks/{task.id}", headers=chat["headers"])).status_code == 401


async def test_runner_off_during_execution_prevents_result(chat, monkeypatch):
    item = (await start(chat)).json()["data"]
    async def pause(context, heartbeat):
        monkeypatch.setattr(settings(), "chat_runner_enabled", False)
        assert not await heartbeat()
        return {"answer": "Paused result must never persist", "limitations": []}, None
    assert await worker.execute_once(pause)
    result = (await chat["client"].get(f"/operator/v2/tasks/{item['task']['task_id']}", headers=chat["headers"])).json()["data"]
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked" and result["result"] is None
