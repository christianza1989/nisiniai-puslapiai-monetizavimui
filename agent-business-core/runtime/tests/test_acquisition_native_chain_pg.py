"""Dedicated retained PG, real owner/config/common-worker/Case; inert providers only."""
import asyncio
import hashlib
import json
import os
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_model_prepare_pg import Roles, model_pilot, stored, submit  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import model_admin, model_tasks
from pinet_core.acquisition.contracts import Campaign
from pinet_core.acquisition.correspondence import Correspondence
from pinet_core.acquisition.dialogue import ReplyDecision
from pinet_core.acquisition.ledger import LedgerError
from pinet_core.acquisition.model_contract import KIND, REPLY_KIND
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.acquisition.work_interfaces import InboundCapture
from pinet_core.acquisition.work_models import MailBinding
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.control.routes import scope, token_hash
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.wire import Create, Revise
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError
from pinet_core.tasks.models import Task, TaskRun

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit dedicated retained native chain PostgreSQL lane required")


@pytest.fixture
async def native(model_pilot, monkeypatch):  # noqa: F811
    p = model_pilot
    monkeypatch.setattr(settings(), "acquisition_native_chain_enabled", True)
    current = await agents.get(p["token"], p["cid"], p["approval"]["agent_id"])
    spec = {**current["configuration"]["specification"], "name": "Synthetic independent email task"}
    email = await agents.create(p["token"], p["cid"], Create(request_id=uuid4(), purpose="email", configuration=spec))
    request = {**p["approval"], "authorization_id": str(uuid4()), "agent_id": email["agent"]["agent_id"],
        "expected_config_sha256": email["configuration"]["sha256"]}
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        result = await model_admin.approve(tx, request)
    pair = {"research_authorization_id": p["approved"]["after"]["id"],
        "research_fingerprint": p["approved"]["after"]["fingerprint"],
        "email_authorization_id": result["after"]["id"], "email_fingerprint": result["after"]["fingerprint"]}
    p.update(pair=pair, email=email)
    return p


async def research(p, fake):
    value = deepcopy(p["request"])
    value.update(stage="research", native=p["pair"])
    value["campaign"]["mode"] = "research_only"
    task_id = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "succeeded" and [r.role for r in attempts] == ["researcher", "reviewer"]
    assert "case_id" not in task.result and "mail_id" not in task.result
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert not list(await tx.scalars(select(Case)))
        assert not list(await tx.scalars(select(MailMessage)))
    return task, run, attempts


async def email(p, fake):
    r, _, _ = await research(p, fake)
    value = deepcopy(p["request"])
    value.update(request_id=str(uuid4()), authorization_id=p["pair"]["email_authorization_id"],
        stage="email", native=p["pair"], handoff=r.result["handoff"])
    task_id = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "succeeded", task.failure_code
    assert [r.role for r in attempts] == ["writer", "reviewer"]
    assert task.result["state"] == "captured"
    return task, value


async def incoming(p, initial, *, body="Could you help clarify our requirements?", parent_mail_id=None):
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        parent = await tx.get(MailMessage, parent_mail_id or initial.result["mail_id"])
    value = InboundCapture(scope=p["scope"], adapter_id="synthetic-model-native", request_id=uuid4(),
        thread_id=initial.result["thread_id"], parent_mail_id=parent.id,
        message_id="<"+uuid4().hex+"@example.test>", in_reply_to=parent.message_id,
        references=(parent.message_id,), sender="owner@example.test", recipient="info@pinet.lt", subject="Re: pilot", body=body)
    response = await Correspondence(db).receive(value, value.model_dump_json().encode())
    receipt = json.loads(response.body)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        await Correspondence(db).locked(tx, p["scope"], "synthetic-model-native")
        bound = await tx.scalar(select(MailBinding).where(MailBinding.mail_id == receipt["mail_id"]))
    return {"request_id": str(uuid4()), "authorization_id": p["pair"]["email_authorization_id"],
        "native": p["pair"], "prepare_task_id": initial.id, "thread_id": receipt["thread_id"],
        "inbound_id": receipt["mail_id"], "revision": receipt["revision"], "input_sha256": bound.input_sha256}


