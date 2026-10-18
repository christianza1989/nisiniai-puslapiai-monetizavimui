"""Dedicated retained0050 PG; genuine six Configs/common worker, inert providers."""

import asyncio
import os
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_acquisition_model_prepare_pg import stored
from test_acquisition_native_chain_pg import incoming
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import agent_role_tasks, model_admin, model_tasks
from pinet_core.acquisition.agent_role_contract import KIND, OUTPUT, PURPOSE, ROLES
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError

pytestmark = pytest.mark.skipif(
    os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit separate retained0050 QA database, inert providers only",
)


@pytest.fixture
async def six(external_native):  # noqa: F811
    p = external_native
    p["team"], p["role_approvals"], p["saved_roles"] = {}, {}, {}
    base_spec = p["email"]["configuration"]["specification"]
    for role in ROLES:
        response = await p["client"].post(
            f"/customer/v2/businesses/{p['scope'].business_id}/agents",
            headers=p["auth"],
            json={
                "request_id": str(uuid4()),
                "source_binding_id": p["source"]["binding_id"],
                "purpose": PURPOSE[role],
                "configuration": {**base_spec, "name": "Exact saved " + role},
            },
        )
        assert response.status_code == 201, response.text
        saved = response.json()["data"]
        request = p["approval"] | {
            "authorization_id": str(uuid4()),
            "agent_id": saved["agent"]["agent_id"],
            "expected_config_revision": 1,
            "expected_config_sha256": saved["configuration"]["sha256"],
            "execution_role": role,
            "maximum_attempts": 4,
        }
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            result = await model_admin.approve(tx, request)
        p["team"][role] = {
            "authorization_id": result["after"]["id"],
            "fingerprint": result["after"]["fingerprint"],
        }
        p["role_approvals"][role], p["saved_roles"][role] = request, saved
    p["request"]["campaign"]["campaign_id"] = "fresh-six-role-campaign"
    p["request"]["campaign"]["max_model_calls"] = 30
    return p


def request(p, role="coordinator", parent=None, mail=None):
    return {
        "request_id": str(uuid4()),
        "authorization_id": p["team"][role]["authorization_id"],
        "role": role,
        "team": p["team"],
        "campaign": p["request"]["campaign"],
        "prospect": p["request"]["prospect"],
        "recipient": p["request"]["recipient"],
        "job_text": "Clarify the original requirements from approved evidence.",
        "parents": [parent["handoff"]] if parent else [],
        "mail": mail,
    }


async def submit(p, value):
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        task = await agent_role_tasks.submit(tx, actor, value)
        return task.id


class Roles:
    def __init__(self, *, after=None, wrong_artifact=False, accepted=True, cancel=False):
        self.calls, self.after = [], after
        self.wrong_artifact, self.accepted, self.cancel = wrong_artifact, accepted, cancel

    async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
        assert await heartbeat()
        assert schema is OUTPUT[role]
        assert data["agent_specification"]["name"] == "Exact saved " + role
        assert data["reviewed_business_source"]["facts"][0]["id"] == "pilot"
        self.calls.append(role)
        if self.after:
            await self.after(role)
        if self.cancel:
            raise asyncio.CancelledError()
        common = {
            "fit": "yes",
            "intent": "possible",
            "reasons": "Original source supports the requirement.",
            "evidence_ids": ["listing"],
            "offer_fact_ids": [],
            "next_action": "research",
            "subject": "",
            "body": "",
        }
        if role == "research":
            value = common
        elif role == "qualification":
            value = {
                "fit": "yes",
                "intent": "possible",
                "eligible_for_draft": True,
                "evidence_ids": ["listing"],
                "reason": "Independent evidence check.",
            }
        elif role == "writer":
            value = common | {
                "next_action": "draft",
                "subject": "Requirements",
                "body": "Would you like to clarify the approved requirements enquiry?",
                "offer_fact_ids": ["pilot"],
            }
        elif role == "quality":
            value = {
                "factual": self.accepted,
                "relevant": True,
                "one_clear_next_step": True,
                "no_unverified_promises": True,
                "no_source_instructions": True,
                "reason": "Independent exact-copy check.",
                "artifact_sha256": "f" * 64 if self.wrong_artifact else data["artifact_sha256"],
            }
        elif role == "reply":
            value = {
                "classification": "question",
                "action": "reply",
                "subject": "Re: requirements",
                "body": "The approved requirements enquiry is available. Which detail should we clarify?",
                "offer_fact_ids": ["pilot"],
                "evidence_ids": ["listing"],
                "reason": "Answer the current original question.",
            }
        else:
            value = {
                "action": "stop" if data["parents"] else "route",
                "next_role": None if data["parents"] else "research",
                "reason": "Only bounded authorized routing.",
            }
        return schema.model_validate(value), {"input_tokens": 5, "output_tokens": 2}


