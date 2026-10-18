"""Retained isolated0049 real external owner/Binding/native Case path; inert roles."""
import json
import os
import secrets
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_model_prepare_pg import stored, submit
from test_acquisition_native_chain_pg import ReplyRoles, email, incoming, reply_submit
from test_customer_public import verified
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import model_admin, model_handler, module_admin, normal_config
from pinet_core.acquisition.interfaces import Scope
from pinet_core.acquisition.model_contract import KIND, REPLY_KIND
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.business_attachment import admin as sources_admin
from pinet_core.business_attachment import service as sources
from pinet_core.business_attachment.models import Binding
from pinet_core.config import settings
from pinet_core.control.bootstrap import registered_business, registered_grant, registration_lock
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.models import Creation
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents import service as agents
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import Case, MailMessage, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit retained isolated external-binding0049 QA required")


@pytest.fixture
async def external_native(preview, monkeypatch):  # noqa: F811
    c, cfg = preview, settings()
    for key, value in {"customer_agents_enabled": True, "acquisition_model_enabled": True,
            "acquisition_model_runner_enabled": True, "acquisition_native_chain_enabled": True,
            "acquisition_capture_enabled": True, "acquisition_work_enabled": True,
            "acquisition_tasks_enabled": False, "workspace_team_enabled": False,
            "smtp_enabled": False, "voice_enabled": False}.items():
        monkeypatch.setattr(cfg, key, value)
    # Synthetic Git observation only; actual source rows/fingerprints/SQL/RLS are real.
    monkeypatch.setattr(agents, "source_current", lambda: True)
    monkeypatch.setattr(sources, "source_current", lambda: True)
    monkeypatch.setattr(module_admin, "git_source_observation",
        lambda root: SimpleNamespace(head=cfg.control_source_revision, porcelain=""))
    monkeypatch.setattr(model_handler.model_adapter, "runner_ready", lambda: True)
    _, auth, me = await verified(c)
    token, portfolio = auth["Authorization"][7:], me["portfolios"][0]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        user_id, session_id = session.user_id, session.id
    monkeypatch.setattr(cfg, "acquisition_model_actor_ids", [user_id])
    site_id = "external-native-"+uuid4().hex[:20]
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        await registration_lock(tx)
        business = await registered_business(tx, site_id=site_id, canonical_host=site_id+".example.test", allow_new=True)
        await registered_grant(tx, environment=c["environment"], organization_id=portfolio["organization_id"],
            portfolio_id=portfolio["portfolio_id"], business_id=business.id,
            display_name="Synthetic externally prepared business", evidence_revision=cfg.control_source_revision)
        business_id = business.id
    source_request = {"business_id": business_id, "authorizing_session_id": session_id,
        "request_id": str(uuid4()), "source_revision": cfg.control_source_revision, "duration_seconds": 600,
        "payload": {"version": "external-business-source.v1", "external_revision": "synthetic-reviewed-v1",
            "artifact_ref": "private://synthetic/external-native/source-v1", "artifact_sha256": "a"*64,
            "knowledge_sha256": "b"*64, "review_evidence_refs": ["private://synthetic/external-native/review-v1"],
            "facts": [{"id": "pilot", "text": "Synthetic requirements enquiry only.", "source_ref": "synthetic-owner"}]}}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        source = await sources_admin.operate(tx, "approve", source_request)
    spec = {"name": "Synthetic independent email task", "goal": "Clarify synthetic requirements without delivery promises",
        "audience": "Synthetic lodging owners", "inputs": ["Reviewed facts and original evidence"],
        "outputs": ["Reviewed synthetic requirement brief"], "boundaries": ["No sending or delivery promises"],
        "escalation": "Ask the owner for missing supply facts", "autonomy": "drafts_for_review",
        "sources": ["Reviewed external synthetic snapshot"], "examples": [{"input": "Explain the pilot",
            "expected": "Clarify requirements from the reviewed source"}], "unknowns": ["Actual supply unverified"]}
    saved = {}
    for purpose in ("customer_research", "email"):
        result = await c["client"].post(f"/customer/v2/businesses/{business_id}/agents", headers=auth,
            json={"request_id": str(uuid4()), "source_binding_id": source["binding_id"],
                "purpose": purpose, "configuration": spec})
        assert result.status_code == 201, result.text
        saved[purpose] = result.json()["data"]
    target_scope = Scope(business_id=business_id, site_id=site_id,
        environment_id=c["environment"], environment_class="test")
    adapter = "synthetic-model-native"
    folder = normal_config.ROOT/"artifacts"/("external-native-"+uuid4().hex)
    folder.mkdir()
    for setting, entry in [
        ("acquisition_capture_config", {"scope": target_scope.model_dump(mode="json"), "adapter_id": adapter,
            "transport_key_id": "external-"+uuid4().hex, "transport_secret": secrets.token_hex(32),
            "recipient_key_id": "recipient-"+uuid4().hex, "recipient_secret": secrets.token_hex(32),
            "permissions": ["capture", "events"]}),
        ("acquisition_work_config", {"scope": target_scope.model_dump(mode="json"), "adapter_id": adapter,
            "inbound_key_id": "inbound-"+uuid4().hex, "inbound_secret": secrets.token_hex(32),
            "permissions": ["inbound-capture"]})]:
        file = folder/(setting+".private.json")
        file.write_text(json.dumps({"entries": [entry]}), encoding="utf-8")
        monkeypatch.setattr(cfg, setting, str(file))
    authority = {"external_binding_id": source["binding_id"], "authorizing_session_id": session_id,
        "execution_source_revision": cfg.control_source_revision}
    module_request = authority | {"adapter_id": adapter, "permissions": ["acquisition.capture", "acquisition.read",
        "acquisition.correspondence", "acquisition.correspondence.read", "acquisition.work"], "duration_seconds": 600}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        module = await module_admin.operate(tx, "approve", module_request)
    approved, requests = {}, {}
    for purpose, result in saved.items():
        request = authority | {"authorization_id": str(uuid4()), "agent_id": result["agent"]["agent_id"],
            "expected_config_revision": 1, "expected_config_sha256": result["configuration"]["sha256"],
            "expected_module_fingerprint": module["fingerprint"], "model_execution_authorized": True,
            "maximum_attempts": 12, "duration_seconds": 300}
        async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
            approved[purpose] = await model_admin.approve(tx, request)
        requests[purpose] = request
    research = approved["customer_research"]["after"]
    email_auth = approved["email"]["after"]
    pair = {"research_authorization_id": research["id"], "research_fingerprint": research["fingerprint"],
        "email_authorization_id": email_auth["id"], "email_fingerprint": email_auth["fingerprint"]}
    now = utcnow()
    request = {"request_id": str(uuid4()), "authorization_id": research["id"], "recipient": "owner@example.test",
        "campaign": {"site_id": site_id, "campaign_id": "synthetic-external-native", "mode": "draft_only",
            "enabled": True, "segments": ["lodging"], "countries": ["NL"],
            "expires_at": (now+timedelta(hours=1)).isoformat(), "facts": [{"id": "pilot",
                "text": "Synthetic requirements enquiry only.", "source": "synthetic-owner",
                "expires_at": (now+timedelta(hours=1)).isoformat()}]},
        "prospect": {"site_id": site_id, "organization_key": "synthetic-lodging", "name": "Synthetic lodging",
            "role": "buyer", "segment": "lodging", "country": "NL", "evidence": [{"id": "listing",
                "url": "https://lodging.example.test", "fact": "Synthetic lodging request signal.",
                "use_allowed": True, "checked_at": now.isoformat(), "expires_at": (now+timedelta(hours=1)).isoformat()}]}}
    return {**c, "token": token, "auth": auth, "request": request, "scope": target_scope, "user_id": user_id,
        "approval": requests["customer_research"], "approved": approved["customer_research"],
        "email": saved["email"], "pair": pair, "source": source, "source_request": source_request}


