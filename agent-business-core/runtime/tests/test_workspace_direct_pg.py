"""Dedicated empty migrated QA DB only; ordinary HTTP/RLS, injected provider0.

The helper collects this file only. The integration owner runs it, never against
the retained private customer case. Cleanup is restricted to the random test env.
"""
import hashlib
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership
from pinet_core.control.routes import scope
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskEvent, TaskRun, Thread
from pinet_core.workspace_team import adapter, direct
from pinet_core.workspace_team.models import Attempt, DirectChat, TeamEvent
from pinet_core.workspace_topics.models import Topic


@pytest.fixture
async def messenger(customers, monkeypatch, tmp_path):  # noqa: F811
    cfg = settings()
    for key, value in {"workspace_topics_enabled": True, "workspace_team_enabled": True,
        "workspace_team_runner_enabled": True, "chat_daily_limit": 20, "workspace_team_actor_ids": [],
        "chat_codex_executable": sys.executable, "chat_workspace": str(tmp_path), "chat_runner_seconds": 30,
        "chat_codex_sha256": hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest()}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(direct, "source_current", lambda: True)
    monkeypatch.setattr(adapter, "source_current", lambda: True)
    try:
        yield customers
    finally:
        async with AsyncSession(customers["admin"]) as tx, tx.begin():
            # Explicit test-only migration owner cleanup in a dedicated QA DB.
            # The application role never receives UPDATE/DELETE on this mapping.
            await tx.execute(text("ALTER TABLE control_workspace_direct_chats DISABLE TRIGGER direct_binding_immutable"))
            await tx.execute(delete(DirectChat).where(DirectChat.environment_id == customers["environment"]))
            await tx.execute(text("ALTER TABLE control_workspace_direct_chats ENABLE TRIGGER direct_binding_immutable"))
            await tx.execute(delete(Topic).where(Topic.environment_id == customers["environment"]))
            await tx.execute(delete(Task).where(Task.environment_id == customers["environment"]))
            await tx.execute(delete(Thread).where(Thread.environment_id == customers["environment"]))


async def setup(c):
    _, auth, me = await verified(c)
    settings().workspace_team_actor_ids = [me["user_id"]]
    pid = me["portfolios"][0]["portfolio_id"]
    root = f"/customer/v2/portfolios/{pid}/workspace-topics"
    response = await c["client"].post(root, headers=auth, json={"idempotency_key": str(uuid4()),
        "title": "Sintetinis asmeninių pokalbių kontekstas", "anchor": {"kind": "portfolio", "selection_id": pid}})
    assert response.status_code == 200, response.text
    parent = response.json()["data"]["current_topic"]["topic_id"]
    return auth, me, root + "/" + parent + "/direct", root


async def create(c, auth, base, role="adviser"):
    contacts = await c["client"].get(base + "/recipients", headers=auth)
    assert contacts.status_code == 200, contacts.text
    contact = next(item for item in contacts.json()["data"]["items"] if item["recipient"].get("role") == role)
    assert contact["can_create_chat"] and contact["execution_scope"]["kind"] == "workspace"
    request = {"idempotency_key": str(uuid4()), "mode": "consultant", "recipient": contact["recipient"]}
    response = await c["client"].post(base + "/chats", headers=auth, json=request)
    assert response.status_code == 200, response.text
    return response.json()["data"], request


async def send(c, auth, base, chat, *, key=None, content="Sintetinis klausimas.", reply=None):
    request = {"idempotency_key": key or str(uuid4()), "content": content, "reply_to_event_id": reply}
    response = await c["client"].post(base + "/chats/" + chat["chat_id"] + "/turns", headers=auth, json=request)
    assert response.status_code == 200, response.text
    return response.json()["data"], request


async def test_actual_workspace_dm_needs_no_fake_business_and_keeps_child_out_of_all_group_routes(messenger):
    c = messenger
    auth, me, base, topics = await setup(c)
    chat, body = await create(c, auth, base)
    replay = await c["client"].post(base + "/chats", headers=auth, json=body)
    assert replay.status_code == 200 and replay.json()["data"]["chat_id"] == chat["chat_id"]
    assert chat["can_send"] and chat["native_conversation_id"] is None and chat["native_state"] is None
    async with AsyncSession(c["admin"]) as tx:
        mapping = await tx.get(DirectChat, chat["chat_id"])
        assert mapping.business_id is None and mapping.grant_id is None
        assert await tx.scalar(select(func.count()).select_from(BusinessGrant).where(BusinessGrant.environment_id == c["environment"])) == 0
    listed = await c["client"].get(topics, headers=auth)
    assert listed.status_code == 200, listed.text
    assert mapping.child_topic_id not in str(listed.json()) and chat["parent_topic_id"] in str(listed.json())
    for suffix in ("", "/messages", "/team/roster", "/team/events", "/team/directory"):
        response = await c["client"].get(topics + "/" + mapping.child_topic_id + suffix, headers=auth)
        assert response.status_code == 404, response.text
    # Privacy remains enforced after execution is disabled.
    settings().workspace_team_enabled = False
    response = await c["client"].get(topics, headers=auth)
    assert response.status_code == 200 and mapping.child_topic_id not in str(response.json())


