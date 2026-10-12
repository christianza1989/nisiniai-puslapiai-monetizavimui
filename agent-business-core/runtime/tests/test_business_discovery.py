"""Real isolated PostgreSQL/RLS discovery lifecycle with zero-provider role callbacks."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from offline_tests.test_business_discovery import plan_reply
from pinet_core.business_discovery import worker
from pinet_core.business_discovery.models import BuildApproval, DiscoveryAttempt, DiscoveryJob, Report
from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import scope
from pinet_core.creation.models import Artifact, Creation, Job, Revision
from pinet_core.creation.worker import context_for
from pinet_core.models import utcnow


@pytest.fixture
async def discovery(customers, monkeypatch):  # noqa: F811
    for key, value in {"business_discovery_enabled": True, "business_discovery_runner_enabled": True,
                       "creation_enabled": True, "creation_runner_enabled": True,
                       "creation_daily_limit": 0, "creation_global_daily_limit": 0}.items():
        monkeypatch.setattr(settings(), key, value)
    return customers


async def start(c, auth, me, message="Dar neturiu idėjos, padėkite pasirinkti verslo kryptį."):
    body = {"portfolio_id": me["portfolios"][0]["portfolio_id"], "message": message,
            "idempotency_key": str(uuid4())}
    response = await c["client"].post("/customer/v2/discoveries", headers=auth, json=body)
    assert response.status_code == 202, response.text
    return response.json()["data"], body


async def questions(context, authorized, *, role, seconds):
    assert role == "creator" and await authorized() and seconds > 0
    return {"assistant_message": "Kokią patirtį turite ir kokius išteklius galite skirti naujam verslui?",
            "state": "needs_input", "plan": None, "questions": [{"id": "q_resources",
            "question": "Kokias veiklas geriausiai mokate?", "reason": "Tai padės pasirinkti realią kryptį.",
            "required_for_build": True, "suggestions": ["Pardavimai", "Amatas"]}]}, {"usage": {"input_tokens": 50, "output_tokens": 20}}


async def plan_roles(context, authorized, *, role, seconds):
    assert await authorized() and seconds > 0 and context["expected_instruction_hash"]
    if role == "creator":
        return plan_reply(), {"usage": {"input_tokens": 90, "output_tokens": 30}, "web_search_count": 0}
    return {"candidate_sha256": context["candidate_sha256"], "approved": True, "summary": "Tikslus sintetinis planas tinkamas vietiniam realizavimo bandymui.",
            "required_changes": [], "suggestions": []}, {"usage": {"input_tokens": 70, "output_tokens": 20}}


async def ready(c, auth, me):
    row, body = await start(c, auth, me, "Noriu prekiauti kubilais ir saunomis Lietuvoje.")
    assert await worker.execute_once(discovery_id=row["discovery_id"], role_runner=plan_roles)
    detail = (await c["client"].get("/customer/v2/discoveries/" + row["discovery_id"], headers=auth)).json()["data"]
    return detail, body


async def test_no_idea_chat_plan_revision_explicit_build_and_replay(discovery):
    c = discovery
    _, auth, me = await verified(c)
    row, body = await start(c, auth, me)
    did = row["discovery_id"]
    replay = await c["client"].post("/customer/v2/discoveries", headers=auth, json=body)
    assert replay.json()["data"]["discovery_id"] == did
    assert await worker.execute_once(discovery_id=did, role_runner=questions)
    detail = (await c["client"].get("/customer/v2/discoveries/" + did, headers=auth)).json()["data"]
    assert detail["status"] == "needs_input" and detail["current_revision"] == 1
    assert not detail["can_build"] and not detail["can_create_agents"] and not detail["can_open_designer"]
    forbidden = {"report_revision": 1, "report_sha256": detail["latest_report_sha256"], "idempotency_key": str(uuid4())}
    assert (await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json=forbidden)).status_code == 409
    assert (await c["client"].get("/customer/v2/creations", headers=auth)).json()["data"]["items"] == []

    change = {"base_revision": 1, "message": "Moku parduoti, noriu pradėti nuo produktų prekybos Lietuvoje.",
              "idempotency_key": str(uuid4())}
    response = await c["client"].post(f"/customer/v2/discoveries/{did}/messages", headers=auth, json=change)
    assert response.status_code == 202, response.text
    assert await worker.execute_once(discovery_id=did, role_runner=plan_roles)
    detail = (await c["client"].get("/customer/v2/discoveries/" + did, headers=auth)).json()["data"]
    assert detail["status"] == "plan_ready" and detail["current_revision"] == 2 and detail["can_build"]
    assert (await c["client"].post(f"/customer/v2/discoveries/{did}/messages", headers=auth, json={**change, "idempotency_key": str(uuid4())})).status_code == 409
    reports = (await c["client"].get(f"/customer/v2/discoveries/{did}/reports", headers=auth)).json()["data"]["items"]
    assert [r["revision"] for r in reports] == [2, 1]
    assert reports[1]["reply"]["plan"] is None and len(reports[0]["reviews"]) == 2

    approval = {"report_revision": 2, "report_sha256": detail["latest_report_sha256"], "idempotency_key": str(uuid4())}
    assert (await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json={**approval, "report_sha256": "0" * 64})).status_code == 409
    response = await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json=approval)
    assert response.status_code == 202, response.text
    result = response.json()["data"]
    again = await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json=approval)
    assert again.json()["data"]["creation_id"] == result["creation_id"]
    assert not result["discovery"]["can_build"] and not result["discovery"]["can_create_agents"]
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, result["creation_id"])
        assert await tx.scalar(select(func.count()).select_from(Job).where(Job.creation_id == creation.id)) == 1
        assert await tx.scalar(select(func.count()).select_from(BuildApproval).where(BuildApproval.discovery_id == did)) == 1
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.discovery_id == did)) == 4
        assert await tx.scalar(select(func.count()).select_from(Revision).where(Revision.creation_id == creation.id)) == 0
        assert await tx.scalar(select(func.count()).select_from(Artifact).where(Artifact.creation_id == creation.id)) == 0
        user_id = creation.user_id
    async with scope(user=user_id) as tx:
        creation = await tx.get(Creation, result["creation_id"])
        job = await tx.scalar(select(Job).where(Job.creation_id == creation.id))
        context = await context_for(tx, creation, job)
        assert context["approved_business_plan"]["report_sha256"] == approval["report_sha256"]
        assert context["approved_business_plan"]["plan"]["acquisition_channels"]


async def test_cross_owner_denial_source_expiry_and_immutable_reports(discovery, monkeypatch):
    c = discovery
    _, auth, me = await verified(c)
    detail, _ = await ready(c, auth, me)
    _, foreign, _ = await verified(c)
    did = detail["discovery_id"]
    assert (await c["client"].get("/customer/v2/discoveries/" + did, headers=foreign)).status_code == 404
    assert (await c["client"].get(f"/customer/v2/discoveries/{did}/reports", headers=foreign)).status_code == 404
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.scalar(select(DiscoveryJob).where(DiscoveryJob.discovery_id == did))
        user_id, session_id = job.user_id, job.session_id
    async with scope(user=user_id) as tx:
        permissions = (await tx.execute(text("SELECT has_table_privilege(current_user,'control_business_discovery_reports','UPDATE'), has_table_privilege(current_user,'control_business_discovery_reports','DELETE')"))).one()
        assert permissions == (False, False)
        assert await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"),
                               {"e": c["environment"], "s": utcnow() - timedelta(days=1)}) == 3
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    changed = (await c["client"].get("/customer/v2/discoveries/" + did, headers=auth)).json()["data"]
    assert not changed["can_build"]
    monkeypatch.setattr(settings(), "control_source_revision", "a" * 40)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Session).where(Session.id == session_id).values(expires_at=utcnow() - timedelta(seconds=1)))
    assert (await c["client"].get("/customer/v2/discoveries/" + did, headers=auth)).status_code == 401


async def test_archive_cancels_late_result_keeps_charge_and_creation_history(discovery):
    c = discovery
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    did = row["discovery_id"]

    async def cancelled(context, authorized, **kwargs):
        response = await c["client"].post(f"/customer/v2/discoveries/{did}/archive", headers=auth,
                                           json={"idempotency_key": str(uuid4())})
        assert response.status_code == 200, response.text
        assert not await authorized()
        return await questions(context, lambda: _true(), **kwargs)

    assert await worker.execute_once(discovery_id=did, role_runner=cancelled)
    detail = (await c["client"].get("/customer/v2/discoveries/" + did, headers=auth)).json()["data"]
    assert detail["status"] == "archived" and detail["current_revision"] == 0
    assert (await c["client"].get("/customer/v2/discoveries", headers=auth)).json()["data"]["items"] == []
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.discovery_id == did)) == 1
        assert await tx.scalar(select(func.count()).select_from(Report).where(Report.discovery_id == did)) == 0

    detail, _ = await ready(c, auth, me)
    did = detail["discovery_id"]
    response = await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json={
        "report_revision": detail["current_revision"], "report_sha256": detail["latest_report_sha256"], "idempotency_key": str(uuid4())})
    cid = response.json()["data"]["creation_id"]
    body = {"idempotency_key": str(uuid4())}
    archived = await c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth, json=body)
    assert archived.status_code == 200, archived.text
    assert archived.json()["data"]["history_preserved"]
    assert (await c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth, json=body)).json()["data"] == archived.json()["data"]
    assert (await c["client"].get("/customer/v2/creations", headers=auth)).json()["data"]["items"] == []
    assert len((await c["client"].get("/customer/v2/creations?include_archived=true", headers=auth)).json()["data"]["items"]) == 1
    assert (await c["client"].get(f"/customer/v2/creations/{cid}/messages", headers=auth)).json()["data"]["items"]


async def _true():
    return True
