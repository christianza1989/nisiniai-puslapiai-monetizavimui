"""Opt-in retained isolated native owner/Task/Run/Case path, inert model adapter.

Actual provider/calibration/channel and ordinary-browser acceptance are not implied.
"""
import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pinet_core.acquisition.model_models import ModelAttempt, ModelAuthorization
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_private_preview_pg import accepted, path, preview  # noqa: F401
from test_registration_private_continuity_pg import registration_request

from pinet_core.acquisition import (
    model_admin,
    model_handler,
    model_tasks,
    module_admin,
    work_config,
)
from pinet_core.acquisition.contracts import Assessment, Review
from pinet_core.acquisition.interfaces import Scope
from pinet_core.acquisition.model_contract import KIND
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation_registration import admin as registration_admin
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.wire import Create
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import MailMessage, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError
from pinet_core.tasks.models import Task, TaskRun

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit dedicated model0046 QA database required; synthetic history retained")


@pytest.fixture
async def model_pilot(preview, monkeypatch, tmp_path):  # noqa: F811
    c, cfg = preview, settings()
    for key, value in {"customer_agents_enabled": True, "acquisition_model_enabled": True,
            "acquisition_model_runner_enabled": True, "acquisition_capture_enabled": True,
            "acquisition_work_enabled": True, "acquisition_tasks_enabled": False,
            "workspace_team_enabled": False, "smtp_enabled": False, "voice_enabled": False}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(agents, "source_current", lambda: True)  # Explicit synthetic Git identity seam.
    monkeypatch.setattr(module_admin, "git_source_observation",
        lambda root: SimpleNamespace(head=cfg.control_source_revision, porcelain=""))
    monkeypatch.setattr(model_handler.model_adapter, "runner_ready", lambda: True)  # No CLI/provider.
    cid, auth, body, _ = await accepted(c)
    response = await c["client"].post(path(cid), headers=auth, json=body)
    assert response.status_code == 200 and response.json()["data"]["state"] == "private_draft_imported", response.text
    request = await registration_request(c, cid, auth)
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        registered = await registration_admin.provision(tx, environment=c["environment"], **request)
    token = auth["Authorization"][7:]
    specification = {"name": "Synthetic lodging researcher", "goal": "Prepare a factual synthetic lodging enquiry",
        "audience": "Synthetic lodging owners", "inputs": ["Pinned campaign and evidence"],
        "outputs": ["Evidence-based reviewed draft"], "boundaries": ["No sending or supplier promises"],
        "escalation": "Ask the owner for unverified supply facts", "autonomy": "drafts_for_review",
        "sources": ["Synthetic approved pilot facts"], "examples": [{"input": "Explain the pilot",
            "expected": "Reviewed synthetic draft, no delivery claim"}], "unknowns": ["Actual transport unavailable"]}
    saved = await agents.create(token, cid, Create(request_id=uuid4(), purpose="customer_research", configuration=specification))
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        user_id = actor.user_id
    monkeypatch.setattr(cfg, "acquisition_model_actor_ids", [user_id])
    target_scope = Scope(business_id=registered["business_id"], site_id=registered["site_id"],
        environment_id=c["environment"], environment_class="test")
    adapter = "synthetic-model-native"
    folder = Path(work_config.ROOT)/"artifacts"/("model-prepare-"+uuid4().hex)
    folder.mkdir()
    for setting, entry in [
        ("acquisition_capture_config", {"scope": target_scope.model_dump(mode="json"), "adapter_id": adapter,
            "transport_key_id": "native-"+uuid4().hex, "transport_secret": secrets.token_hex(32),
            "recipient_key_id": "recipient-"+uuid4().hex, "recipient_secret": secrets.token_hex(32),
            "permissions": ["capture", "events"]}),
        ("acquisition_work_config", {"scope": target_scope.model_dump(mode="json"), "adapter_id": adapter,
            "inbound_key_id": "inbound-"+uuid4().hex, "inbound_secret": secrets.token_hex(32),
            "permissions": ["inbound-capture"]})]:
        file = folder/(setting+".private.json")
        file.write_text(json.dumps({"entries": [entry]}), encoding="utf-8")
        monkeypatch.setattr(cfg, setting, str(file))
    module_request = {"registration_id": registered["registration_id"],
        "authorizing_session_id": request["authorizing_session_id"], "execution_source_revision": cfg.control_source_revision,
        "adapter_id": adapter, "permissions": ["acquisition.capture", "acquisition.read",
            "acquisition.correspondence", "acquisition.correspondence.read", "acquisition.work"], "duration_seconds": 600}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        module = await module_admin.operate(tx, "approve", module_request)
    approved_request = {key: module_request[key] for key in ("registration_id", "authorizing_session_id", "execution_source_revision")}
    approved_request.update(authorization_id=str(uuid4()), agent_id=str(saved["agent"]["agent_id"]),
        expected_config_revision=1, expected_config_sha256=saved["configuration"]["sha256"],
        expected_module_fingerprint=module["fingerprint"], model_execution_authorized=True,
        maximum_attempts=12, duration_seconds=300)
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        approved = await model_admin.approve(tx, approved_request)
    now = utcnow()
    task_request = {"request_id": str(uuid4()), "authorization_id": approved["after"]["id"],
        "recipient": "owner@example.test", "campaign": {"site_id": registered["site_id"],
            "campaign_id": "synthetic-model-pilot", "mode": "draft_only", "enabled": True,
            "segments": ["lodging"], "countries": ["NL"], "expires_at": (now+timedelta(hours=1)).isoformat(),
            "facts": [{"id": "pilot", "text": "Synthetic requirements enquiry only.", "source": "synthetic-owner",
                "expires_at": (now+timedelta(hours=1)).isoformat()}]},
        "prospect": {"site_id": registered["site_id"], "organization_key": "synthetic-lodging",
            "name": "Synthetic lodging", "role": "buyer", "segment": "lodging", "country": "NL",
            "evidence": [{"id": "listing", "url": "https://example.test", "fact": "Synthetic lodging test listing.",
                "use_allowed": True, "checked_at": now.isoformat(), "expires_at": (now+timedelta(hours=1)).isoformat()}]}}
    return {**c, "cid": cid, "token": token, "auth": auth, "request": task_request,
        "approval": approved_request, "approved": approved, "scope": target_scope, "user_id": user_id}