async def reply_submit(p, value):
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        task = await model_tasks.submit_reply(tx, actor, value)
        return task.id


class ReplyRoles(Roles):
    async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
        if role != "reply_coordinator":
            return await super().__call__(role, schema, instruction, data, heartbeat, deadline)
        assert await heartbeat()
        self.calls.append(role)
        assert data["agent_specification"]["name"] == "Synthetic independent email task"
        return ReplyDecision(classification="question", action="reply", subject="Requirements clarification",
            body="We can help structure the initial requirements brief. Which option are you considering?",
            offer_fact_ids=["pilot"], reason="Answers the current requirements question"), {"input_tokens": 5, "output_tokens": 2}


async def test_exact_two_config_native_chain_one_case_and_replay(native):
    p, fake = native, ReplyRoles()
    initial, request = await email(p, fake)
    assert await submit(p, request) == initial.id
    wire = await incoming(p, initial)
    task_id = await reply_submit(p, wire)
    assert await worker.execute_once(fake, kind=REPLY_KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "succeeded", task.failure_code
    assert fake.calls == ["researcher", "reviewer", "writer", "reviewer", "reply_coordinator", "reviewer"]
    assert run.usage["model_calls"] == 2 and run.usage["unknown_usage_calls"] == 0
    assert run.usage["input_tokens"] == 10 and all(r.authorization_id == p["pair"]["email_authorization_id"] for r in attempts)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        mail = list(await tx.scalars(select(MailMessage)))
        assert len(mail) == 3 and {m.case_id for m in mail} == {initial.result["case_id"]}
        assert await tx.scalar(select(func.count()).select_from(Case)) == 1
        assert all(m.state == "captured" and m.payload["external_sent"] is False for m in mail)
    base = f"/operator/v2/businesses/{p['scope'].business_id}/mail"
    listed = await p["client"].get(base+"?case_id="+initial.result["case_id"], headers=p["auth"])
    assert listed.status_code == 200, listed.text
    view = listed.json()
    assert view["contract_version"] == "mail-view.v1" and listed.headers["cache-control"] == "private, no-store"
    assert {r["mail_id"] for r in view["data"]["items"]} == {m.id for m in mail}
    assert all(r["case_id"] == initial.result["case_id"] and r["state"] == "captured" and r["synthetic"]
        for r in view["data"]["items"])
    for original in mail:
        detail = await p["client"].get(base+"/"+original.id, headers=p["auth"])
        assert detail.status_code == 200, detail.text
        row = detail.json()["data"]
        assert (row["business_id"], row["case_id"], row["mail_id"], row["body"], row["direction"], row["state"]) == (
            p["scope"].business_id, initial.result["case_id"], original.id, original.payload["body"], original.direction, "captured")
        assert row["translation"]["status"] in {"missing", "unavailable"}
        assert row["translation"]["body"] is None
    assert (await p["client"].get(base+"?case_id="+str(uuid4()), headers=p["auth"])).status_code == 404
    assert (await p["client"].get(base+"/"+str(uuid4()), headers=p["auth"])).status_code == 404
    foreign = f"/operator/v2/businesses/{uuid4()}/mail"
    assert (await p["client"].get(foreign+"/"+initial.result["mail_id"], headers=p["auth"])).status_code == 404
    from pinet_core.acquisition import work_config
    from pinet_core.control_api import app
    await work_config.start(app, db)
    snapshot = await p["client"].get(f"/operator/v2/businesses/{p['scope'].business_id}/acquisition-correspondence",
        headers=p["auth"])
    assert snapshot.status_code == 200, snapshot.text
    projection = snapshot.json()["data"]
    assert projection["external_sent"] is False and projection["synthetic"] is True
    assert projection["counts"]["outbound_captured"] == 2 and projection["counts"]["inbound_captured"] == 1
    assert projection["threads"] == [{"thread_id": wire["thread_id"], "case_id": initial.result["case_id"],
        "revision": task.result["receipt"]["revision"], "last_inbound_id": wire["inbound_id"]}]
    assert await reply_submit(p, wire) == task_id
    assert not await worker.execute_once(fake, kind=REPLY_KIND)
    with pytest.raises(RunnerError) as failure:
        await reply_submit(p, {**wire, "request_id": str(uuid4())})
    assert failure.value.code in {"acquisition_reply_already_decided", "correspondence_decision_stale"}


@pytest.mark.parametrize("change", ["handoff", "pair", "campaign", "prospect"])
async def test_handoff_tampering_rejected_before_email_io(native, change):
    p, fake = native, ReplyRoles()
    r, _, _ = await research(p, fake)
    value = deepcopy(p["request"])
    value.update(request_id=str(uuid4()), authorization_id=p["pair"]["email_authorization_id"],
        stage="email", native=deepcopy(p["pair"]), handoff=deepcopy(r.result["handoff"]))
    if change == "handoff":
        value["handoff"]["output_sha256"] = "0"*64
    elif change == "pair":
        value["native"]["research_fingerprint"] = "0"*64
    elif change == "campaign":
        value["campaign"]["max_model_calls"] = Campaign.model_validate(value["campaign"]).max_model_calls + 1
    else:
        value["prospect"]["name"] = "Altered prospect"
    with pytest.raises(RunnerError):
        await submit(p, value)
    assert fake.calls == ["researcher", "reviewer"]


async def retained(p, task_id):
    from pinet_core.acquisition.model_models import ModelAttempt
    async with AsyncSession(p["admin"]) as tx:
        task = await tx.get(Task, task_id)
        run = await tx.get(TaskRun, task.run_id) if task.run_id else None
        attempts = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task_id)
            .order_by(ModelAttempt.ordinal)))
    return task, run, attempts


