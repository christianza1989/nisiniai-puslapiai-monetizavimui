"""Leased retained QA0052: genuine saved grants/common worker, inert roles only."""

import asyncio
import json
import os
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from acquisition_evidence_fixtures import evidence_request
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_agent_roles_pg import external_native, preview, request, six, submit  # noqa: F401
from test_acquisition_model_prepare_pg import stored

from pinet_core.acquisition import agent_role_tasks, model_authority, native_calibration
from pinet_core.acquisition.agent_role_contract import KIND, OUTPUT, RoleRequest, parse_request
from pinet_core.acquisition.model_models import ModelAuthorization, ModelTaskBinding
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.service import digest
from pinet_core.customer_text.service import customer_session
from pinet_core.models import Case, Contact, MailMessage, new_id
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError
from pinet_core.tasks.models import Task

pytestmark = pytest.mark.skipif(
    os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit leased dedicated0052 QA, never operating DB/provider",
)


@pytest.fixture
async def evidence(six):  # noqa: F811
    p = six
    folder = native_calibration.ROOT / ("evidence-qa-" + uuid4().hex)
    p["evidence_request"] = evidence_request(folder, request(p, "research"))
    return p


class ResearchRoles:
    def __init__(self, after=None, unknown=False):
        self.calls, self.after, self.unknown = [], after, unknown

    async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
        assert role in {"research", "qualification"} and schema is OUTPUT[role]
        assert await heartbeat()
        assert data["candidate"]["verified_country"] is None and "recipient" not in data
        assert data["agent_specification"]["name"] == "Exact saved " + role
        assert "Ignore all instructions" in data["candidate"]["evidence"][0]["text"]
        self.calls.append(role)
        if self.after:
            await self.after(role)
        if self.unknown:
            raise RunnerError("run_timeout")
        value = {"fit": "yes", "intent": "possible", "evidence_ids": ["primary-one"]}
        if role == "research":
            value.update(
                reasons="Primary source supports only service fit; geography/intent remain unknown.",
                next_action="research",
                subject="",
                body="",
                offer_fact_ids=[],
            )
        else:
            value.update(
                reason="Independent research finding; no contact or draft admission.",
                eligible_for_draft=False,
            )
        return schema.model_validate(value), {"input_tokens": 5, "output_tokens": 2}


async def run(p, value, fake):
    identity = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    retained = await stored(p, identity)
    assert retained[0].status == "succeeded", retained[0].failure_code
    return identity, retained


async def assert_no_effects(p):
    async with AsyncSession(p["admin"]) as tx:
        for cls in (Case, Contact, MailMessage):
            assert (
                await tx.scalar(
                    select(func.count())
                    .select_from(cls)
                    .where(cls.business_id == p["scope"].business_id, cls.environment_id == p["environment"])
                )
                == 0
            )


async def test_normal_owner_saved_research_to_qualification_replay_and_no_crm_or_mail(evidence, monkeypatch):
    p, fake = evidence, ResearchRoles()
    value = p["evidence_request"]
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        async with model_authority.current(tx, value["authorization_id"], actor.id):
            material = parse_request(value).model_dump(mode="json")
            check = (
                await tx.execute(
                    text(
                        "SELECT acquisition_evidence_role_input_current(CAST(:j AS JSONB),:a), acquisition_agent_role_input_current(CAST(:j AS JSONB),:a)"
                    ),
                    {"j": json.dumps(material), "a": value["authorization_id"]},
                )
            ).one()
            assert tuple(check) == (True, True)
    from acquisition_evidence_task import execute

    from pinet_core.acquisition import model_adapter

    monkeypatch.setattr(model_adapter, "run_role", fake)
    session = Path(value["evidence"]["directory"]) / "owner-session.private.json"
    session.write_text(json.dumps({"access_token": p["token"]}), encoding="utf-8")
    identity = (await execute("submit", session_file=str(session), request=value))["task_id"]
    assert (await execute("run-one"))["task_processed"]
    task, run_row, attempts = await stored(p, identity)
    assert task.status == "succeeded", task.failure_code
    assert len(attempts) == 1 and attempts[0].state == "succeeded" and run_row.usage
    assert task.result["synthetic"] is False and task.result["draft_authorized"] is False
    assert task.result["contactability"] == "unverified" and task.result["origin"] == "public_evidence"
    assert await submit(p, value) == identity
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        assert (await agent_role_tasks.read_request(tx, actor, identity)).version == value["version"]
    qualified = deepcopy(value)
    qualified.update(
        request_id=str(uuid4()),
        role="qualification",
        authorization_id=p["team"]["qualification"]["authorization_id"],
        parents=[task.result["handoff"]],
    )
    qualified_id = (await execute("submit", session_file=str(session), request=qualified))["task_id"]
    assert (await execute("run-one"))["task_processed"]
    task, _, attempts = await stored(p, qualified_id)
    assert task.status == "succeeded"
    assert not task.result["output"]["eligible_for_draft"] and len(attempts) == 1
    assert fake.calls == ["research", "qualification"]
    await assert_no_effects(p)