async def test_actual_one_call_chosen_role_history_restart_replay_and_separate_chat(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base, "adviser")
    other, _ = await create(c, auth, base, "coordinator")
    first, body = await send(c, auth, base, chat)
    calls = []
    async def answer(role, packet, heartbeat):
        assert role == "direct_adviser" and await heartbeat()
        assert packet["subject"]["registered"] is False and packet["other_chats"] == "excluded"
        calls.append(packet)
        return {"answer": "Sintetinė konsultanto išvada.", "limitations": []}, {"input_tokens": 5, "output_tokens": 7}
    assert await worker.execute_once(answer, kind="workspace.direct_turn")
    result = await c["client"].get(base + "/chats/" + chat["chat_id"] + "/events", headers=auth)
    assert result.status_code == 200, result.text
    history = result.json()["data"]
    turn = history["turns"][0]
    assert turn["status"] == "succeeded" and not turn["can_cancel"] and turn["call_limit"] == 1
    assert turn["usage"] == {"reserved_calls": 1, "settled_calls": 1, "usage_complete": True,
        "input_tokens": 5, "output_tokens": 7, "cost_status": "UNVERIFIED"}
    assert [event["author"]["kind"] for event in history["events"]] == ["owner", "consultant"]
    assert history["events"][1]["author"]["participant_id"] == chat["recipient"]["participant_id"]
    assert history["events"][1]["author"]["role"] == "adviser"
    replay = await c["client"].post(base + "/chats/" + chat["chat_id"] + "/turns", headers=auth, json=body)
    assert replay.status_code == 200 and replay.json()["data"]["turn"]["task_id"] == first["turn"]["task_id"]
    _, _ = await send(c, auth, base, chat, content="Sintetinis tęsinys.", reply=history["events"][1]["event_id"])
    assert await worker.execute_once(answer, kind="workspace.direct_turn")
    assert len(calls) == 2 and len(calls[1]["history"]) == 2
    empty = await c["client"].get(base + "/chats/" + other["chat_id"] + "/events", headers=auth)
    assert empty.status_code == 200 and empty.json()["data"]["events"] == []
    async with AsyncSession(c["admin"]) as tx:
        tasks = list(await tx.scalars(select(Task).where(Task.environment_id == c["environment"])))
        assert len(tasks) == 2 and all(task.business_id is None for task in tasks)
        runs = list(await tx.scalars(select(TaskRun).where(TaskRun.environment_id == c["environment"])))
        assert len(runs) == 2 and all(run.usage == {"input_tokens": 5, "output_tokens": 7} for run in runs)
        assert all(run.adapter_revision == "codex-workspace-direct.v1" for run in runs)


