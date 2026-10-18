"""Retained restricted-owner lifecycle; only inert translation adapters are used."""

# ruff: noqa: F811 -- imported pytest fixtures are injected into test parameters.
import asyncio
import json
import sys
from datetime import timedelta

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from test_mail_display_tasks_pg import Translator, display, second_owner  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.mail_view import task_authority as authority
from pinet_core.mail_view import task_handler, task_policy, task_service
from pinet_core.mail_view.task_contract import KIND
from pinet_core.mail_view.task_models import DisplayJob, DisplayPolicy
from pinet_core.mail_view.translations import record_path
from pinet_core.models import MailMessage, new_id, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun


async def owner_enqueue(p, mail_id, policy_id=None):
    async with scope(token=token_hash(p["token"])) as tx:
        session = await customer_session(tx, p["token"])
        return await task_service.enqueue(
            tx, session, {"policy_id": policy_id or p["policy"]["id"], "mail_id": mail_id}
        )


async def initial_jobs(p):
    ids = [p["mail_id"]]
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        for _ in range(2):
            identity = new_id()
            ids.append(identity)
            tx.add(
                MailMessage(
                    id=identity,
                    case_id=p["case_id"],
                    business_id=p["business_id"],
                    environment_id=p["environment"],
                    message_id="<" + new_id() + "@example.test>",
                    direction="inbound",
                    state="captured",
                    payload=p["payload"],
                )
            )
    tasks = [(await owner_enqueue(p, identity))["task_id"] for identity in ids]
    async with AsyncSession(p["admin"]) as tx:
        jobs = list(
            await tx.scalars(
                select(DisplayJob).where(DisplayJob.task_id.in_(tasks)).order_by(DisplayJob.task_id)
            )
        )
    return tasks, ids, jobs


async def stop(p):
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await task_policy.contain(
            tx,
            "stop",
            {
                "policy_id": p["policy"]["id"],
                "authorizing_session_id": p["session_id"],
                "execution_source_revision": p["request"]["execution_source_revision"],
                "expected_fingerprint": p["policy"]["fingerprint"],
            },
        )


def recovery(p, jobs):
    return {
        **p["request"],
        "policy_id": new_id(),
        "maximum_calls": len(jobs),
        "version": "mail-display-zero-dispatch-reauthorization.v1",
        "jobs": [
            {"previous_task_id": job.task_id, "expected_source_sha256": job.source_sha256} for job in jobs
        ],
    }


async def perform(p, request):
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        return await task_policy.operate(tx, "reauthorize", request)


async def snapshots(p, tasks, ids):
    async with AsyncSession(p["admin"]) as tx:
        result = {}
        for table, column, values in [
            ("control_tasks", "id", tasks),
            ("control_mail_display_jobs", "task_id", tasks),
            ("mail_messages", "id", ids),
            ("control_mail_display_policies", "id", [p["policy"]["id"]]),
        ]:
            result[table] = list(
                await tx.scalars(
                    text(f"SELECT to_jsonb(t) FROM {table} t WHERE {column}=ANY(:ids) ORDER BY {column}"),
                    {"ids": values},
                )
            )
        return result


