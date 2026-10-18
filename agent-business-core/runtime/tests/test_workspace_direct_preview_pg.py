"""Dedicated empty PostgreSQL only: real native text/Quality lifecycle, inert transport.

Helper collects only. The integration owner executes after0044 with maintained
legacy Episode/group cohorts. Every record belongs to the fixture's random env.
"""
import json
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_competence import VALUES
from test_customer_public import logged
from test_customer_sol_high import (  # noqa: F401 - maintained full native fixture chain
    configured,
    creation,
    customers,
    high,
    principal,
    profile,
    registration,
    text_customer,
    text_transport,
)
from test_workspace_agent_preparation_pg import setup

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.customer_agents import evaluator, preview
from pinet_core.customer_agents.models import Agent
from pinet_core.customer_profile.models import Admission
from pinet_core.customer_text import adapter
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Event, Job, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError
from pinet_core.tasks.models import Task, TaskRun, Thread
from pinet_core.workspace_team import direct, service
from pinet_core.workspace_team.calibration_budget_schema import ALLOCATION, CALL
from pinet_core.workspace_team.models import Attempt, DirectChat, DirectPreview, TeamEvent
from pinet_core.workspace_topics.models import Topic


@pytest.fixture
async def native_messenger(high, monkeypatch):  # noqa: F811
    c, p, frozen = high
    for key, value in {"workspace_topics_enabled": True, "workspace_team_enabled": True,
        "workspace_team_runner_enabled": True, "workspace_team_actor_ids": [], "chat_daily_limit": 20}.items():
        monkeypatch.setattr(settings(), key, value)
    monkeypatch.setattr(direct, "source_current", lambda: True)
    monkeypatch.setattr(service, "source_current", lambda: True)
    try:
        yield c, p, frozen
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for table in (CALL, ALLOCATION):
                await tx.execute(text(f"DELETE FROM {table} WHERE environment_id=:e"), {"e": c["environment"]})
            for table, trigger in ((DirectPreview, "direct_preview_immutable"), (DirectChat, "direct_binding_immutable")):
                await tx.execute(text(f"ALTER TABLE {table.__tablename__} DISABLE TRIGGER {trigger}"))
                await tx.execute(delete(table).where(table.environment_id == c["environment"]))
                await tx.execute(text(f"ALTER TABLE {table.__tablename__} ENABLE TRIGGER {trigger}"))
            for model in (Topic, Task, Thread, Agent):
                await tx.execute(delete(model).where(model.environment_id == c["environment"]))


