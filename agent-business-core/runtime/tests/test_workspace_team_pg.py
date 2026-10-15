"""Ordinary HTTP/restricted PostgreSQL and injected provider-zero worker regression."""
import asyncio
import hashlib
import sys
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401
from test_workspace_topics_pg import native_business

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session
from pinet_core.control.routes import scope, token_hash
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun, Thread
from pinet_core.workspace_team import service
from pinet_core.workspace_team.handler import reserve, settle
from pinet_core.workspace_team.models import Attempt, TeamEvent, TeamTurn
from pinet_core.workspace_team.policy import KIND
from pinet_core.workspace_team.wire import Send
from pinet_core.workspace_topics.models import Message, Topic


@pytest.fixture
async def team(customers, monkeypatch, tmp_path):  # noqa: F811 - imported maintained fixture
    cfg = settings()
    for key, value in {"workspace_topics_enabled": True, "workspace_team_enabled": True,
        "workspace_team_runner_enabled": True, "chat_daily_limit": 20, "workspace_team_actor_ids": [],
        "chat_codex_executable": sys.executable, "chat_workspace": str(tmp_path), "chat_runner_seconds": 30,
        "chat_codex_sha256": hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest()}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(service, "source_current", lambda: True)
    customers["topics_business_ids"] = []
    try:
        yield customers
    finally:
        # Only this fixture's random environment; retained preview/history is never touched.
        async with AsyncSession(customers["admin"]) as tx, tx.begin():
            await tx.execute(delete(Topic).where(Topic.environment_id == customers["environment"]))
            await tx.execute(delete(Task).where(Task.environment_id == customers["environment"]))
            await tx.execute(delete(Thread).where(Thread.environment_id == customers["environment"]))
            await tx.execute(delete(BusinessGrant).where(BusinessGrant.environment_id == customers["environment"]))


async def setup(c):
    _, auth, me = await verified(c)
    settings().workspace_team_actor_ids = [me["user_id"]]
    business_id, grant_id = await native_business(c, me)
    pid = me["portfolios"][0]["portfolio_id"]
    base = f"/customer/v2/portfolios/{pid}/workspace-topics"
    created = await c["client"].post(base, headers=auth, json={"idempotency_key": str(uuid4()),
        "title": "Sintetinė komandos tema", "anchor": {"kind": "business", "selection_id": business_id}})
    assert created.status_code == 200, created.text
    topic_id = created.json()["data"]["current_topic"]["topic_id"]
    return auth, me, base+"/"+topic_id, business_id, grant_id


async def send(c, auth, base, *, content="Aptarkite šį sintetinį verslo klausimą.", key=None, reply=None):
    body = {"idempotency_key": key or str(uuid4()), "content": content, "reply_to_event_id": reply}
    response = await c["client"].post(base+"/team/turns", headers=auth, json=body)
    assert response.status_code == 200, response.text
    return response.json()["data"], body


async def page(c, auth, base):
    response = await c["client"].get(base+"/team/events", headers=auth)
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def delegated(phase, packet, heartbeat):
    assert await heartbeat()
    assert "old_notes" in packet if phase != "adviser" else "history" not in packet
    answer = {"answer": "Sintetinė įrankių nenaudojanti išvada.", "limitations": ["Tai testiniai duomenys."]}
    return (answer | {"decision": "delegate", "assignment": "Įvertinkite pateiktą sintetinį klausimą."} if phase == "plan" else answer), {"input_tokens": 5, "output_tokens": 7}


async def test_actual_customer_turn_has_trusted_same_chat_roles_and_exact_replay(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    roster = await c["client"].get(base+"/team/roster", headers=auth)
    assert roster.status_code == 200, roster.text
    assert roster.json()["data"]["can_send"] is True
    accepted, body = await send(c, auth, base)
    replay = await c["client"].post(base+"/team/turns", headers=auth, json=body)
    assert replay.status_code == 200 and replay.json()["data"] == accepted
    assert await worker.execute_once(adapter=delegated, kind=KIND)
    result = await page(c, auth, base)
    assert [e["author_type"] for e in result["events"]] == ["user", "coordinator", "adviser", "coordinator"]
    assert [e["sequence"] for e in result["events"]] == [1, 2, 3, 4]
    turn = result["turns"][0]
    assert turn["status"] == "succeeded" and turn["reserved_calls"] == turn["settled_calls"] == 3
    assert turn["usage_complete"] is True and turn["cost_status"] == "UNVERIFIED"
    assert not await worker.execute_once(adapter=delegated, kind=KIND)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.scalar(select(TaskRun).where(TaskRun.task_id == turn["task_id"]))).usage == {"input_tokens": 15, "output_tokens": 21}
        assert list(await tx.scalars(select(Message).where(Message.environment_id == c["environment"]))) == []