@pytest.mark.parametrize("contained", [False, True])
async def test_three_named_successors_use_fixed_cli_and_keep_old_rows_mail_and_stop(
    display, monkeypatch, capsys, contained
):
    import mail_display_policy
    import mail_display_task

    p = display
    tasks, ids, jobs = await initial_jobs(p)
    await stop(p)
    if contained:
        inert = Translator()
        # The supported fixed worker contains stopped queued originals before any Run.
        for _ in range(3):
            assert await worker.execute_once(inert, kind=KIND) is False
        assert not inert.calls
        async with AsyncSession(p["admin"]) as tx:
            for identity in tasks:
                original_task = await tx.get(Task, identity)
                assert (original_task.status, original_task.failure_code) == (
                    "failed",
                    "authorization_revoked",
                )
                assert not await tx.scalar(select(TaskRun.id).where(TaskRun.task_id == identity))
    before = await snapshots(p, tasks, ids)
    request = recovery(p, jobs)
    receipt = p["root"] / "reauthorize.private.json"
    result = await mail_display_policy.execute("reauthorize", request, str(receipt))
    assert len(result["successor_task_ids"]) == 3 and not result["model_dispatch_performed"]
    assert (
        json.loads((p["root"] / "reauthorize.private.json.status.json").read_text())["status"] == "committed"
    )
    assert await snapshots(p, tasks, ids) == before
    fake = Translator()
    original = worker.execute_once

    async def fixed(*, kind):
        assert kind == KIND
        return await original(fake, kind=kind)

    monkeypatch.setattr(worker, "execute_once", fixed)
    monkeypatch.setattr(sys, "argv", ["mail_display_task.py", "run-one"])
    for _ in range(3):
        await mail_display_task.main()
        assert json.loads(capsys.readouterr().out)["task_processed"] is True
    await mail_display_task.main()
    assert json.loads(capsys.readouterr().out)["task_processed"] is False
    assert len(fake.calls) == 3 and set(fake.calls) == set(ids)
    assert await snapshots(p, tasks, ids) == before
    async with AsyncSession(p["admin"]) as tx:
        for previous in jobs:
            child = await tx.scalar(select(DisplayJob).where(DisplayJob.previous_task_id == previous.task_id))
            task = await tx.get(Task, child.task_id)
            run = await tx.get(TaskRun, task.run_id)
            assert (
                child.generation == 1
                and child.record
                and child.reserved_at
                and task.status == run.status == "succeeded"
            )
            assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == 0
            assert (await owner_enqueue(p, previous.mail_id))["task_id"] == child.task_id
            response = await p["client"].get(
                f"/operator/v2/businesses/{p['business_id']}/mail/{previous.mail_id}", headers=p["auth"]
            )
            assert response.json()["data"]["translation"]["status"] == "ready"
    with pytest.raises(ControlError):
        await perform(p, recovery(p, jobs))