async def execute(p, fake, role, parent=None, mail=None):
    value = request(p, role, parent, mail)
    identity = await submit(p, value)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == "succeeded", task.failure_code
    assert run.status == "succeeded" and len(attempts) == 1 and attempts[0].role == role
    assert attempts[0].authorization_id == p["team"][role]["authorization_id"]
    assert task.result["agent_id"] == p["saved_roles"][role]["agent"]["agent_id"]
    return task, value


async def initial(p, fake):
    previous = None
    for role in ("coordinator", "research", "qualification", "writer", "quality"):
        previous, _ = await execute(p, fake, role, previous.result if previous else None)
    return previous


async def test_six_exact_configs_one_reply_case_and_no_role_alias(six):
    p, fake = six, Roles()
    quality = await initial(p, fake)
    assert quality.result["correspondence"]["state"] == "captured"
    # Use the maintained synthetic inbound capture, with genuine native Case/Mail.
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    inbound = await incoming(p, standin)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    reply, _ = await execute(p, fake, "reply", quality.result, mail)
    reviewed, _ = await execute(p, fake, "quality", reply.result)
    final, value = await execute(p, fake, "coordinator", reviewed.result)
    assert final.result["output"]["action"] == "stop"
    assert reviewed.result["correspondence"]["outbound_mail_id"]
    assert fake.calls == [
        "coordinator",
        "research",
        "qualification",
        "writer",
        "quality",
        "reply",
        "quality",
        "coordinator",
    ]
    assert await submit(p, value) == final.id and len(fake.calls) == 8
    alias = deepcopy(value)
    alias["request_id"] = str(uuid4())
    with pytest.raises(ControlError, match="agent_role_work_retained"):
        await submit(p, alias)
    changed = deepcopy(value)
    changed["job_text"] = "Changed body after review."
    with pytest.raises(ControlError):
        await submit(p, changed)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(Case)) == 1
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 3


async def test_bare_custom_purpose_and_mismatched_role_never_gain_authority(six):
    p = six
    for role in (None, "reply"):
        value = p["role_approvals"]["quality"] | {"authorization_id": str(uuid4()), "execution_role": role}
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            with pytest.raises(ControlError):
                await model_admin.approve(tx, value)


async def test_role_grant_cannot_dispatch_old_prepare_kind(six):
    p = six
    value = p["request"] | {"authorization_id": p["team"]["research"]["authorization_id"]}
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        with pytest.raises(ControlError, match="exact_agent_role_work_required"):
            await model_tasks.submit(tx, actor, value)


@pytest.mark.parametrize("tamper", ["hash", "role", "team"])
async def test_parent_or_peer_tampering_rejected_before_task_dispatch(six, tamper):
    p, fake = six, Roles()
    planned, _ = await execute(p, fake, "coordinator")
    value = request(p, "research", planned.result)
    if tamper == "hash":
        value["parents"][0]["output_sha256"] = "f" * 64
    elif tamper == "role":
        value["parents"][0]["role"] = "quality"
    else:
        value["team"]["quality"]["fingerprint"] = "f" * 64
    with pytest.raises((RunnerError, ValueError)):
        await submit(p, value)
    assert fake.calls == ["coordinator"]


async def test_queued_work_fences_stopped_peer_before_model(six):
    p = six
    identity = await submit(p, request(p))
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        a = await tx.get(ModelAuthorization, p["team"]["quality"]["authorization_id"])
        a.enabled = False
    fake = Roles()
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, _, attempts = await stored(p, identity)
    assert task.status == "failed" and not attempts and not fake.calls