async def test_saved_s1_notes_and_unsupported_anchors_never_auto_dispatch(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    saved = await c["client"].post(base+"/messages", headers=auth, json={"idempotency_key": str(uuid4()), "content": "Privati senoji pastaba."})
    assert saved.status_code == 200 and saved.json()["data"]["message"]["dispatch_state"] == "stored_without_dispatch"
    assert not await worker.execute_once(adapter=delegated, kind=KIND)
    assert (await page(c, auth, base))["events"] == []
    pid = me["portfolios"][0]["portfolio_id"]
    response = await c["client"].post(f"/customer/v2/portfolios/{pid}/workspace-topics", headers=auth,
        json={"idempotency_key": str(uuid4()), "title": "Privati bendroji tema", "anchor": {"kind": "portfolio", "selection_id": pid}})
    id = response.json()["data"]["current_topic"]["topic_id"]
    unsupported = f"/customer/v2/portfolios/{pid}/workspace-topics/{id}"
    read = await c["client"].get(unsupported+"/team/roster", headers=auth)
    assert read.status_code == 200 and "business_anchor_required" in read.json()["data"]["blockers"]
    refused = await c["client"].post(unsupported+"/team/turns", headers=auth, json={"idempotency_key": str(uuid4()), "content": "Klausimas", "reply_to_event_id": None})
    assert refused.status_code == 403


async def test_queued_followup_context_includes_late_prior_results_excludes_later_owner(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    first, _ = await send(c, auth, base, content="Pirmas klausimas.")
    second, _ = await send(c, auth, base, content="Antras patikslinimas.")
    third, _ = await send(c, auth, base, content="Trečias vėlesnis klausimas.")
    packets = []

    async def direct(phase, packet, heartbeat):
        packets.append(packet)
        return {"answer": "Sintetinis tiesioginis atsakymas.", "limitations": [], "decision": "answer", "assignment": None}, {"input_tokens": 3}

    assert await worker.execute_once(adapter=direct, kind=KIND)
    assert await worker.execute_once(adapter=direct, kind=KIND)
    history = packets[1]["history"]
    assert [item["event"]["author_type"] for item in history] == ["user", "coordinator"]
    assert all(item["event"]["task_id"] == first["turn"]["task_id"] for item in history)
    assert packets[1]["message"] == "Antras patikslinimas."
    assert "Trečias vėlesnis klausimas." not in str(packets[1])
    async with AsyncSession(c["admin"]) as tx:
        turn = await tx.get(TeamTurn, second["turn"]["task_id"])
        assert turn.context_cutoff >= 4 and turn.context["omitted_history_events"] == 0
        assert (await tx.get(Task, third["turn"]["task_id"])).status == "queued"


async def test_shared_quota_counts_queued_commitments_for_legacy_chat_and_team(team, monkeypatch):
    c = team
    auth, me, base, business, _ = await setup(c)
    cfg = settings()
    monkeypatch.setattr(cfg, "chat_daily_limit", 6)
    monkeypatch.setattr(cfg, "chat_enabled", True)
    monkeypatch.setattr(cfg, "chat_operator_user_id", me["user_id"])
    first, _ = await send(c, auth, base)
    await send(c, auth, base)
    blocked = await c["client"].post(f"/operator/v2/businesses/{business}/chat/threads", headers=auth,
        json={"idempotency_key": str(uuid4()), "message": "Sena konsultacija."})
    assert blocked.status_code == 429, blocked.text
    cancelled = await c["client"].post(base+"/team/turns/"+first["turn"]["task_id"]+"/cancel", headers=auth, json={})
    assert cancelled.status_code == 200 and cancelled.json()["data"]["status"] == "cancelled"
    admitted = await c["client"].post(f"/operator/v2/businesses/{business}/chat/threads", headers=auth,
        json={"idempotency_key": str(uuid4()), "message": "Sena konsultacija."})
    assert admitted.status_code == 202, admitted.text


async def test_grant_loss_retains_actual_per_call_and_root_accounting_without_late_public_reply(team):
    c = team
    auth, me, base, _, grant = await setup(c)
    accepted, _ = await send(c, auth, base)

    async def revoke(phase, packet, heartbeat):
        value, usage = await delegated(phase, packet, heartbeat)
        if phase == "adviser":
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(BusinessGrant).where(BusinessGrant.id == grant).values(enabled=False))
        return value, usage

    assert await worker.execute_once(adapter=revoke, kind=KIND)
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        assert task.status == "failed" and task.failure_code == "authorization_revoked"
        run = await tx.get(TaskRun, task.run_id)
        assert run.usage == {"input_tokens": 10, "output_tokens": 14}
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
        assert len(attempts) == 2 and all(a.state == "succeeded" and a.usage is not None for a in attempts)
        events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task.id).order_by(TeamEvent.sequence)))
        assert [e.author_type for e in events] == ["user", "coordinator"]
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(text("SELECT workspace_team_daily_reserved(:u,:e)"), {"u": me["user_id"], "e": c["environment"]}) == 2