@pytest.mark.parametrize(
    "reason",
    [
        "live_policy",
        "changed_source",
        "foreign_owner",
        "legacy_claim",
        "task_lease",
        "task_result",
        "existing_run",
        "unknown_attempt",
        "completed",
        "other_failure",
    ],
)
async def test_refuses_any_attempt_or_uncertainty_and_rolls_back_new_budget(display, reason):
    p = display
    tasks, ids, jobs = await initial_jobs(p)
    if reason in {"unknown_attempt", "completed"}:
        assert await worker.execute_once(Translator(usage=reason != "unknown_attempt"), kind=KIND)
    elif reason == "existing_run":
        assert await worker.claim(kind=KIND)  # A Run alone is enough to refuse, even before reservation.
    if reason != "live_policy":
        await stop(p)
    request = recovery(p, jobs)
    if reason == "changed_source":
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            await tx.execute(
                update(MailMessage)
                .where(MailMessage.id == jobs[0].mail_id)
                .values(payload={**p["payload"], "body": "Changed original."})
            )
    elif reason in {"task_lease", "task_result", "other_failure"}:
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            changes = (
                {"lease_until": utcnow() + timedelta(minutes=1)}
                if reason == "task_lease"
                else {"status": "failed", "failure_code": "task_context_unavailable"}
                if reason == "other_failure"
                else {"result": {"unknown": True}}
            )
            await tx.execute(update(Task).where(Task.id == jobs[0].task_id).values(**changes))
    elif reason == "foreign_owner":
        other = await second_owner(p)
        async with scope(token=token_hash(other["token"])) as tx:
            request["authorizing_session_id"] = (await customer_session(tx, other["token"])).id
    elif reason == "legacy_claim":
        path = record_path(
            p["root"], p["business_id"], p["environment"], jobs[0].mail_id, jobs[0].source_sha256
        ).with_suffix(".attempt.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("{}")
    with pytest.raises(ControlError):
        await perform(p, request)
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.get(DisplayPolicy, request["policy_id"]) is None
        assert not await tx.scalar(
            select(DisplayJob.task_id).where(DisplayJob.previous_task_id.in_(tasks)).limit(1)
        )


async def test_competing_explicit_requests_create_only_one_successor_batch(display):
    p = display
    tasks, ids, jobs = await initial_jobs(p)
    await stop(p)
    before = await snapshots(p, tasks, ids)
    outputs = await asyncio.gather(
        perform(p, recovery(p, jobs)), perform(p, recovery(p, jobs)), return_exceptions=True
    )
    assert sum(isinstance(value, dict) for value in outputs) == 1
    assert sum(isinstance(value, ControlError) for value in outputs) == 1
    assert await snapshots(p, tasks, ids) == before


async def test_claim_selected_before_reauthorization_does_not_mutate_old_task_after_wait(
    display, monkeypatch
):
    p = display
    tasks, ids, jobs = await initial_jobs(p)
    await stop(p)
    before = await snapshots(p, tasks, ids)
    entered, release = asyncio.Event(), asyncio.Event()
    original = task_handler.preflight

    async def held(tx, task):
        if task.id in tasks:
            entered.set()
            await release.wait()
        return await original(tx, task)

    monkeypatch.setattr(task_handler, "preflight", held)
    pending = asyncio.create_task(worker.execute_once(Translator(), kind=KIND))
    try:
        await asyncio.wait_for(entered.wait(), 10)
        await perform(p, recovery(p, jobs))
    finally:
        release.set()
    assert await asyncio.wait_for(pending, 15) is False
    assert await snapshots(p, tasks, ids) == before


async def test_recovery_policy_cannot_auto_expand_after_zero_dispatch_failure(display):
    p = display
    tasks, ids, jobs = await initial_jobs(p)
    await stop(p)
    result = await perform(p, recovery(p, jobs))
    policy = result["after"]["id"]
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        children = list(await tx.scalars(select(DisplayJob).where(DisplayJob.policy_id == policy)))
        await tx.execute(
            update(Task)
            .where(Task.id.in_([job.task_id for job in children]))
            .values(status="failed", failure_code="synthetic_fixture")
        )
        identity = new_id()
        tx.add(
            MailMessage(
                id=identity,
                case_id=p["case_id"],
                business_id=p["business_id"],
                environment_id=p["environment"],
                message_id="<" + new_id() + "@example.test>",
                direction="inbound",
                state="captured",
                payload=p["payload"],
            )
        )
    with pytest.raises(ControlError, match="mail_display_reauthorization_named_sources_only"):
        await owner_enqueue(p, identity, policy)
    await task_service.reconcile(p["user_id"])
    async with AsyncSession(p["admin"]) as tx:
        assert len(list(await tx.scalars(select(DisplayJob).where(DisplayJob.policy_id == policy)))) == 3


async def test_runtime_cannot_forge_successor_with_a_local_context_setting(display):
    p = display
    tasks, ids, jobs = await initial_jobs(p)
    await stop(p)
    before = await snapshots(p, tasks, ids)
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        approved = await task_policy.approve(tx, {**p["request"], "policy_id": new_id()})
    with pytest.raises(IntegrityError, match="explicit privileged display reauthorization required"):
        async with scope(token=token_hash(p["token"])) as tx:
            session = await customer_session(tx, p["token"])
            async with authority.current(tx, approved["after"]["id"], session.id) as (policy, _):
                await tx.execute(
                    text("SELECT set_config('pinet.mail_display_reauthorization',:p,true)"), {"p": policy.id}
                )
                previous = jobs[0]
                key = {
                    **task_service.identity(
                        policy.business_id, policy.environment_id, previous.mail_id, previous.source_sha256
                    ),
                    "previous_task_id": previous.task_id,
                    "generation": 1,
                }
                task = await task_service.new_task(tx, policy, session, key)
                tx.add(
                    DisplayJob(
                        task_id=task.id,
                        policy_id=policy.id,
                        previous_task_id=previous.task_id,
                        generation=1,
                        kind=KIND,
                        mail_id=previous.mail_id,
                        case_id=previous.case_id,
                        source_sha256=previous.source_sha256,
                        instruction_sha256=previous.instruction_sha256,
                        target_language="lt",
                        business_id=policy.business_id,
                        organization_id=policy.organization_id,
                        user_id=policy.user_id,
                        environment_id=policy.environment_id,
                    )
                )
                await tx.flush()
    assert await snapshots(p, tasks, ids) == before
