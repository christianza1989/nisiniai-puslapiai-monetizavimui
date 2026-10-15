"""Owned0027 actual PostgreSQL/common worker; supplied synthetic copy, zero providers."""

import asyncio
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, text
from test_acquisition_correspondence import CONFIG, mutate, snapshot
from test_acquisition_correspondence import lane as _correspondence_lane

from pinet_core.acquisition.ledger import LedgerError, apply_scope, scope_values
from pinet_core.acquisition.task_models import TaskBinding
from pinet_core.acquisition.task_schema import KIND
from pinet_core.acquisition.tasks import CaptureHandler, CaptureTaskInput, submit_capture
from pinet_core.control.routes import scope
from pinet_core.db import db
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun

pytestmark = pytest.mark.skipif(not CONFIG, reason="Explicit owned full-chain0027 QA configuration required")
correspondence_lane = _correspondence_lane


@pytest.fixture
async def lane(correspondence_lane, monkeypatch):
    lane = correspondence_lane
    monkeypatch.setattr(lane.cfg, "acquisition_tasks_enabled", True)
    monkeypatch.setattr(lane.cfg, "acquisition_tasks_daily_limit", 0)
    await mutate(
        lane,
        'UPDATE acquisition_modules SET permissions=permissions || \'["acquisition.work","acquisition.work.read"]\'::jsonb WHERE business_id=:business AND environment_id=:e',
    )
    return lane


def value(lane, **changes):
    return CaptureTaskInput(
        scope=lane.scope,
        adapter_id=lane.adapter,
        request_id=uuid4(),
        recipient="owner@example.test",
        campaign=lane.campaign,
        prospect=lane.prospect,
        prepared=lane.prepared,
        **changes,
    )


async def task_row(lane, task_id):
    async with scope(user=lane.ids["user"]) as tx:
        return await tx.get(Task, task_id)


async def mail_count(lane):
    async with lane.admin.connect() as tx:
        return await tx.scalar(
            text("SELECT count(*) FROM mail_messages WHERE business_id=:b AND environment_id=:e"),
            {"b": lane.ids["business"], "e": lane.scope.environment_id},
        )


async def test_generic_worker_capture_history_and_exact_replay(lane):
    request = value(lane)
    first, replay = await asyncio.gather(submit_capture(db, request), submit_capture(db, request))
    assert first.id == replay.id and first.kind == KIND and first.session_id is None
    assert await worker.execute_once()
    row = await task_row(lane, first.id)
    assert (
        row.status == "succeeded"
        and row.result["state"] == "captured"
        and row.result["external_sent"] is False
    )
    assert await mail_count(lane) == 1
    assert (await submit_capture(db, request)).id == first.id
    assert not await worker.execute_once(kind=KIND)
    assert await mail_count(lane) == 1
    headers = {"Authorization": "Bearer " + lane.token}
    for path in [
        f"/acquisition-tasks/{first.id}",
        f"/acquisition-tasks/{first.id}/report",
        f"/acquisition-tasks/{first.id}/events",
    ]:
        response = await lane.client.get("/operator/v2" + path, headers=headers)
        assert response.status_code == 200 and "owner@example.test" not in response.text
    report = (
        await lane.client.get(f"/operator/v2/acquisition-tasks/{first.id}/report", headers=headers)
    ).json()["data"]
    assert report["agent_id"] == "acquisition-reviewed-capture" and report["execution"]["model"] == "none"
    counts = (await snapshot(lane))["counts"]
    assert counts["outbound_captured"] == 1
    async with scope(user=lane.ids["user"]) as tx:
        run = await tx.get(TaskRun, row.run_id)
        assert run.usage == {"model_calls": 0} and run.cost_microusd is None
    async with lane.admin.connect() as tx:
        assert (
            await tx.scalar(
                text("SELECT count(*) FROM conversations WHERE business_id=:b"), {"b": lane.ids["business"]}
            )
            == 0
        )


async def test_report_never_attributes_another_tasks_run(lane):
    request = value(lane)
    first = await submit_capture(db, request)
    assert await worker.execute_once(kind=KIND)
    second = await submit_capture(
        db,
        request.model_copy(
            update={
                "request_id": uuid4(),
                "recipient": "second@example.test",
                "prospect": request.prospect.model_copy(update={"organization_key": "second-report"}),
            }
        ),
    )
    assert await worker.execute_once(kind=KIND)
    other = await task_row(lane, second.id)
    assert other.run_id and (await task_row(lane, first.id)).run_id != other.run_id
    # A legacy/non-FK pointer is never sufficient provenance for an execution receipt.
    await mutate(
        lane,
        "UPDATE control_tasks SET run_id=:run WHERE id=:task",
        {"run": other.run_id, "task": first.id},
    )
    response = await lane.client.get(
        f"/operator/v2/acquisition-tasks/{first.id}/report",
        headers={"Authorization": "Bearer " + lane.token},
    )
    assert response.status_code == 200
    assert response.json()["data"]["execution"] is None, "Another Task's Run is not this Task's evidence"
    assert await mail_count(lane) == 2