async def test_actual_dm_global_quota_replay_cross_chat_reply_and_cancel(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base)
    other, _ = await create(c, auth, base)
    settings().chat_daily_limit = 1
    first, body = await send(c, auth, base, chat)
    replay = await c["client"].post(base + "/chats/" + chat["chat_id"] + "/turns", headers=auth, json=body)
    assert replay.status_code == 200
    blocked = await c["client"].post(base + "/chats/" + other["chat_id"] + "/turns", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Kitas klausimas."})
    assert blocked.status_code == 429, blocked.text
    cancel_url = base + "/chats/" + chat["chat_id"] + "/turns/" + first["turn"]["task_id"] + "/cancel"
    cancelled = await c["client"].post(cancel_url, headers=auth, json={})
    assert cancelled.status_code == 200 and cancelled.json()["data"]["status"] == "cancelled"
    assert (await c["client"].post(cancel_url, headers=auth, json={})).json()["data"]["status"] == "cancelled"
    foreign_reply = await c["client"].post(base + "/chats/" + other["chat_id"] + "/turns", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Kitas klausimas.", "reply_to_event_id": first["event"]["event_id"]})
    assert foreign_reply.status_code == 404, foreign_reply.text
    conflict = await c["client"].post(base + "/chats/" + other["chat_id"] + "/turns", headers=auth, json=body)
    assert conflict.status_code == 409


async def test_actual_restricted_null_scope_cannot_be_used_by_legacy_or_foreign_task(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base)
    accepted, _ = await send(c, auth, base, chat)
    async with scope(user=me["user_id"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        original = task.thread_id
    for change in ({"kind": "chat.consult"}, {"kind": "workspace.team_turn"}, {"thread_id": str(uuid4())}):
        # Either the typed CHECK/fence or the current RLS WITH CHECK may reject
        # first. Both are valid denials; connection/unknown SQL failures are not.
        with pytest.raises(DBAPIError) as denied:
            async with scope(user=me["user_id"]) as tx:
                await tx.execute(update(Task).where(Task.id == accepted["turn"]["task_id"]).values(**change))
                await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
        assert getattr(denied.value.orig, "sqlstate", None) in {"23514", "42501"}
    async with scope(user=me["user_id"]) as tx:
        assert (await tx.get(Task, accepted["turn"]["task_id"])).thread_id == original


async def test_actual_owner_revoked_after_call_retains_usage_and_never_publishes_output(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base)
    accepted, _ = await send(c, auth, base, chat)
    async def answer(role, packet, heartbeat):
        assert await heartbeat()
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.environment_id == c["environment"],
                Membership.user_id == me["user_id"]).values(enabled=False))
        return {"answer": "Ši sintetinė išvada neturi būti publikuota.", "limitations": []}, {"input_tokens": 13, "output_tokens": 17}
    assert await worker.execute_once(answer, kind="workspace.direct_turn")
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        run = await tx.get(TaskRun, task.run_id)
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
        events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task.id)))
        assert task.status == "failed" and task.result is None and run.usage == {"input_tokens": 13, "output_tokens": 17}
        assert len(attempts) == 1 and attempts[0].usage == run.usage and len(events) == 1
    denied = await c["client"].get(base + "/chats/" + chat["chat_id"] + "/events", headers=auth)
    assert denied.status_code in {403, 404}


async def test_actual_boundary_classifier_exposes_no_foreign_task_or_workspace_scope(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base)
    accepted, _ = await send(c, auth, base, chat)
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        material = {key: getattr(task, key) for key in ("id", "business_id", "user_id", "organization_id", "environment_id")}
    _, _, foreign = await verified(c)
    async with scope(user=foreign["user_id"]) as tx:
        assert await tx.scalar(text("SELECT workspace_direct_task_boundary('control_tasks',CAST(:j AS JSONB))"),
            {"j": json.dumps(material)}) is None
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(text("SELECT workspace_direct_task_boundary('control_tasks',CAST(:j AS JSONB))"),
            {"j": json.dumps(material)}) == "direct"
        assert await tx.scalar(text("SELECT workspace_direct_task_boundary('control_tasks',CAST(:j AS JSONB))"),
            {"j": json.dumps(material | {"environment_id": "test-foreign"})}) is None


async def test_actual_claim_fences_each_task_row_type_without_any_provider_dispatch(messenger):
    c = messenger
    auth, me, base, _ = await setup(c)
    chat, _ = await create(c, auth, base)
    accepted, _ = await send(c, auth, base, chat)
    claimed = await worker.claim(kind="workspace.direct_turn")
    assert claimed and claimed["task_id"] == accepted["turn"]["task_id"]
    async with scope(user=me["user_id"]) as tx:
        # A real scoped UPDATE fires the same generic deferred trigger for the
        # TaskRun row type. It writes no invented usage and invokes no provider.
        await tx.execute(update(TaskRun).where(TaskRun.id == claimed["run_id"]).values(status=TaskRun.status))
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, claimed["task_id"])
        thread = await tx.get(Thread, task.thread_id)
        run = await tx.get(TaskRun, claimed["run_id"])
        events = list(await tx.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id).order_by(TaskEvent.sequence)))
        assert thread.business_id is None and thread.last_sequence == 1
        assert task.status == run.status == "running" and task.business_id is None and run.business_id is None
        assert [row.status for row in events] == ["queued", "running"] and all(row.business_id is None for row in events)
        assert run.usage is None and not list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
    cancelled = await c["client"].post(base + "/chats/" + chat["chat_id"] + "/turns/" + task.id + "/cancel",
        headers=auth, json={})
    assert cancelled.status_code == 200, cancelled.text
    async with scope(user=me["user_id"]) as tx:
        current = await tx.get(Task, task.id)
        await worker.finish_run(tx, current, "cancelled")