async def test_authoritative_stop_keeps_valid_assignment_and_disallows_paid_repeat(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    accepted, _ = await send(c, auth, base)
    called = []

    async def stop(phase, packet, heartbeat):
        called.append(phase)
        if phase == "adviser":
            response = await c["client"].post(base+"/team/turns/"+accepted["turn"]["task_id"]+"/cancel", headers=auth, json={})
            assert response.status_code == 200
            async with scope(user=me["user_id"]) as tx:
                assert await tx.scalar(text("SELECT workspace_team_actor_busy(:u,:e)"), {"u": me["user_id"], "e": c["environment"]}) is True
            return {"answer": "Vėlyvas atmestas atsakymas.", "limitations": []}, {"input_tokens": 4}
        return await delegated(phase, packet, heartbeat)

    assert await worker.execute_once(adapter=stop, kind=KIND)
    history = await page(c, auth, base)
    assert called == ["plan", "adviser"]
    assert [e["author_type"] for e in history["events"]] == ["user", "coordinator"]
    assert history["turns"][0]["status"] == "cancelled"
    assert not await worker.execute_once(adapter=stop, kind=KIND)


async def test_concurrent_exact_key_replay_and_cross_topic_or_legacy_reuse_are_refused(team, monkeypatch):
    c = team
    auth, me, base, business, _ = await setup(c)
    key = str(uuid4())
    values = await asyncio.gather(send(c, auth, base, key=key), send(c, auth, base, key=key))
    assert values[0][0] == values[1][0]
    assert len((await page(c, auth, base))["turns"]) == 1
    wrong = await c["client"].post(base+"/team/turns", headers=auth, json=values[0][1] | {"content": "Pakeistas klausimas."})
    assert wrong.status_code == 409
    monkeypatch.setattr(settings(), "chat_enabled", True)
    monkeypatch.setattr(settings(), "chat_operator_user_id", me["user_id"])
    legacy = await c["client"].post(f"/operator/v2/businesses/{business}/chat/threads", headers=auth,
        json={"idempotency_key": key, "message": "Kitas pavedimas."})
    assert legacy.status_code == 409
    _, foreign, _ = await verified(c)
    assert (await c["client"].get(base+"/team/events", headers=foreign)).status_code == 404
    assert (await c["client"].post(base+"/team/turns", headers=auth, json=values[0][1] | {"author_type": "coordinator"})).status_code == 400


async def test_commit_time_owner_revocation_rolls_back_turn_and_event_without_dispatch(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    pid, topic_id = base.split("/")[-3], base.split("/")[-1]
    key = str(uuid4())
    with pytest.raises(IntegrityError):
        async with scope(user=me["user_id"]) as tx:
            session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
            await service.send(tx, session, pid, topic_id, Send(idempotency_key=key, content="Pozityvaus atsakymo dar negalima laikyti commit."))
            async with AsyncSession(c["admin"]) as admin, admin.begin():
                await admin.execute(update(Membership).where(Membership.user_id == me["user_id"], Membership.environment_id == c["environment"]).values(enabled=False))
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(Task.id).where(Task.idempotency_key == key)) is None
        assert list(await tx.scalars(select(TeamEvent).where(TeamEvent.environment_id == c["environment"]))) == []


async def test_nullable_context_and_settlement_cannot_forge_complete_pin_or_call(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    accepted, _ = await send(c, auth, base)
    id = accepted["turn"]["task_id"]
    with pytest.raises(IntegrityError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(TeamTurn).where(TeamTurn.id == id).values(context={"fake": True}, context_sha256=None, context_cutoff=None))
    claimed = await worker.claim(kind=KIND)
    context = claimed["context"]
    receipt = await reserve(context, "plan", {key: value for key, value in context.items() if not key.startswith("_")})
    with pytest.raises(IntegrityError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(Attempt).where(Attempt.id == receipt["id"]).values(state="succeeded", finished_at=None))
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Attempt, receipt["id"])).state == "reserved"