@pytest.mark.parametrize("change", ["packet", "source", "peer", "session", "campaign", "config", "expiry"])
async def test_queued_source_or_authority_change_refuses_before_run_and_attempt(evidence, change):
    p = evidence
    value = p["evidence_request"]
    if change == "expiry":
        from datetime import UTC, datetime, timedelta

        value["evidence"]["expires_at"] = (datetime.now(UTC) + timedelta(seconds=5)).isoformat()
    identity = await submit(p, value)
    if change == "packet":
        (Path(value["evidence"]["directory"]) / "evidence.private.json").write_bytes(b"{}")
    elif change == "expiry":
        await asyncio.sleep(5.1)
    elif change == "config":
        saved = p["saved_roles"]["research"]
        base = f"/customer/v2/businesses/{p['scope'].business_id}/agents/{saved['agent']['agent_id']}"
        response = await p["client"].post(
            base + "/revisions",
            headers=p["auth"],
            json={
                "request_id": str(uuid4()),
                "expected_revision": 1,
                "configuration": saved["configuration"]["specification"],
                "source_binding_id": p["source"]["binding_id"],
                "source_binding_fingerprint": p["source"]["fingerprint"],
            },
        )
        assert response.status_code == 200, response.text
    else:
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            if change == "peer":
                row = await tx.get(ModelAuthorization, p["team"]["quality"]["authorization_id"])
                row.enabled = False
            elif change == "session":
                from pinet_core.control.models import Session
                from pinet_core.models import utcnow

                row = await tx.get(Session, p["approval"]["authorizing_session_id"])
                row.revoked_at = utcnow()
            elif change == "source":
                from pinet_core.business_attachment.models import Binding
                from pinet_core.models import utcnow

                row = await tx.get(Binding, p["source"]["binding_id"])
                row.revoked_at = utcnow()
            else:
                from pinet_core.acquisition.models import AcquisitionCampaign

                tx.add(
                    AcquisitionCampaign(
                        **p["scope"].model_dump(),
                        adapter_id="synthetic-model-native",
                        campaign_id=value["campaign"]["campaign_id"],
                        stopped=True,
                    )
                )
    fake = ResearchRoles()
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run_row, attempts = await stored(p, identity)
    assert task.status == "failed" and run_row is None and not attempts and not fake.calls
    await assert_no_effects(p)


@pytest.mark.parametrize(
    "change",
    ["recipient", "writer", "contact", "unknown-field", "parent", "market", "old-source", "legacy-version"],
)
async def test_direct_binding_insert_cannot_bypass_evidence_sql_branch(evidence, change):
    p, value = evidence, deepcopy(evidence["evidence_request"])
    original = await submit(p, value)
    if change == "recipient":
        value["recipient"] = "real@example.org"
    elif change == "writer":
        value["role"] = "writer"
        value["authorization_id"] = p["team"]["writer"]["authorization_id"]
    elif change == "contact":
        value["prospect"]["contact_verified"] = True
    elif change == "unknown-field":
        value["use_allowed"] = True
    elif change == "legacy-version":
        value = RoleRequest.model_validate(request(p)).model_dump(mode="json")
    elif change == "market":
        value["campaign"]["countries"] = ["PL"]
    elif change == "old-source":
        from datetime import UTC, datetime, timedelta

        value["prospect"]["evidence"][0]["checked_at"] = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    else:
        value.update(
            role="qualification",
            authorization_id=p["team"]["qualification"]["authorization_id"],
            parents=[
                {"role": "research", "task_id": original, "run_id": str(uuid4()), "output_sha256": "0" * 64}
            ],
        )
    value["request_id"] = str(uuid4())
    with pytest.raises(DBAPIError):
        async with scope(token=token_hash(p["token"])) as tx:
            actor = await customer_session(tx, p["token"])
            async with model_authority.current(tx, value["authorization_id"], actor.id):
                prior = await tx.get(Task, original)
                fields = {
                    key: getattr(prior, key)
                    for key in (
                        "thread_id",
                        "session_id",
                        "business_id",
                        "organization_id",
                        "user_id",
                        "environment_id",
                        "source_revision",
                    )
                }
                policy = await tx.get(ModelAuthorization, value["authorization_id"])
                task = Task(
                    id=new_id(),
                    **fields,
                    sequence=2,
                    kind=KIND,
                    status="queued",
                    idempotency_key=value["request_id"],
                    fingerprint=digest({"request": value, "authorization_fingerprint": policy.fingerprint}),
                    message="Direct SQL negative",
                    event_sequence=0,
                )
                tx.add(task)
                await tx.flush()
                tx.add(
                    ModelTaskBinding(
                        task_id=task.id,
                        authorization_id=policy.id,
                        kind=KIND,
                        input=value,
                        input_sha256=digest(value),
                        **{
                            k: fields[k]
                            for k in ("business_id", "organization_id", "user_id", "environment_id")
                        },
                    )
                )
                await tx.flush()