@pytest.mark.parametrize("change", ["peer-auth", "peer-config", "grant", "source"])
async def test_late_email_authority_loss_retains_known_usage(native, monkeypatch, change):
    p, fake = native, ReplyRoles()
    r, _, _ = await research(p, fake)
    value = deepcopy(p["request"])
    value.update(request_id=str(uuid4()), authorization_id=p["pair"]["email_authorization_id"],
        stage="email", native=p["pair"], handoff=r.result["handoff"])
    task_id = await submit(p, value)
    async def invalidate(role):
        if role != "writer":
            return
        if change == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
            return
        if change == "peer-config":
            current = await agents.get(p["token"], p["cid"], p["approval"]["agent_id"])
            await agents.revise(p["token"], p["cid"], p["approval"]["agent_id"], Revise(request_id=uuid4(),
                expected_revision=1, configuration={**current["configuration"]["specification"], "name": "Changed peer"}))
            return
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            if change == "peer-auth":
                await tx.execute(update(ModelAuthorization).where(ModelAuthorization.id == p["pair"]["research_authorization_id"])
                    .values(enabled=False))
            else:
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["scope"].business_id,
                    BusinessGrant.environment_id == p["scope"].environment_id).values(enabled=False))
    fake.after = invalidate
    assert await worker.execute_once(fake, kind=KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == run.status == "failed" and task.result is None
    assert [a.role for a in attempts] == ["writer"] and attempts[0].usage["tokens"]["input_tokens"] == 5
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == 0
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.business_id == p["scope"].business_id)) == 0