class ExternalRoles(ReplyRoles):
    def __init__(self, p, **kwargs):
        super().__init__(**kwargs)
        self.p = p

    async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
        source = data["reviewed_business_source"]
        assert source["binding_id"] == self.p["source"]["binding_id"]
        assert source["binding_fingerprint"] == self.p["source"]["fingerprint"]
        assert source["facts"] == self.p["source_request"]["payload"]["facts"]
        return await super().__call__(role, schema, instruction, data, heartbeat, deadline)


async def revoke(p):
    request = {key: p["source_request"][key] for key in ("business_id", "authorizing_session_id", "source_revision")}
    request.update(binding_id=p["source"]["binding_id"], expected_fingerprint=p["source"]["fingerprint"])
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        await sources_admin.operate(tx, "revoke", request)


def research_request(p):
    request = deepcopy(p["request"])
    request.update(stage="research", native=p["pair"])
    request["campaign"]["mode"] = "research_only"
    return request


async def test_real_external_native_two_replies_one_case_without_creation(external_native):
    p, fake = external_native, ExternalRoles(external_native)
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Creation).where(Creation.user_id == p["user_id"])) == 0
        assert await tx.scalar(select(func.count()).select_from(Registration).where(
            Registration.business_id == p["scope"].business_id)) == 0
    initial, request = await email(p, fake)
    assert await submit(p, request) == initial.id
    wire = await incoming(p, initial)
    task_id = await reply_submit(p, wire)
    assert await worker.execute_once(fake, kind=REPLY_KIND)
    first, _, _ = await stored(p, task_id)
    assert first.status == "succeeded", first.failure_code
    second_wire = await incoming(p, initial, parent_mail_id=first.result["outbound_mail_id"],
        body="Please clarify the larger option.")
    second_id = await reply_submit(p, second_wire)
    assert await worker.execute_once(fake, kind=REPLY_KIND)
    second, run, _ = await stored(p, second_id)
    assert second.status == "succeeded", second.failure_code
    assert run.usage["model_calls"] == 2 and run.usage["unknown_usage_calls"] == 0
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        mail = list(await tx.scalars(select(MailMessage)))
        assert len(mail) == 5 and {row.case_id for row in mail} == {initial.result["case_id"]}
        assert await tx.scalar(select(func.count()).select_from(Case)) == 1
        assert all(row.state == "captured" and not row.payload["external_sent"] for row in mail)
    assert await reply_submit(p, second_wire) == second_id
    await revoke(p)
    # Exact historical replay is still a read, never a new current execution.
    assert await submit(p, request) == initial.id
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        stop = {key: p["approval"][key] for key in (
            "external_binding_id", "authorizing_session_id", "execution_source_revision", "authorization_id")}
        stop["expected_fingerprint"] = p["pair"]["research_fingerprint"]
        result = await model_admin.contain(tx, "stop", stop)
        assert result["after"]["enabled"] is False