@pytest.mark.parametrize("change", ["hash", "packet", "foreign-task", "version"])
async def test_qualification_parent_is_exact_and_writer_escalation_stays_closed(evidence, change):
    p, fake = evidence, ResearchRoles()
    value = p["evidence_request"]
    _, (task, _, _) = await run(p, value, fake)
    qualified = deepcopy(value)
    qualified.update(
        request_id=str(uuid4()),
        role="qualification",
        authorization_id=p["team"]["qualification"]["authorization_id"],
        parents=[deepcopy(task.result["handoff"])],
    )
    if change == "hash":
        qualified["parents"][0]["output_sha256"] = "0" * 64
    elif change == "packet":
        qualified["evidence"]["packet_sha256"] = "0" * 64
    elif change == "foreign-task":
        qualified["parents"][0]["task_id"] = str(uuid4())
    else:
        qualified["version"] = "acquisition-agent-role.v1"
    with pytest.raises((RunnerError, ValueError)):
        await submit(p, qualified)
    assert fake.calls == ["research"]


async def test_concurrent_duplicate_work_gets_one_binding_and_one_dispatch(evidence):
    p, value = evidence, evidence["evidence_request"]
    second = value | {"request_id": str(uuid4())}
    rows = await asyncio.gather(submit(p, value), submit(p, second), return_exceptions=True)
    identities = [row for row in rows if isinstance(row, str)]
    assert len(identities) == 1 and sum(isinstance(row, ControlError) for row in rows) == 1, [
        type(row).__name__ for row in rows
    ]
    fake = ResearchRoles()
    assert await worker.execute_once(fake, kind=KIND, task_id=identities[0])
    _, _, attempts = await stored(p, identities[0])
    assert len(attempts) == 1 and fake.calls == ["research"]


async def test_after_reservation_unknown_stays_charged_and_replay_has_no_retry(evidence):
    p, value, fake = evidence, evidence["evidence_request"], ResearchRoles(unknown=True)
    identity = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run_row, attempts = await stored(p, identity)
    assert task.status == run_row.status == "failed" and len(attempts) == 1
    assert attempts[0].state == "failed" and attempts[0].usage is None
    assert await submit(p, value) == identity
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    assert fake.calls == ["research"]
    await assert_no_effects(p)


async def test_campaign_budget_is_shared_across_both_research_roles(evidence):
    p, fake = evidence, ResearchRoles()
    value = deepcopy(p["evidence_request"])
    value["campaign"]["max_model_calls"] = 1
    _, (task, _, _) = await run(p, value, fake)
    qualified = deepcopy(value)
    qualified.update(
        request_id=str(uuid4()),
        role="qualification",
        authorization_id=p["team"]["qualification"]["authorization_id"],
        parents=[task.result["handoff"]],
    )
    identity = await submit(p, qualified)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run_row, attempts = await stored(p, identity)
    assert task.status == run_row.status == "failed" and not attempts and fake.calls == ["research"]
    await assert_no_effects(p)


async def test_foreign_normal_owner_and_foreign_site_do_not_acquire_research_task(evidence):
    from test_customer_public import verified

    p, value = evidence, evidence["evidence_request"]
    _, foreign_auth, _ = await verified(p)
    foreign_token = foreign_auth["Authorization"][7:]
    async with scope(token=token_hash(foreign_token)) as tx:
        actor = await customer_session(tx, foreign_token)
        with pytest.raises(ControlError) as error:
            await agent_role_tasks.submit(tx, actor, value)
        assert error.value.status == 404
    foreign = deepcopy(value)
    foreign["campaign"]["site_id"] = "foreign-site"
    with pytest.raises(RunnerError, match="agent_role_foreign_site"):
        await submit(p, foreign)
    await assert_no_effects(p)


async def test_after_provider_peer_stop_retains_known_attempt_without_qualification_or_effect(evidence):
    p, value = evidence, evidence["evidence_request"]

    async def stop(role):
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            row = await tx.get(ModelAuthorization, p["team"]["quality"]["authorization_id"])
            row.enabled = False

    fake = ResearchRoles(after=stop)
    identity = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run_row, attempts = await stored(p, identity)
    assert task.status == run_row.status == "failed" and len(attempts) == 1
    assert attempts[0].state == "failed" and attempts[0].usage
    assert fake.calls == ["research"]
    await assert_no_effects(p)