def quality_transport(monkeypatch, c, calls, *, fail=False):
    async def execute(argv, **options):
        assert await options["still_authorized"]()
        assert argv[argv.index("--model") + 1] == "gpt-6.1-sol" and 'model_reasoning_effort="high"' in argv
        calls.append(deepcopy(argv))
        if fail:
            raise RunnerError("provider_error", {"input_tokens": 12, "output_tokens": 6})
        wire = json.loads(options["output"].with_name("review.schema.json").read_text())
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            job = await tx.scalar(select(Job).where(Job.environment_id == c["environment"], Job.state == "running",
                Job.payload["direct_preview_version"].astext == preview.QUALITY_VERSION).order_by(Job.created_at.desc()).limit(1))
            client = await tx.scalar(select(Event.id).where(Event.conversation_id == job.conversation_id,
                Event.kind == "client_transcript").order_by(Event.sequence.desc()).limit(1))
        result = {"outcome": "helpful", "issues": [], "evidence_event_ids": [client], "improvement_hint": "",
            "root_cause": "unknown", "suggested_scope": None}
        return ({"quality": result, "scores": VALUES} if "quality" in wire["properties"] else result), {
            "input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(evaluator, "execute", execute)


async def chat(c):
    base = await setup(c) + "/direct"
    response = await c["client"].get(base + "/recipients", headers=c["auth"])
    assert response.status_code == 200, response.text
    contact = next(row for row in response.json()["data"]["items"] if row["recipient"]["kind"] == "saved_agent")
    assert contact["can_create_chat"] and contact["native_state"]["preview_admitted"], contact
    request = {"idempotency_key": str(uuid4()), "mode": "agent_preview", "recipient": contact["recipient"]}
    response = await c["client"].post(base + "/chats", headers=c["auth"], json=request)
    assert response.status_code == 200, response.text
    view = response.json()["data"]
    assert view["can_send"] and view["native_conversation_id"] and view["native_state"]["preview_admitted"]
    return base, view, request


async def send(c, base, view, *, message="Synthetic native direct request", key=None):
    request = {"idempotency_key": key or str(uuid4()), "content": message}
    response = await c["client"].post(base + "/chats/" + view["chat_id"] + "/turns", headers=c["auth"], json=request)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["turn"]["call_limit"] == 3
    return response.json()["data"], request


async def history(c, base, view):
    response = await c["client"].get(base + "/chats/" + view["chat_id"] + "/events", headers=c["auth"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_actual_two_owner_messages_continue_same_native_conversation_and_keep_revision_quality(native_messenger, monkeypatch):
    c, p, frozen = native_messenger
    base, view, create_request = await chat(c)
    text_calls, quality_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    quality_transport(monkeypatch, c, quality_calls)
    first, request = await send(c, base, view)
    assert await worker.execute_once(kind="workspace.direct_turn")
    one = await history(c, base, view)
    assert one["turns"][0]["status"] == "succeeded", one["turns"][0]["failure_code"]
    assert one["turns"][0]["preview"]["quality_current"]
    first_artifact = one["turns"][0]["preview"]["quality_artifact_id"]
    first_sha = one["turns"][0]["preview"]["quality_artifact_sha256"]
    second, _ = await send(c, base, view, message="Synthetic corrected native direct request")
    assert await worker.execute_once(kind="workspace.direct_turn")
    result = await history(c, base, view)
    assert len(text_calls) == len(quality_calls) == 2
    assert [row["status"] for row in result["turns"]] == ["succeeded", "succeeded"]
    assert [row["preview"]["transcript_revision"] for row in result["turns"]] == [1, 2]
    assert [row["preview"]["quality_current"] for row in result["turns"]] == [False, True]
    assert result["turns"][0]["preview"]["quality_artifact_id"] == first_artifact
    assert result["turns"][0]["preview"]["quality_artifact_sha256"] == first_sha
    assert all(row["preview"]["conversation_id"] == view["native_conversation_id"] for row in result["turns"])
    assert [row["author"]["kind"] for row in result["events"]] == ["owner", "saved_agent", "owner", "saved_agent"]
    assert all(row["author"]["configuration_sha256"] == view["recipient"]["configuration_sha256"]
        for row in result["events"] if row["author"]["kind"] == "saved_agent")
    async with AsyncSession(c["admin"]) as tx:
        jobs = list(await tx.scalars(select(Job).where(Job.environment_id == c["environment"],
            Job.payload["direct_preview_version"].astext == preview.QUALITY_VERSION).order_by(Job.created_at)))
        artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == view["native_conversation_id"],
            Artifact.kind == "quality").order_by(Artifact.revision)))
        runs = list(await tx.scalars(select(TaskRun).where(TaskRun.environment_id == c["environment"])))
        assert len(jobs) == len(artifacts) == len(runs) == 2 and [row.revision for row in artifacts] == [1, 2]
        assert all(run.usage == {"input_tokens": 21, "output_tokens": 11} for run in runs)
        assert not list(await tx.scalars(select(Attempt).where(Attempt.environment_id == c["environment"])))
        assert len(list(await tx.scalars(select(Agent).where(Agent.environment_id == c["environment"])))) == 1
        assert len(list(await tx.scalars(select(DirectPreview).where(DirectPreview.environment_id == c["environment"])))) == 1
    # Ordinary immutable-script evidence remains separate from incremental DM history.
    runs_url = "/customer/v2/creations/" + c["request"]["creation_id"] + "/agents/" + c["agent"]["agent"]["agent_id"] + "/test-runs"
    old_evidence = await c["client"].get(runs_url, headers=c["auth"])
    assert old_evidence.status_code == 200 and old_evidence.json()["data"]["items"] == []
    replay = await c["client"].post(base + "/chats/" + view["chat_id"] + "/turns", headers=c["auth"], json=request)
    assert replay.status_code == 200 and replay.json()["data"]["turn"]["task_id"] == first["turn"]["task_id"]
    assert len(text_calls) == len(quality_calls) == 2 and second["turn"]["task_id"] != first["turn"]["task_id"]


async def test_actual_queued_native_cancel_releases_three_call_hold_and_create_replay_is_metadata_only(native_messenger):
    c, _, _ = native_messenger
    base, view, create_request = await chat(c)
    replay = await c["client"].post(base + "/chats", headers=c["auth"], json=create_request)
    assert replay.status_code == 200 and replay.json()["data"]["native_conversation_id"] == view["native_conversation_id"]
    settings().chat_daily_limit = 3
    first, _ = await send(c, base, view)
    blocked = await c["client"].post(base + "/chats/" + view["chat_id"] + "/turns", headers=c["auth"],
        json={"idempotency_key": str(uuid4()), "content": "Must share the original allowance"})
    assert blocked.status_code == 429, blocked.text
    url = base + "/chats/" + view["chat_id"] + "/turns/" + first["turn"]["task_id"] + "/cancel"
    cancelled = await c["client"].post(url, headers=c["auth"], json={})
    assert cancelled.status_code == 200 and cancelled.json()["data"]["status"] == "cancelled"
    second, _ = await send(c, base, view)
    assert second["turn"]["sequence"] == 2
    async with AsyncSession(c["admin"]) as tx:
        assert not list(await tx.scalars(select(TaskRun).where(TaskRun.environment_id == c["environment"])))
        assert (await tx.execute(text(f"SELECT count(*) FROM {CALL} WHERE environment_id=:e"), {"e": c["environment"]})).scalar_one() == 0