async def test_unreviewed_external_fact_denied_before_reservation(external_native):
    request = research_request(external_native)
    request["campaign"]["facts"][0]["text"] = "An unreviewed supply promise"
    with pytest.raises(ControlError, match="acquisition_model_campaign_facts_changed"):
        await submit(external_native, request)


async def test_source_adoption_keeps_agent_and_old_hash_but_invalidates_old_authority(external_native):
    p = external_native
    old = p["email"]
    request = deepcopy(p["source_request"])
    request["request_id"] = str(uuid4())
    request["payload"]["external_revision"] = "synthetic-reviewed-v2"
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        source = await sources_admin.operate(tx, "approve", request)
    base = f"/customer/v2/businesses/{p['scope'].business_id}/agents/{old['agent']['agent_id']}"
    response = await p["client"].post(base+"/revisions", headers=p["auth"], json={
        "request_id": str(uuid4()), "expected_revision": 1, "configuration": old["configuration"]["specification"],
        "source_binding_id": source["binding_id"], "source_binding_fingerprint": source["fingerprint"]})
    assert response.status_code == 200, response.text
    current = response.json()["data"]
    assert current["agent"]["agent_id"] == old["agent"]["agent_id"]
    assert current["agent"]["current_revision"] == 2
    assert current["configuration"]["sha256"] != old["configuration"]["sha256"]
    historical = await p["client"].get(base+"/revisions/1", headers=p["auth"])
    assert historical.status_code == 200, historical.text
    assert historical.json()["data"]["sha256"] == old["configuration"]["sha256"]
    with pytest.raises(ControlError, match="business_source_not_current"):
        await submit(p, research_request(p))
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        inspect = {key: p["approval"][key] for key in (
            "external_binding_id", "authorizing_session_id", "execution_source_revision", "authorization_id")}
        inspect["expected_fingerprint"] = p["pair"]["research_fingerprint"]
        result = await model_admin.contain(tx, "inspect", inspect)
        assert result["after"]["fingerprint"] == p["pair"]["research_fingerprint"]
        assert result["after"]["enabled"] is True


@pytest.mark.parametrize("known", [True, False])
async def test_source_revoked_after_provider_retains_exact_charge_no_effect(external_native, known):
    p = external_native

    class Revoking(ExternalRoles):
        async def __call__(self, role, schema, instruction, data, heartbeat, deadline):
            if role == "researcher":
                result, usage = await super().__call__(role, schema, instruction, data, heartbeat, deadline)
                await revoke(p)
                if not known:
                    raise RunnerError("provider_failed_after_source_loss")
                return result, usage
            raise AssertionError("No further role after lost source authority")

    fake = Revoking(p)
    task_id = await submit(p, research_request(p))
    assert await worker.execute_once(fake, kind=KIND)
    task, run, attempts = await stored(p, task_id)
    assert task.status == "failed" and len(attempts) == 1 and attempts[0].state == "failed"
    assert (attempts[0].usage is not None) is known
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == int(not known)
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        assert await tx.scalar(select(func.count()).select_from(Case)) == 0
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 0
    async with scope(token=token_hash(p["token"])) as tx:
        await customer_session(tx, p["token"])
        auth = await tx.get(ModelAuthorization, p["pair"]["research_authorization_id"])
        binding = await tx.get(Binding, p["source"]["binding_id"])
        assert auth.enabled and auth.fingerprint == p["pair"]["research_fingerprint"]
        assert binding.revoked_at is not None and binding.fingerprint == p["source"]["fingerprint"]