async def test_after_provider_peer_stop_retains_known_charge_no_effect(six):
    p = six

    async def stop(role):
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            a = await tx.get(ModelAuthorization, p["team"]["quality"]["authorization_id"])
            a.enabled = False

    fake = Roles(after=stop)
    identity = await submit(p, request(p))
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == run.status == "failed"
    assert len(attempts) == 1 and attempts[0].state == "failed" and attempts[0].usage["known"] is True
    assert run.usage["model_calls"] == 1 and not task.result


async def test_exact_artifact_review_failure_has_no_capture(six):
    p, fake = six, Roles()
    previous = None
    for role in ("coordinator", "research", "qualification", "writer"):
        previous, _ = await execute(p, fake, role, previous.result if previous else None)
    broken = Roles(wrong_artifact=True)
    identity = await submit(p, request(p, "quality", previous.result))
    assert await worker.execute_once(broken, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == "failed" and attempts[0].usage["known"] is True
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert not list(await tx.scalars(select(Case)))


@pytest.mark.parametrize("known", [True, False])
async def test_cancelled_role_keeps_attempt_charge_and_never_retries(six, known):
    p, entered = six, asyncio.Event()
    value = request(p)
    identity = await submit(p, value)

    async def paused(*args):
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError as error:
            if known:
                error.receipt = {"input_tokens": 7}
            raise

    pending = asyncio.create_task(worker.execute_once(paused, kind=KIND, task_id=identity))
    try:
        await asyncio.wait_for(entered.wait(), 45)
    finally:
        pending.cancel()
    with pytest.raises(asyncio.CancelledError):
        await pending
    task, run, attempts = await stored(p, identity)
    assert task.status == run.status == "failed" and task.result is None
    assert len(attempts) == 1 and attempts[0].state == "failed" and attempts[0].output is None
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == (0 if known else 1)
    assert run.usage.get("input_tokens", 0) == (7 if known else 0)
    assert await submit(p, value) == identity
    fake = Roles()
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    assert not fake.calls


async def test_newer_inbound_stops_queued_own_reply_before_provider(six):
    p, fake = six, Roles()
    quality = await initial(p, fake)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    inbound = await incoming(p, standin)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    identity = await submit(p, request(p, "reply", quality.result, mail))
    await incoming(p, standin, body="Correction: please use the new requirements instead.")
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == "failed" and run is None and not attempts
    assert fake.calls == ["coordinator", "research", "qualification", "writer", "quality"]


@pytest.mark.parametrize("privacy", [False, True])
async def test_rejected_own_reply_quality_preserves_stop_without_outbound(six, privacy):
    from pinet_core.acquisition.work_models import ContactPolicy

    p, fake = six, Roles()
    quality = await initial(p, fake)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    body = (
        "Do not contact me again. Please explain removal of my data."
        if privacy
        else "Do not contact me again."
    )
    inbound = await incoming(p, standin, body=body)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}

    async def refusing(role, schema, instruction, data, heartbeat, deadline):
        output, usage = await fake(role, schema, instruction, data, heartbeat, deadline)
        if role == "reply":
            output = schema.model_validate(
                {
                    "classification": "refusal",
                    "action": "privacy_reply" if privacy else "stop",
                    "subject": "Contact request" if privacy else "",
                    "body": "Please contact the operator for unconfirmed removal details." if privacy else "",
                    "offer_fact_ids": [],
                    "evidence_ids": ["listing"] if privacy else [],
                    "privacy_request_quote": body if privacy else "",
                    "reason": "Respect the original refusal.",
                }
            )
        return output, usage

    reply, _ = await execute(p, refusing, "reply", quality.result, mail)
    fake.accepted = False
    reviewed, _ = await execute(p, fake, "quality", reply.result)
    assert reviewed.result["output"]["factual"] is False
    assert reviewed.result["correspondence"]["outbound_mail_id"] is None
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        from pinet_core.acquisition.correspondence import Correspondence

        await Correspondence(db).locked(tx, p["scope"], "synthetic-model-native")
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2
        policies = list(await tx.scalars(select(ContactPolicy)))
        assert len(policies) == 1 and policies[0].state == "stopped"