async def test_changed_input_and_target_dedup_do_not_create_mail(lane):
    request = value(lane)
    first = await submit_capture(db, request)
    altered = request.model_copy(update={"recipient": "another@example.test"})
    with pytest.raises(LedgerError):
        await submit_capture(db, altered)
    with pytest.raises(LedgerError) as conflict:
        await submit_capture(db, request.model_copy(update={"request_id": uuid4()}))
    assert conflict.value.code == "acquisition_task_target_reserved"
    assert (await task_row(lane, first.id)).status == "queued" and await mail_count(lane) == 0


@pytest.mark.parametrize("mode", ["stopped", "expired", "source", "permission", "registration"])
async def test_current_authority_is_checked_before_claim(lane, mode):
    task = await submit_capture(db, value(lane))
    if mode == "stopped":
        await mutate(lane, "UPDATE acquisition_modules SET enabled=false WHERE business_id=:business")
    elif mode == "expired":
        await mutate(
            lane,
            "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business",
        )
    elif mode == "source":
        lane.cfg.control_source_revision = "b" * 40
    elif mode == "permission":
        await mutate(
            lane,
            "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.work' WHERE business_id=:business",
        )
    else:
        path = lane.paths["acquisition_work_config"]
        path.write_bytes(path.read_bytes() + b" ")
    assert not await worker.execute_once(kind=KIND)
    row = await task_row(lane, task.id)
    assert row.status == "failed" and row.failure_code == "authorization_revoked"
    assert row.result is None and await mail_count(lane) == 0


async def test_scheduled_task_does_not_require_or_invent_browser_session(lane):
    task = await submit_capture(db, value(lane))
    await mutate(lane, "UPDATE control_sessions SET revoked_at=clock_timestamp() WHERE id=:session")
    assert await worker.execute_once(kind=KIND)
    assert (await task_row(lane, task.id)).status == "succeeded" and task.session_id is None
    assert await mail_count(lane) == 1


async def test_cancelled_and_interrupted_attempts_are_not_retried(lane):
    request = value(lane)
    task = await submit_capture(db, request)
    assert await worker.claim(kind=KIND)
    await mutate(
        lane,
        "UPDATE control_tasks SET lease_until=clock_timestamp()-interval '1 second' WHERE id=:task",
        {"task": task.id},
    )
    assert not await worker.execute_once(kind=KIND)
    row = await task_row(lane, task.id)
    assert row.status == "failed" and row.failure_code == "worker_interrupted"
    assert (await submit_capture(db, request)).id == task.id and not await worker.execute_once(kind=KIND)
    assert await mail_count(lane) == 0
    async with lane.admin.connect() as tx:
        assert (
            await tx.scalar(text("SELECT count(*) FROM control_task_runs WHERE task_id=:t"), {"t": task.id})
            == 1
        )


async def test_cancel_during_run_fences_capture(lane, monkeypatch):
    task = await submit_capture(db, value(lane))
    original = CaptureHandler.run

    async def cancel(self, context, heartbeat, adapter=None):
        assert await heartbeat()
        response = await lane.client.post(
            f"/operator/v2/acquisition-tasks/{task.id}/cancel",
            headers={"Authorization": "Bearer " + lane.token},
        )
        assert response.status_code == 200
        return await original(self, context, heartbeat, adapter)

    monkeypatch.setattr(CaptureHandler, "run", cancel)
    assert await worker.execute_once(kind=KIND)
    assert (await task_row(lane, task.id)).status == "cancelled" and await mail_count(lane) == 0


async def test_effect_and_terminal_task_are_atomic(lane, monkeypatch):
    task = await submit_capture(db, value(lane))
    original = CaptureHandler.complete

    async def fail_after_flush(self, tx, current, result):
        captured = await original(self, tx, current, result)
        assert captured["state"] == "captured"
        raise LedgerError(409, "synthetic_final_fence")

    monkeypatch.setattr(CaptureHandler, "complete", fail_after_flush)
    assert await worker.execute_once(kind=KIND)
    row = await task_row(lane, task.id)
    assert row.status == "failed" and row.failure_code == "synthetic_final_fence" and row.result is None
    assert await mail_count(lane) == 0
    async with lane.admin.connect() as tx:
        assert (
            await tx.scalar(
                text("SELECT count(*) FROM cases WHERE business_id=:b AND environment_id=:e"),
                {"b": lane.ids["business"], "e": lane.scope.environment_id},
            )
            == 0
        )
        assert (
            await tx.scalar(
                text(
                    "SELECT count(*) FROM acquisition_work_receipts WHERE business_id=:b AND environment_id=:e"
                ),
                {"b": lane.ids["business"], "e": lane.scope.environment_id},
            )
            == 0
        )


