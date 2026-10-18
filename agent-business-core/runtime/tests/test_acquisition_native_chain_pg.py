"""Dedicated retained PG, real owner/config/common-worker/Case; inert providers only."""
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
from pinet_core.acquisition.correspondence import Correspondence
from pinet_core.acquisition.dialogue import ReplyDecision
from pinet_core.acquisition.model_contract import KIND, REPLY_KIND
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.acquisition.work_interfaces import InboundCapture
from pinet_core.acquisition.work_models import MailBinding
from pinet_core.config import settings
from pinet_core.control.routes import scope, token_hash
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.wire import Create
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError

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


async def incoming(p, initial, *, body="Could you help clarify our requirements?"):
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        parent = await tx.get(MailMessage, initial.result["mail_id"])
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
        value["campaign"]["max_model_calls"] += 1
    else:
        value["prospect"]["name"] = "Altered prospect"
    with pytest.raises(RunnerError):
        await submit(p, value)
    assert fake.calls == ["researcher", "reviewer"]


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