async def test_own_quality_reply_effect_rolls_back_atomically_with_task_failure(six, monkeypatch):
    from pinet_core.acquisition.agent_role_handler import AgentRoleHandler
    from pinet_core.acquisition.ledger import LedgerError
    from pinet_core.acquisition.work_models import WorkReceipt

    p, fake = six, Roles()
    quality = await initial(p, fake)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    inbound = await incoming(p, standin)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    reply, _ = await execute(p, fake, "reply", quality.result, mail)
    identity = await submit(p, request(p, "quality", reply.result))
    original = AgentRoleHandler.complete

    async def fail_after_effect(self, tx, task, result):
        completed = await original(self, tx, task, result)
        assert completed["correspondence"]["outbound_mail_id"]
        raise LedgerError(409, "synthetic_six_role_completion_failure")

    monkeypatch.setattr(AgentRoleHandler, "complete", fail_after_effect)
    assert await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == run.status == "failed" and task.result is None
    assert len(attempts) == 1 and run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == 0
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        from pinet_core.acquisition.correspondence import Correspondence

        await Correspondence(db).locked(tx, p["scope"], "synthetic-model-native")
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 2
        assert not list(await tx.scalars(select(WorkReceipt).where(WorkReceipt.operation == "decision")))


async def test_queued_six_role_work_honors_shared_native_feature_stop(six, monkeypatch):
    from pinet_core.config import settings

    p, fake = six, Roles()
    identity = await submit(p, request(p))
    monkeypatch.setattr(settings(), "acquisition_native_chain_enabled", False)
    assert not await worker.execute_once(fake, kind=KIND, task_id=identity)
    task, run, attempts = await stored(p, identity)
    assert task.status == "failed" and run is None and not attempts and not fake.calls