async def test_actual_native_cancel_after_text_reservation_keeps_usage_without_public_saved_reply(native_messenger, monkeypatch):
    c, _, _ = native_messenger
    base, view, _ = await chat(c)
    text_calls = []
    text_transport(monkeypatch, c, text_calls)
    original = adapter.execute
    accepted, _ = await send(c, base, view)
    task_id = accepted["turn"]["task_id"]
    async def late(argv, **options):
        value = await original(argv, **options)
        response = await c["client"].post(base + "/chats/" + view["chat_id"] + "/turns/" + task_id + "/cancel",
            headers=c["auth"], json={})
        assert response.status_code == 200, response.text
        return value
    monkeypatch.setattr(adapter, "execute", late)
    assert await worker.execute_once(kind="workspace.direct_turn")
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, task_id)
        run = await tx.get(TaskRun, task.run_id)
        events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task_id)))
        assert task.status == "cancelled" and task.result is None and len(events) == 1 and len(text_calls) == 1
        assert run.usage == {"input_tokens": 9, "output_tokens": 5}


async def test_actual_grant_revoke_after_native_text_reservation_retains_hidden_run_charge(native_messenger, monkeypatch):
    c, _, _ = native_messenger
    base, view, _ = await chat(c)
    text_calls, quality_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    quality_transport(monkeypatch, c, quality_calls)
    original = adapter.execute
    accepted, _ = await send(c, base, view)
    async def late(argv, **options):
        result = await original(argv, **options)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"],
                BusinessGrant.environment_id == c["environment"]).values(enabled=False))
        return result
    monkeypatch.setattr(adapter, "execute", late)
    assert await worker.execute_once(kind="workspace.direct_turn")
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        run = await tx.get(TaskRun, task.run_id)
        assert task.status == run.status == "failed" and task.result is None
        assert run.usage == {"input_tokens": 9, "output_tokens": 5}
        assert len(list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task.id)))) == 1
    denied = await c["client"].get(base + "/chats/" + view["chat_id"] + "/events", headers=c["auth"])
    assert denied.status_code == 404 and len(text_calls) == 1 and quality_calls == []


async def test_actual_quality_failure_retains_both_native_charges_and_no_fabricated_success(native_messenger, monkeypatch):
    c, _, _ = native_messenger
    base, view, _ = await chat(c)
    texts, qualities = [], []
    text_transport(monkeypatch, c, texts)
    quality_transport(monkeypatch, c, qualities, fail=True)
    accepted, _ = await send(c, base, view)
    assert await worker.execute_once(kind="workspace.direct_turn")
    result = await history(c, base, view)
    assert result["turns"][0]["status"] == "failed" and result["turns"][0]["preview"]["quality_state"] == "failed"
    assert not result["turns"][0]["preview"]["quality_current"] and len(result["events"]) == 1
    assert len(texts) == len(qualities) == 1
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        assert (await tx.get(TaskRun, task.run_id)).usage == {"input_tokens": 21, "output_tokens": 11}
        assert not list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == view["native_conversation_id"], Artifact.kind == "quality")))


async def test_actual_revoked_profile_stops_queued_native_task_before_any_call(native_messenger):
    c, _, frozen = native_messenger
    base, view, _ = await chat(c)
    accepted, _ = await send(c, base, view)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Admission).where(Admission.id == frozen["admission_id"]).values(revoked_at=utcnow()))
    await worker.execute_once(kind="workspace.direct_turn")
    result = await history(c, base, view)
    assert not result["chat"]["can_send"] and "configuration_changed" in result["chat"]["blockers"]
    assert result["turns"][0]["status"] == "failed" and result["turns"][0]["usage"]["reserved_calls"] == 0


async def test_actual_new_login_continues_same_immutable_native_binding_with_current_task_session(native_messenger, monkeypatch):
    c, _, frozen = native_messenger
    base, view, _ = await chat(c)
    old_binding_session = frozen["session_id"]
    assert (await c["client"].post("/operator/v2/auth/logout", headers=c["auth"])).status_code == 204
    c["auth"] = await logged(c, c["account"])
    text_calls, quality_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    quality_transport(monkeypatch, c, quality_calls)
    accepted, _ = await send(c, base, view)
    assert await worker.execute_once(kind="workspace.direct_turn")
    result = await history(c, base, view)
    assert result["turns"][0]["status"] == "succeeded", result["turns"][0]["failure_code"]
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        binding = await tx.get(DirectPreview, view["chat_id"])
        conversation = await tx.get(Conversation, view["native_conversation_id"])
        assert task.session_id != old_binding_session and binding.snapshot["session_id"] == old_binding_session
        assert conversation.payload["customer_text_binding"]["session_id"] == old_binding_session
    assert len(text_calls) == len(quality_calls) == 1