@pytest.mark.parametrize("known", [True, False])
async def test_reply_cancellation_retains_charge_without_outbound(native, known):
    p, fake, entered = native, ReplyRoles(), asyncio.Event()
    initial, _ = await email(p, fake)
    wire = await incoming(p, initial)
    task_id = await reply_submit(p, wire)
    async def paused(role, *args):
        assert role == "reply_coordinator"
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError as error:
            if known:
                error.receipt = {"input_tokens": 7}
            raise
    pending = asyncio.create_task(worker.execute_once(paused, kind=REPLY_KIND, task_id=task_id))
    try:
        await asyncio.wait_for(entered.wait(), 45)
    finally:
        pending.cancel()
    with pytest.raises(asyncio.CancelledError):
        await pending
    task, run, attempts = await retained(p, task_id)
    assert task.status == run.status == "failed" and task.result is None
    assert len(attempts) == 1 and attempts[0].state == "failed" and attempts[0].output is None
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == (0 if known else 1)
    assert run.usage.get("input_tokens", 0) == (7 if known else 0)
    assert await reply_submit(p, wire) == task_id
    assert not await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2


async def test_newer_inbound_invalidates_queued_reply_without_io(native):
    p, fake = native, ReplyRoles()
    initial, _ = await email(p, fake)
    wire = await incoming(p, initial)
    task_id = await reply_submit(p, wire)
    await incoming(p, initial, body="Correction: our new requirements supersede the earlier message.")
    assert not await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == "failed" and run is None and attempts == []
    assert fake.calls == ["researcher", "reviewer", "writer", "reviewer"]


async def test_failed_reply_review_has_no_outbound(native):
    p, fake = native, ReplyRoles()
    initial, _ = await email(p, fake)
    fake.approved = False
    task_id = await reply_submit(p, await incoming(p, initial))
    assert await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == "succeeded" and task.result["state"] == "blocked"
    assert len(attempts) == 2 and run.usage["model_calls"] == 2
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2


async def test_canonical_reply_effect_rolls_back_with_task_failure(native, monkeypatch):
    from pinet_core.acquisition.model_reply import ReplyHandler
    from pinet_core.acquisition.work_models import WorkReceipt
    p, fake = native, ReplyRoles()
    initial, _ = await email(p, fake)
    wire = await incoming(p, initial)
    task_id = await reply_submit(p, wire)
    original = ReplyHandler.complete
    async def fail_after_effect(self, tx, task, result):
        completed = await original(self, tx, task, result)
        assert completed["outbound_mail_id"]
        raise LedgerError(409, "synthetic_completion_failure")
    monkeypatch.setattr(ReplyHandler, "complete", fail_after_effect)
    assert await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == run.status == "failed" and task.result is None
    assert task.failure_code == "synthetic_completion_failure"
    assert len(attempts) == 2 and run.usage["input_tokens"] == 10 and run.usage["unknown_usage_calls"] == 0
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        await Correspondence(db).locked(tx, p["scope"], "synthetic-model-native")
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2
        receipts = list(await tx.scalars(select(WorkReceipt)))
        assert any(r.operation == "inbound" for r in receipts)
        assert not any(r.operation == "decision" for r in receipts)