async def test_known_sealed_six_role_lab_uses_common_tasks_and_independent_grade(six):
    import hashlib
    import json

    from pinet_core.acquisition import agent_role_calibration, native_calibration
    from pinet_core.acquisition.contracts import Campaign
    from pinet_core.acquisition.dialogue_lab import RecipientTurn, run_case
    from pinet_core.acquisition.engine import fingerprint
    from pinet_core.config import settings
    from pinet_core.models import utcnow

    class CalibratedRoles(Roles):
        async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
            assert "CLOSED SIMULATION" not in instruction
            assert not {"private_persona", "expected_initial", "expected_classifications", "calibration"} & data.keys()
            assert not {"site_id", "campaign_id", "enabled", "max_model_calls"} & data["campaign"].keys()
            assert not {"organization_key", "site_id", "contact_verified"} & data["prospect"].keys()
            assert "sources" not in data["agent_specification"]
            return await super().__call__(role, schema, instruction, data, heartbeat, deadline)

    p, fake = six, CalibratedRoles()
    p["request"]["prospect"].update(
        contact_verified=True, contact_source_id="listing", contact_basis_verified=True, provider_allowed=True
    )
    cases = [
        {
            "id": "known-six-" + str(n),
            "split": "train" if n < 3 else "holdout",
            "archetype": "known-inert",
            "prospect": p["request"]["prospect"],
            "recipient": p["request"]["recipient"],
            "persona": "You are a synthetic holiday-accommodation buyer speaking en. "
            "Keep the initial requirements in the prospect evidence. "
            "In the first and only reply, naturally express: Please clarify requirements for option " + str(n)
            + ". This is one closed laboratory exchange; do not request a second turn.",
            "expected_classifications": ["question"],
            "expected_initial": "draft_ready",
        }
        for n in range(6)
    ]
    async with AsyncSession(p["admin"]) as tx:
        bindings = {
            role: {
                key: getattr(await tx.get(ModelAuthorization, p["team"][role]["authorization_id"]), key)
                for key in (
                    "id",
                    "fingerprint",
                    "agent_id",
                    "config_id",
                    "config_revision",
                    "config_sha256",
                    "execution_role",
                )
            }
            for role in ROLES
        }
    frozen = {
        "version": "acquisition-six-role-calibration.v1",
        "source_revision": settings().control_source_revision,
        "team": p["team"],
        "bindings": bindings,
        "campaign": p["request"]["campaign"],
        "cases": cases,
        "corpus_sha256": fingerprint(cases),
        "evaluator_hash": fingerprint(agent_role_calibration.GRADE),
        "max_turns": 1,
    }
    folder = native_calibration.ROOT / ("known-six-native-" + uuid4().hex)
    folder.mkdir()
    source = folder / "known-source.json"
    source.write_text(
        json.dumps(
            {"synthetic": True, "now": utcnow().isoformat(), "campaign": frozen["campaign"], "cases": cases}
        ),
        encoding="utf-8",
    )
    frozen["protected_source"] = {
        "path": str(source),
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    }
    path = folder / "known-manifest.json"
    path.write_text(json.dumps(frozen), encoding="utf-8")
    ref = {
        "manifest_path": str(path),
        "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "case_id": "known-six-0",
    }

    async def dispatch(identity, kind):
        assert kind == KIND and await worker.execute_once(fake, kind=kind, task_id=identity)

    workflow = agent_role_calibration.SixRoleWorkflow(
        token=p["token"], reference=ref, episode_id=uuid4(), dispatch=dispatch
    )

    class Persona:
        calls = 0

        async def ask(self, schema, instruction, data):
            self.calls += 1
            assert schema is RecipientTurn
            assert "private_persona" not in data and "synthetic" not in instruction
            assert data["customer_context"]["current_need"] == "Please clarify requirements for option 0."
            return RecipientTurn(event="reply", body="Could you clarify the requirements?", finished=True)

    class Evaluator:
        calls = 0

        async def ask(self, schema, instruction, data):
            self.calls += 1
            assert schema is agent_role_calibration.SixRoleGrade and len(data["native_receipts"]) == 8
            assert {row["role"] for row in data["native_receipts"]} == set(ROLES)
            assert all(row["execution"]["usage"]["usage_complete"] for row in data["native_receipts"])
            # Input metadata comes from the canonical owned retained request,
            # never the caller's raw input or private persona/expected labels.
            from pinet_core.creation.service import digest

            previous = None
            for row in data["native_receipts"]:
                async with scope(token=token_hash(p["token"])) as tx:
                    actor = await customer_session(tx, p["token"])
                    typed = await agent_role_tasks.read_request(tx, actor, row["task_id"])
                    from pinet_core.acquisition.model_models import ModelTaskBinding

                    bound = await tx.get(ModelTaskBinding, row["task_id"])
                assert row["input_sha256"] == digest(typed.model_dump(mode="json")) == bound.input_sha256
                assert row["consumed_parents"] == [parent.model_dump(mode="json") for parent in typed.parents]
                assert row["consumed_parents"] == ([previous] if previous else [])
                assert row["result"]["handoff"]["task_id"] == row["task_id"]
                assert row["result"]["handoff"]["run_id"] == row["execution"]["run_id"]
                assert not {"input", "request", "private_persona", "expected_initial"} & row.keys()
                previous = row["result"]["handoff"]
            return schema(
                factual=True,
                appropriate=True,
                respects_stop=True,
                follows_corrected_need=True,
                no_false_activation=True,
                reason="Known inert native infrastructure assertion.",
                role_status={role: "PASS" for role in ROLES},
                na_reasons={},
            )

    persona, evaluator = Persona(), Evaluator()
    row = await run_case(
        Campaign.model_validate(frozen["campaign"]),
        workflow.case,
        None,
        persona,
        evaluator,
        folder / "episode",
        utcnow(),
        max_turns=1,
        workflow=workflow,
    )
    assert row["passed"] and row["grade_pass"] and len(row["native_receipts"]) == 8
    assert len(fake.calls) == 8 and persona.calls == evaluator.calls == 1
    # Sealed custody references cannot be renamed on the same consumed grants.
    alias_path = folder / "alias-manifest.json"
    alias_path.write_bytes(path.read_bytes())
    alias_ref = ref | {"manifest_path": str(alias_path)}
    alias = agent_role_calibration.SixRoleWorkflow(
        token=p["token"], reference=alias_ref, episode_id=uuid4(), dispatch=dispatch
    )
    with pytest.raises(RunnerError, match="agent_role_calibration_authorization_retained"):
        await alias.prepare(Campaign.model_validate(frozen["campaign"]), alias.case, utcnow())
    assert len(fake.calls) == 8