async def test_phase_author_fk_and_deferred_guard_reject_wrong_role_for_settled_plan(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    accepted, _ = await send(c, auth, base)
    claimed = await worker.claim(kind=KIND)
    context = claimed["context"]
    receipt = await reserve(context, "plan", {key: value for key, value in context.items() if not key.startswith("_")})
    await settle(receipt, "succeeded", {"input_tokens": 1})
    with pytest.raises(IntegrityError):
        async with scope(user=me["user_id"]) as tx:
            task = await tx.get(Task, accepted["turn"]["task_id"])
            row, thread, turn = await service.task_scope(tx, task)
            thread = await service.team_thread(tx, row, lock=True)
            # Same scope/member/FK, but a planner attempt cannot impersonate the adviser.
            await service.add_event(tx, row, thread, task.id, "adviser", "answer", "Suklastotas specialisto atsakymas.", reply=turn.owner_event_id, attempt=receipt["id"])
    assert [e["author_type"] for e in (await page(c, auth, base))["events"]] == ["user"]


async def test_hidden_running_task_still_holds_shared_actor_slot_and_remaining_budget(team):
    c = team
    auth, me, base, _, grant = await setup(c)
    first, _ = await send(c, auth, base)
    first_claim = await worker.claim(kind=KIND)
    business, _ = await native_business(c, me)
    pid = me["portfolios"][0]["portfolio_id"]
    response = await c["client"].post(f"/customer/v2/portfolios/{pid}/workspace-topics", headers=auth,
        json={"idempotency_key": str(uuid4()), "title": "Antra sintetinė tema", "anchor": {"kind": "business", "selection_id": business}})
    topic_id = response.json()["data"]["current_topic"]["topic_id"]
    second_base = f"/customer/v2/portfolios/{pid}/workspace-topics/{topic_id}"
    second, _ = await send(c, auth, second_base)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Task).where(Task.id == first["turn"]["task_id"]).values(lease_until=utcnow()+timedelta(seconds=60)))
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == grant).values(enabled=False))
    async with scope(user=me["user_id"]) as tx:
        assert await tx.get(Task, first["turn"]["task_id"]) is None
        assert await tx.scalar(text("SELECT workspace_team_actor_busy(:u,:e)"), {"u": me["user_id"], "e": c["environment"]}) is True
        assert await tx.scalar(text("SELECT workspace_team_daily_reserved(:u,:e)"), {"u": me["user_id"], "e": c["environment"]}) == 6
    assert not await worker.execute_once(adapter=delegated, kind=KIND)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task, second["turn"]["task_id"])).status == "queued"
    assert first_claim["run_id"]


async def test_source_change_stops_after_charged_phase_without_publishing_it(team, monkeypatch):
    c = team
    auth, me, base, _, _ = await setup(c)
    accepted, _ = await send(c, auth, base)
    owner_page = await c["client"].get(base+"/team/events?limit=1", headers=auth)
    assert owner_page.status_code == 200

    async def changed(phase, packet, heartbeat):
        value, usage = await delegated(phase, packet, heartbeat)
        monkeypatch.setattr(service, "source_current", lambda: False)
        return value, usage

    assert await worker.execute_once(adapter=changed, kind=KIND)
    result = await page(c, auth, base)
    assert [e["author_type"] for e in result["events"]] == ["user"]
    assert result["turns"][0]["status"] == "failed" and result["turns"][0]["reserved_calls"] == 1
    assert result["turns"][0]["settled_calls"] == 1


async def test_history_cursor_keeps_event_cutoff_while_later_results_commit(team):
    c = team
    auth, me, base, _, _ = await setup(c)
    for i in range(3):
        await send(c, auth, base, content=f"Sintetinis klausimas {i}.")
    async def direct(phase, packet, heartbeat):
        return {"answer": "Tiesioginė sintetinė išvada.", "limitations": [], "decision": "answer", "assignment": None}, {"input_tokens": 1}
    assert await worker.execute_once(adapter=direct, kind=KIND)
    initial = await c["client"].get(base+"/team/events?limit=2", headers=auth)
    assert initial.status_code == 200, initial.text
    first = initial.json()["data"]
    assert first["cutoff_sequence"] == 4 and first["next_cursor"]
    assert await worker.execute_once(adapter=direct, kind=KIND)
    earlier = await c["client"].get(base+"/team/events", headers=auth, params={"cursor": first["next_cursor"], "limit": 2})
    assert earlier.status_code == 200, earlier.text
    assert earlier.json()["data"]["cutoff_sequence"] == 4
    assert [e["sequence"] for e in earlier.json()["data"]["events"]] == [1, 2]
    assert (await page(c, auth, base))["cutoff_sequence"] == 5