@pytest.mark.parametrize("state", ["hold", "stopped"])
async def test_recipient_containment_after_enqueue_blocks_worker(lane, state):
    from pinet_core.acquisition.correspondence import recipient_hash

    task = await submit_capture(db, value(lane))
    async with lane.admin.begin() as tx:
        await tx.execute(
            text("""INSERT INTO acquisition_contact_policies(business_id,environment_id,site_id,
            environment_class,adapter_id,recipient_hash,state,revision,reason,resume_condition_quote,updated_at)
            VALUES(:business_id,:environment_id,:site_id,:environment_class,:adapter_id,:recipient_hash,
            :state,1,'Synthetic current containment','',clock_timestamp())"""),
            {
                **scope_values(lane.scope, lane.adapter),
                "recipient_hash": recipient_hash("owner@example.test"),
                "state": state,
            },
        )
    assert not await worker.execute_once(kind=KIND)
    assert (await task_row(lane, task.id)).status == "failed" and await mail_count(lane) == 0


async def test_zero_ceiling_and_explicit_positive_ceiling_keep_history(lane):
    first = value(lane)
    task = await submit_capture(db, first)
    second = first.model_copy(
        update={
            "request_id": uuid4(),
            "recipient": "second@example.test",
            "prospect": first.prospect.model_copy(update={"organization_key": "second-salon"}),
        }
    )
    assert (await submit_capture(db, second)).id != task.id
    lane.cfg.acquisition_tasks_daily_limit = 2
    assert (await submit_capture(db, first)).id == task.id
    third = second.model_copy(
        update={
            "request_id": uuid4(),
            "prospect": second.prospect.model_copy(update={"organization_key": "third-salon"}),
        }
    )
    with pytest.raises(LedgerError) as limited:
        await submit_capture(db, third)
    assert limited.value.code == "acquisition_task_rate_limited"
    assert await mail_count(lane) == 0


async def test_chat_thread_consumers_do_not_treat_capture_as_chat(lane, monkeypatch):
    task = await submit_capture(db, value(lane))
    headers = {"Authorization": "Bearer " + lane.token}
    assert (
        await lane.client.get(f"/operator/v2/chat/threads/{task.thread_id}", headers=headers)
    ).status_code == 404
    monkeypatch.setattr(lane.cfg, "chat_enabled", True)
    monkeypatch.setattr(lane.cfg, "chat_operator_user_id", lane.ids["user"])
    response = await lane.client.post(
        f"/operator/v2/chat/threads/{task.thread_id}/messages",
        headers=headers,
        json={"message": "Synthetic test", "idempotency_key": str(uuid4())},
    )
    assert response.status_code == 404
    assert (await task_row(lane, task.id)).status == "queued"


async def test_foreign_scope_and_immutable_task_binding(lane):
    from sqlalchemy.exc import DBAPIError

    task = await submit_capture(db, value(lane))
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        foreign = lane.scope.model_copy(update={"site_id": "foreign-site"})
        await apply_scope(tx, foreign, lane.adapter)
        assert list(await tx.scalars(select(TaskBinding))) == []
    with pytest.raises(DBAPIError) as rejected:
        async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
            await apply_scope(tx, lane.scope, lane.adapter)
            await tx.execute(
                text("UPDATE acquisition_task_bindings SET input_sha256=:h WHERE task_id=:t"),
                {"h": "a" * 64, "t": task.id},
            )
    assert rejected.value.orig.sqlstate == "42501"