async def submit(p, value=None):
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        task = await model_tasks.submit(tx, actor, value or p["request"])
        return task.id


class Roles:
    def __init__(self, *, approved=True, fail_role=None, after=None):
        self.calls, self.approved, self.fail_role, self.after = [], approved, fail_role, after

    async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
        assert await heartbeat()
        self.calls.append(role)
        if self.after:
            await self.after(role)
        if self.fail_role == role:
            raise RunnerError("provider_error", {"input_tokens": 5})
        if schema is Review:
            value = Review(factual=self.approved, relevant=True, one_clear_next_step=True,
                no_unverified_promises=self.approved, no_source_instructions=True, reason="Synthetic exact-copy review")
        else:
            assert schema is Assessment
            value = Assessment(fit="yes", intent="possible", reasons="Synthetic evidence supports fit",
                evidence_ids=["listing"], offer_fact_ids=["pilot"], next_action="research" if role == "researcher" else "draft",
                subject="" if role == "researcher" else "Synthetic pilot",
                body="" if role == "researcher" else "Would you like to discuss the synthetic requirements pilot?")
        return value, {"input_tokens": 5, "output_tokens": 2}


async def stored(p, task_id):
    async with scope(user=p["user_id"]) as tx:
        task = await tx.get(Task, task_id)
        run = await tx.get(TaskRun, task.run_id) if task.run_id else None
        attempts = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task_id).order_by(ModelAttempt.ordinal)))
        return task, run, attempts


async def test_native_saved_purpose_task_model_receipts_and_same_case_mail(model_pilot):
    p, fake = model_pilot, Roles()
    task_id = await submit(p)
    assert await submit(p) == task_id
    assert await worker.execute_once(fake, kind=KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "succeeded" and task.result["state"] == "captured"
    assert fake.calls == ["researcher", "writer", "reviewer"] and len(attempts) == 3
    assert all(row.state == "succeeded" and row.output is not None for row in attempts)
    assert run.model == "gpt-6.1-sol" and run.effort == "high" and run.cost_microusd is None
    assert run.usage["input_tokens"] == 15 and run.usage["model_calls"] == 3 and run.usage["unknown_usage_calls"] == 0
    assert await submit(p) == task_id and not await worker.execute_once(fake, kind=KIND)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        mail = await tx.get(MailMessage, task.result["mail_id"])
        assert mail.case_id == task.result["case_id"] and mail.payload["synthetic"] is True
        assert mail.payload["external_sent"] is False and mail.state == "captured"


@pytest.mark.parametrize("scenario", ["review-fail", "provider-fail", "stop-after-model", "grant-revoked", "expired-then-revoked"])
async def test_failed_review_or_late_stop_retains_usage_without_mail(model_pilot, scenario):
    p = model_pilot
    async def stop(role):
        if scenario == "stop-after-model" and role == "writer":
            async with AsyncSession(p["admin"]) as tx, tx.begin():
                await tx.execute(update(ModelAuthorization).where(ModelAuthorization.id == p["approved"]["after"]["id"])
                    .values(enabled=False))
        if scenario == "expired-then-revoked" and role == "writer":
            async with AsyncSession(p["admin"]) as tx, tx.begin():
                await tx.execute(update(Task).where(Task.id == task_id).values(lease_until=utcnow()-timedelta(seconds=1)))
            _, run, _ = await stored(p, task_id)
            assert not await worker.heartbeat(task_id, run.id, user_id=p["user_id"], kind=KIND)
        if scenario in {"grant-revoked", "expired-then-revoked"} and role == "writer":
            async with AsyncSession(p["admin"]) as tx, tx.begin():
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["scope"].business_id,
                    BusinessGrant.environment_id == p["scope"].environment_id).values(enabled=False))
    fake = Roles(approved=scenario != "review-fail", fail_role="writer" if scenario == "provider-fail" else None, after=stop)
    task_id = await submit(p)
    assert await worker.execute_once(fake, kind=KIND)
    if scenario in {"grant-revoked", "expired-then-revoked"}:
        async with AsyncSession(p["admin"]) as tx:
            task = await tx.get(Task, task_id)
            run = await tx.get(TaskRun, task.run_id)
            attempts = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task_id)))
        assert task.status == "failed" and run.status == "failed" and task.result is None
        assert run.usage["model_calls"] == len(attempts)
        assert run.usage["unknown_usage_calls"] == 0
    else:
        task, run, attempts = await stored(p, task_id)
    assert task.status in {"succeeded", "failed"}
    assert task.result is None or task.result["state"] == "blocked"
    assert len(attempts) in {2, 3} and run.usage["input_tokens"] >= 10 and run.cost_microusd is None
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert not list(await tx.scalars(select(MailMessage)))