async def healthy_topic(c, auth, me):
    business, grant = await native_business(c, me)
    pid = me["portfolios"][0]["portfolio_id"]
    response = await c["client"].post(f"/customer/v2/portfolios/{pid}/workspace-topics", headers=auth,
        json={"idempotency_key": str(uuid4()), "title": "Sveika sintetinė tema", "anchor": {"kind": "business", "selection_id": business}})
    assert response.status_code == 200, response.text
    return f"/customer/v2/portfolios/{pid}/workspace-topics/"+response.json()["data"]["current_topic"]["topic_id"], grant


@pytest.mark.parametrize("invalidity", ["grant", "archive", "session", "deadline"])
async def test_unstarted_unadmitted_queue_is_terminally_released_without_losing_charges(team, monkeypatch, invalidity):
    c = team
    identity, auth, me = await verified(c)
    settings().workspace_team_actor_ids = [me["user_id"]]
    stale, grant = await healthy_topic(c, auth, me)
    healthy, _ = await healthy_topic(c, auth, me)
    monkeypatch.setattr(settings(), "chat_daily_limit", 3)
    accepted, body = await send(c, auth, stale)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if invalidity == "grant":
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == grant).values(enabled=False))
        elif invalidity == "archive":
            row = await tx.get(Topic, stale.split("/")[-1])
            row.archived_at, row.metadata_revision, row.updated_at = utcnow(), row.metadata_revision+1, utcnow()
        elif invalidity == "session":
            task = await tx.get(Task, accepted["turn"]["task_id"])
            await tx.execute(update(Session).where(Session.id == task.session_id).values(expires_at=utcnow()-timedelta(seconds=1)))
        else:
            # Preserve the synthetic input while making its fixed admission TTL expired.
            await tx.execute(text("ALTER TABLE control_workspace_team_turns DISABLE TRIGGER workspace_team_mutation"))
            await tx.execute(update(TeamTurn).where(TeamTurn.id == accepted["turn"]["task_id"]).values(created_at=utcnow()-timedelta(days=2), deadline=utcnow()-timedelta(days=1)))
            await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
            await tx.execute(text("ALTER TABLE control_workspace_team_turns ENABLE TRIGGER workspace_team_mutation"))
    if invalidity == "session":
        from test_customer_public import logged
        auth = await logged(c, identity)
    fresh, _ = await send(c, auth, healthy)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task, accepted["turn"]["task_id"])).status == "failed"
        assert (await tx.get(Task, fresh["turn"]["task_id"])).status == "queued"
        assert list(await tx.scalars(select(Attempt).where(Attempt.environment_id == c["environment"]))) == []
    if invalidity == "grant":
        conflict = await c["client"].post(healthy+"/team/turns", headers=auth, json=body)
        assert conflict.status_code == 409, conflict.text


async def test_deferred_publication_rejection_keeps_known_root_and_call_usage(team, monkeypatch):
    c = team
    auth, me, base, _, _ = await setup(c)
    accepted, _ = await send(c, auth, base)
    original = service.add_event
    async def late(tx, row, thread, task_id, author, kind, content, **options):
        event = await original(tx, row, thread, task_id, author, kind, content, **options)
        if author != "user":
            async with AsyncSession(c["admin"]) as admin, admin.begin():
                await admin.execute(update(Membership).where(Membership.user_id == me["user_id"], Membership.environment_id == c["environment"]).values(enabled=False))
        return event
    monkeypatch.setattr(service, "add_event", late)
    assert await worker.execute_once(adapter=delegated, kind=KIND)
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, accepted["turn"]["task_id"])
        run = await tx.get(TaskRun, task.run_id)
        assert task.status == "failed" and run.usage == {"input_tokens": 5, "output_tokens": 7}
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
        assert len(attempts) == 1 and attempts[0].usage == run.usage
        events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task.id)))
        assert len(events) == 1 and events[0].author_type == "user"