async def test_legacy_wire_never_emits_capture_kind(lane):
    import json
    from pathlib import Path

    canonical = json.loads(
        (Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-chat.openapi.json").read_bytes()
    )
    assert canonical["components"]["schemas"]["Task"]["properties"]["kind"] == {"const": "chat.consult"}
    task = await submit_capture(db, value(lane))
    response = await lane.client.get(
        f"/operator/v2/tasks/{task.id}", headers={"Authorization": "Bearer " + lane.token}
    )
    assert response.status_code == 404, "Legacy chat.v1 must not emit acquisition Task"


async def test_rls_hidden_actor_uuid_returns_controlled_conflict(lane, monkeypatch):
    hidden_business, key = str(uuid4()), str(uuid4())
    hidden_site = "hidden-uuid-" + uuid4().hex
    async with lane.admin.begin() as tx:
        await tx.execute(
            text("INSERT INTO businesses(id,site_id,canonical_host) VALUES(:b,:s,:h)"),
            {"b": hidden_business, "s": hidden_site, "h": hidden_site + ".example.test"},
        )
        await tx.execute(
            text("""INSERT INTO control_business_grants(id,environment_id,portfolio_id,
            organization_id,business_id,display_name,connection_status,runtime_status,evidence_revision,enabled)
            VALUES(:id,:e,:portfolio,:organization,:b,'Synthetic hidden UUID','registered','not_connected',:source,true)"""),
            {
                **lane.ids,
                "id": str(uuid4()),
                "e": lane.scope.environment_id,
                "b": hidden_business,
                "source": lane.cfg.control_source_revision,
            },
        )
    monkeypatch.setattr(lane.cfg, "chat_enabled", True)
    monkeypatch.setattr(lane.cfg, "chat_operator_user_id", lane.ids["user"])
    headers = {"Authorization": "Bearer " + lane.token}
    before = await lane.client.post(
        f"/operator/v2/businesses/{hidden_business}/chat/threads",
        headers=headers,
        json={"message": "Synthetic hidden previous task", "idempotency_key": key},
    )
    assert before.status_code == 202
    await mutate(
        lane, "UPDATE control_business_grants SET enabled=false WHERE business_id=:b", {"b": hidden_business}
    )
    with pytest.raises(LedgerError) as rejected:
        await submit_capture(db, value(lane).model_copy(update={"request_id": UUID(key)}))
    assert rejected.value.code == "acquisition_task_replay_conflict"
    assert await mail_count(lane) == 0


async def test_typed_read_page_schema_pagination_and_snapshot_change(lane):
    from pinet_core.acquisition.task_interfaces import PageEnvelope, TaskEnvelope
    from pinet_core.acquisition.task_routes import read_page
    from pinet_core.control_api import app

    items = []
    for i in range(3):
        request = value(lane)
        request = request.model_copy(
            update={
                "recipient": f"salon{i}@example.test",
                "prospect": request.prospect.model_copy(update={"organization_key": f"paged-salon-{i}"}),
            }
        )
        items.append(await submit_capture(db, request))
    headers = {"Authorization": "Bearer " + lane.token}
    url = f"/operator/v2/businesses/{lane.ids['business']}/acquisition-tasks"
    first = await lane.client.get(url, params={"limit": 2}, headers=headers)
    assert first.status_code == 200
    page = PageEnvelope.model_validate_json(first.content).data
    assert len(page.items) == 2 and page.next_cursor
    second = await lane.client.get(url, params={"limit": 2, "cursor": page.next_cursor}, headers=headers)
    assert second.status_code == 200
    other = PageEnvelope.model_validate_json(second.content).data
    assert len(other.items) == 1 and other.next_cursor is None
    assert {t.task_id for t in (*page.items, *other.items)} == {t.id for t in items}
    internal = await read_page(
        app,
        db,
        business_id=lane.ids["business"],
        user_id=lane.ids["user"],
        session_id=lane.ids["session"],
        limit=2,
    )
    assert internal["snapshot_id"] == page.snapshot_id and [t.task_id for t in internal["items"]] == [
        t.task_id for t in page.items
    ]
    one = await lane.client.get(f"/operator/v2/acquisition-tasks/{items[0].id}", headers=headers)
    assert TaskEnvelope.model_validate_json(one.content).data.task_id == items[0].id
    late = value(lane).model_copy(
        update={"prospect": lane.prospect.model_copy(update={"organization_key": "late-page"})}
    )
    await submit_capture(db, late)
    assert (
        await lane.client.get(url, params={"limit": 2, "cursor": page.next_cursor}, headers=headers)
    ).status_code == 409
    # Old chat/operations contract sees no new kind or capture result.
    legacy = await lane.client.get(f"/operator/v2/businesses/{lane.ids['business']}/tasks", headers=headers)
    assert legacy.status_code == 200 and legacy.json()["data"]["items"] == []
    overview = await lane.client.get(
        f"/operator/v2/businesses/{lane.ids['business']}/overview", headers=headers
    )
    assert set(overview.json()["data"]["task_counts"].values()) == {0}


@pytest.mark.parametrize("state", ["stop", "expiry"])
async def test_typed_history_and_cancel_survive_marketing_boundary(lane, state):
    task = await submit_capture(db, value(lane))
    if state == "stop":
        await mutate(lane, "UPDATE acquisition_modules SET enabled=false WHERE business_id=:business")
    else:
        await mutate(
            lane,
            "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business",
        )
    headers = {"Authorization": "Bearer " + lane.token}
    assert (
        await lane.client.get(f"/operator/v2/acquisition-tasks/{task.id}", headers=headers)
    ).status_code == 200
    assert (
        await lane.client.post(f"/operator/v2/acquisition-tasks/{task.id}/cancel", headers=headers)
    ).status_code == 200
    assert (await task_row(lane, task.id)).status == "cancelled" and await mail_count(lane) == 0


@pytest.mark.parametrize("what", ["user", "membership", "grant", "permission"])
async def test_typed_read_current_identity_and_permission(lane, what):
    task = await submit_capture(db, value(lane))
    sql = {
        "user": "UPDATE control_users SET enabled=false WHERE id=:user",
        "membership": "UPDATE control_memberships SET enabled=false WHERE id=:membership",
        "grant": "UPDATE control_business_grants SET enabled=false WHERE id=:grant",
        "permission": "UPDATE acquisition_modules SET permissions=permissions - 'acquisition.work.read' WHERE business_id=:business",
    }[what]
    await mutate(lane, sql)
    response = await lane.client.get(
        f"/operator/v2/acquisition-tasks/{task.id}", headers={"Authorization": "Bearer " + lane.token}
    )
    assert response.status_code in {401, 403, 404} and "input_sha256" not in response.text
    assert await mail_count(lane) == 0


async def test_final_lease_clock_after_real_campaign_wait(lane, monkeypatch):
    task = await submit_capture(db, value(lane))
    async with lane.admin.begin() as tx:
        await tx.execute(
            text("""INSERT INTO acquisition_campaigns(business_id,environment_id,site_id,
            environment_class,adapter_id,campaign_id,stopped,created_at)
            VALUES(:business_id,:environment_id,:site_id,:environment_class,:adapter_id,:campaign_id,false,clock_timestamp())"""),
            {**scope_values(lane.scope, lane.adapter), "campaign_id": lane.campaign.campaign_id},
        )
    ready, held = asyncio.Event(), asyncio.Event()
    original = CaptureHandler.run

    async def short_lease(self, context, heartbeat, adapter=None):
        result = await original(self, context, heartbeat, adapter)
        await mutate(
            lane,
            "UPDATE control_tasks SET lease_until=clock_timestamp()+interval '0.3 second' WHERE id=:task",
            {"task": task.id},
        )
        ready.set()
        await held.wait()
        return result

    monkeypatch.setattr(CaptureHandler, "run", short_lease)
    running = asyncio.create_task(worker.execute_once(kind=KIND))
    try:
        await asyncio.wait_for(ready.wait(), 5)
        async with lane.admin.begin() as tx:
            await tx.execute(
                text(
                    "SELECT campaign_id FROM acquisition_campaigns WHERE business_id=:b AND environment_id=:e FOR UPDATE"
                ),
                {"b": lane.ids["business"], "e": lane.scope.environment_id},
            )
            held.set()
            await asyncio.sleep(0.65)
        assert await asyncio.wait_for(running, 5)
    finally:
        held.set()
        if not running.done():
            running.cancel()
            await asyncio.gather(running, return_exceptions=True)
    row = await task_row(lane, task.id)
    assert row.status == "failed" and row.failure_code == "worker_interrupted" and await mail_count(lane) == 0


async def test_same_actor_uuid_cross_kind_is_serialized(lane, monkeypatch):
    request = value(lane)
    monkeypatch.setattr(lane.cfg, "chat_enabled", True)
    monkeypatch.setattr(lane.cfg, "chat_operator_user_id", lane.ids["user"])

    async def typed():
        try:
            await submit_capture(db, request)
            return 202
        except LedgerError as e:
            return e.status

    async def chat():
        response = await lane.client.post(
            f"/operator/v2/businesses/{lane.ids['business']}/chat/threads",
            headers={"Authorization": "Bearer " + lane.token},
            json={"message": "Synthetic concurrent UUID", "idempotency_key": str(request.request_id)},
        )
        return response.status_code

    assert sorted(await asyncio.gather(typed(), chat())) == [202, 409]
    async with scope(user=lane.ids["user"]) as tx:
        assert (
            len(list(await tx.scalars(select(Task).where(Task.idempotency_key == str(request.request_id)))))
            == 1
        )
    assert await mail_count(lane) == 0