async def test_queued_email_fences_changed_peer_authorization(native):
    p, fake = native, ReplyRoles()
    r, _, _ = await research(p, fake)
    value = deepcopy(p["request"])
    value.update(request_id=str(uuid4()), authorization_id=p["pair"]["email_authorization_id"],
        stage="email", native=p["pair"], handoff=r.result["handoff"])
    task_id = await submit(p, value)
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(ModelAuthorization).where(ModelAuthorization.id == p["pair"]["research_authorization_id"])
            .values(enabled=False))
    assert not await worker.execute_once(fake, kind=KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "failed" and run is None and attempts == []
    assert fake.calls == ["researcher", "reviewer"]


@pytest.mark.parametrize("action", ["stop", "privacy_handoff"])
async def test_native_stop_and_privacy_keep_one_case_without_outbound(native, action):
    from pinet_core.acquisition.work_models import ContactPolicy
    p, fake = native, ReplyRoles()
    initial, _ = await email(p, fake)
    body = "Please stop contacting me." if action == "stop" else "Please verify whether my data was published."
    wire = await incoming(p, initial, body=body)
    task_id = await reply_submit(p, wire)
    async def decision(role, schema, instruction, data, heartbeat, deadline):
        assert role == "reply_coordinator" and await heartbeat()
        return ReplyDecision(classification="refusal" if action == "stop" else "question", action=action,
            subject="", body="", offer_fact_ids=[], privacy_request_quote=body if action == "privacy_handoff" else "",
            reason="Synthetic containment"), {"input_tokens": 5, "output_tokens": 2}
    assert await worker.execute_once(decision, kind=REPLY_KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == "succeeded" and task.result["outbound_mail_id"] is None
    assert task.result["prepared"]["decision"]["action"] == action and run.usage["model_calls"] == 1
    assert len(attempts) == 1
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        await Correspondence(db).locked(tx, p["scope"], "synthetic-model-native")
        assert await tx.scalar(select(func.count()).select_from(Case)) == 1
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2
        policy = await tx.scalar(select(ContactPolicy))
        assert policy.state == ("stopped" if action == "stop" else "hold")
        case = await tx.get(Case, initial.result["case_id"])
        if action == "privacy_handoff":
            assert case.payload["privacy_request"]["status"] == "operator_required"
            assert case.payload["privacy_request"]["request_quote"] == body


async def test_campaign_limit_counts_research_email_and_reply(native):
    p, fake = native, ReplyRoles()
    p["request"]["campaign"]["max_model_calls"] = 5
    initial, _ = await email(p, fake)
    task_id = await reply_submit(p, await incoming(p, initial))
    assert await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert task.status == "failed" and task.result is None
    assert len(attempts) == run.usage["model_calls"] == 1
    assert fake.calls == ["researcher", "reviewer", "writer", "reviewer", "reply_coordinator"]
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2


async def test_exact_dispatch_leaves_other_queued_target_untouched(native):
    p, fake = native, ReplyRoles()
    first = deepcopy(p["request"])
    first.update(stage="research", native=p["pair"])
    first["campaign"]["mode"] = "research_only"
    first_id = await submit(p, first)
    second = deepcopy(first)
    second["request_id"] = str(uuid4())
    second["prospect"]["organization_key"] = "second-known-synthetic"
    second_id = await submit(p, second)
    assert await worker.execute_once(fake, kind=KIND, task_id=second_id)
    task, run, attempts = await retained(p, first_id)
    assert task.status == "queued" and run is None and attempts == []
    assert (await retained(p, second_id))[0].status == "succeeded"


async def test_peer_revocation_after_last_git_wait_is_fenced(native, monkeypatch):
    from pinet_core.acquisition import native_chain
    p, fake, armed = native, ReplyRoles(), False
    r, _, _ = await research(p, fake)
    value = deepcopy(p["request"])
    value.update(request_id=str(uuid4()), authorization_id=p["pair"]["email_authorization_id"],
        stage="email", native=p["pair"], handoff=r.result["handoff"])
    task_id = await submit(p, value)
    async def arm(role):
        nonlocal armed
        if role == "writer":
            armed = True
    fake.after = arm
    original = native_chain.final_fence
    original_git = native_chain.authority.module_admin.execution_current
    async def final(tx, value, work):
        nonlocal armed
        if not armed:
            return await original(tx, value, work)
        async def last_wait(source):
            nonlocal armed
            await original_git(source)
            async with AsyncSession(p["admin"]) as admin, admin.begin():
                await admin.execute(update(ModelAuthorization).where(ModelAuthorization.id == p["pair"]["research_authorization_id"])
                    .values(enabled=False))
            armed = False
        monkeypatch.setattr(native_chain.authority.module_admin, "execution_current", last_wait)
        try:
            return await original(tx, value, work)
        finally:
            monkeypatch.setattr(native_chain.authority.module_admin, "execution_current", original_git)
    monkeypatch.setattr(native_chain, "final_fence", final)
    assert await worker.execute_once(fake, kind=KIND, task_id=task_id)
    task, run, attempts = await retained(p, task_id)
    assert not armed and task.status == run.status == "failed" and task.result is None
    assert len(attempts) == 1 and run.usage["input_tokens"] == 5 and run.usage["unknown_usage_calls"] == 0


async def test_known_lab_workflow_uses_native_tasks_and_independent_auxiliaries(native):
    from pinet_core.acquisition import native_calibration
    from pinet_core.acquisition.dialogue_lab import GRADE_INSTRUCTION, DialogueGrade, RecipientTurn, run_case
    from pinet_core.acquisition.engine import fingerprint
    from pinet_core.models import utcnow
    p, fake = native, ReplyRoles()
    p["request"]["prospect"].update(contact_verified=True, contact_source_id="listing",
        contact_basis_verified=True, provider_allowed=True)
    cases = [{"id": "known-"+str(n), "split": "train" if n < 3 else "holdout", "archetype": "known-inert",
        "prospect": p["request"]["prospect"], "recipient": p["request"]["recipient"],
        "persona": "Known synthetic infrastructure scenario "+str(n), "expected_classifications": ["question"],
        "expected_initial": "draft_ready"} for n in range(6)]
    async with AsyncSession(p["admin"]) as tx:
        bindings = {role: {key: getattr(await tx.get(ModelAuthorization, p["pair"][role+"_authorization_id"]), key)
            for key in ("id", "fingerprint", "agent_id", "config_id", "config_revision", "config_sha256")}
            for role in ("research", "email")}
    frozen = {"version": "acquisition-native-calibration.v1", "source_revision": settings().control_source_revision,
        "native": p["pair"], "bindings": bindings, "campaign": p["request"]["campaign"], "cases": cases,
        "corpus_sha256": fingerprint(cases), "evaluator_hash": fingerprint(GRADE_INSTRUCTION)}
    folder = native_calibration.ROOT/("known-native-"+uuid4().hex)
    folder.mkdir()
    path = folder/"known-manifest.json"
    path.write_text(json.dumps(frozen), encoding="utf-8")
    ref = {"manifest_path": str(path), "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "case_id": "known-0"}
    async def dispatch(identity, kind):
        assert await worker.execute_once(fake, kind=kind, task_id=identity)
    workflow = native_calibration.NativeWorkflow(token=p["token"], reference=ref, episode_id=uuid4(), dispatch=dispatch)
    class Persona:
        async def ask(self, schema, instruction, data):
            assert schema is RecipientTurn and data["private_persona"] == cases[0]["persona"]
            return RecipientTurn(event="reply", body="Could you clarify the requirements?", finished=True)
    class Evaluator:
        async def ask(self, schema, instruction, data):
            assert schema is DialogueGrade and len(data["native_receipts"]) == 3
            assert [r["execution"]["usage"]["model_calls"] for r in data["native_receipts"]] == [2, 2, 2]
            return DialogueGrade(factual=True, appropriate=True, respects_stop=True, follows_corrected_need=True,
                no_false_activation=True, reason="Known inert infrastructure assertion only")
    row = await run_case(Campaign.model_validate(frozen["campaign"]), workflow.case, None, Persona(), Evaluator(),
        folder/"episode", utcnow(), max_turns=1, workflow=workflow)
    assert row["passed"], row.get("failure")
    assert len(row["native_receipts"]) == 3 and len(fake.calls) == 6
    assert len({r["task_id"] for r in row["native_receipts"]}) == 3
    assert len({r["result"].get("case_id", r["result"].get("receipt", {}).get("case_id"))
        for r in row["native_receipts"] if r["phase"] != "research"}) == 1
    before = len(fake.calls)
    await workflow.prepare(Campaign.model_validate(frozen["campaign"]), workflow.case, utcnow())
    assert len(fake.calls) == before
