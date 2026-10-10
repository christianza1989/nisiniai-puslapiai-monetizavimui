"""Restricted real PostgreSQL and real native Node transport, injected zero-provider role outputs."""
import json
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_creations import creation as creation_fixture
from test_customer_creations import draft, start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.content_work import studio, worker
from pinet_core.content_work.models import GuideAttempt, GuideEvent, GuideJob
from pinet_core.control.models import Membership
from pinet_core.control.routes import scope
from pinet_core.creation import studio as intake
from pinet_core.creation import worker as creation_worker
from pinet_core.creation.adapter import RUNTIME
from pinet_core.creation.review import canonical_sha256
from pinet_core.models import utcnow

creation = creation_fixture


def brief(path, title):
    return {"path": path, "title": title, "head_query": title,
        "intent": "Padėti komandai pasirinkti vieną konkrečią mokymo užduotį.",
        "audience_problem": "Komanda nori palyginti darbo būdus ir pasirengti mažam bandymui.",
        "business_goal": "Patikrinti tikrą komandų susidomėjimą praktinio mokymo pasiūlymu.",
        "primary_topic": "Komandos mokymas", "reason": "Gidas atsako į atskirą skaitytojo sprendimo klausimą.",
        "month": "", "seasonal_hook": "", "pillar_path": "",
        "outline": ["Pasirinkti užduotį.", "Susitarti dėl sąlygų.", "Palyginti rezultatą."],
        "source_queries": ["Praktinio komandos mokymo užduoties pasirinkimas"], "source_urls": [],
        "internal_links": ["/"], "media_brief": "Parodyti darbo užduoties pasirinkimą ir bandymo rezultatų palyginimą.",
        "media_alt": "Darbo užduoties pasirinkimo ir bandymo schema", "priority": "initial"}


def native():
    return {"title": "Kaip pasirinkti vieną komandos užduotį", "description": "Pasirinkite pasikartojančią užduotį, susitarkite dėl bandymo sąlygų ir palyginkite rezultatus.",
        "intent": "Padėti komandai pasirinkti aiškią užduotį ir sąžiningai palyginti mažo bandymo rezultatą.",
        "body": [{"type": "richParagraph", "content": [{"type": "text", "text":
            "Pasirinkite vieną pasikartojančią užduotį, kurios rezultatą galima aiškiai palyginti. Aprašykite sąlygas prieš bandymą."}]},
            {"type": "richList", "ordered": True, "items": [[{"type": "text", "text": "Aprašykite įprastą rezultatą."}],
                [{"type": "text", "text": "Išbandykite vieną pakeitimą tomis pačiomis sąlygomis."}],
                [{"type": "text", "text": "Palyginkite rezultatus ir užrašykite skirtumus."}]]}],
        "factChecks": ["Mokytojas ir mokamo vykdymo sąlygos dar nepatvirtinti."]}


async def prepared(c):
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    async def business(context, authorized):
        assert await authorized()
        value = draft()
        value["content_plan"] = [brief(path, title) for path, title in (
            ("/gidai/uzduotis/", "Kaip pasirinkti komandos mokymo užduotį?"),
            ("/gidai/duomenys/", "Kokius duomenis naudoti mokymo metu?"),
            ("/gidai/rezultatas/", "Kaip įvertinti mokymo rezultatą?"))]
        return value, {"usage": {"input_tokens": 10, "output_tokens": 20}, "web_search_count": 0}
    assert await creation_worker.execute_once(business, intake_runner=intake.import_draft)
    path = "/customer/v2/creations/" + item["creation_id"]
    snapshot = (await c["client"].get(path + "/content", headers=auth)).json()["data"]
    assert snapshot["state"] == "private_draft_imported", snapshot
    page = next(p for p in snapshot["pages"] if p["path"] == "/gidai/uzduotis/")
    revision_dir = RUNTIME / "artifacts/customer-content" / item["creation_id"] / "revision-1"
    site_file = next((revision_dir / "data/sites").glob("*.json"))
    return {"auth": auth, "me": me, "path": path + "/content-work", "page_id": page["page_id"],
            "creation_id": item["creation_id"], "site_file": site_file, "snapshot": snapshot}


async def enqueue(c, f, **changes):
    body = {"accepted_revision": 1, "page_id": f["page_id"], "idempotency_key": str(uuid4()), **changes}
    response = await c["client"].post(f["path"], json=body, headers=f["auth"])
    return response, body


def roles(revise_first=False):
    async def role(context, authorized, *, role, seconds):
        assert await authorized() and 0 < seconds <= 300
        if role == "creator":
            value = native()
            if context.get("critic_feedback"):
                value["body"].append({"type": "richParagraph", "content": [{"type": "text",
                    "text": "Pavyzdys: komanda palygina tos pačios užklausos atsakymą prieš bandymą ir po vieno pakeitimo."}]})
            return value, {"usage": {"input_tokens": 100, "output_tokens": 80}, "web_search_count": 0}
        value = context["review"]
        if role == "critic":
            revise = revise_first and value["round_number"] == 1
            result = {"schema_version": "creation.critic.v1", "role": "critic",
                "draft_sha256": value["draft_sha256"], "stage": "content", "round_number": value["round_number"],
                "verdict": "revise" if revise else "accept_draft",
                "summary": "Gidas naudingas skaitytojui; tikros šaltinių ir vaizdų patikros lieka neatliktos.",
                "findings": [{"id": "f_1", "severity": "required", "area": "content",
                    "explanation": "Skaitytojui trūksta konkretaus palyginimo pavyzdžio.",
                    "correction": "Pridėkite aiškiai pažymėtą vienos užklausos palyginimo pavyzdį.",
                    "evidence_refs": ["draft:/body/0/content/0/text"]}] if revise else [],
                "checks": [{"kind": r["kind"], "status": r["status"], "evidence_refs": [r["id"]],
                    "summary": r["summary"]} for r in value["receipts"]]}
        else:
            report = value["critic"]
            result = {"schema_version": "creation.coordinator.v1", "role": "coordinator",
                "draft_sha256": value["draft_sha256"], "critic_sha256": canonical_sha256(report), "stage": "content",
                "round_number": value["round_number"], "decision": report["verdict"],
                "summary": "Privataus gido sprendimas išsaugotas. Viešos patikros dar turi būti atliktos.",
                "correction_ids": [f["id"] for f in report["findings"]],
                "remaining_checks": [r["kind"] for r in report["checks"] if r["status"] in ("FAIL", "UNVERIFIED")],
                "next_actions": ["Patikrinti tikrus šaltinius ir parengti gido vaizdą."],
                "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED"}
        return result, {"usage": {"input_tokens": 100, "output_tokens": 50}, "web_search_count": 0}
    return role


async def test_actual_native_guide_two_rounds_live_projection_and_immutable_history(creation):
    c = creation
    f = await prepared(c)
    before = f["site_file"].read_bytes()
    response, body = await enqueue(c, f)
    assert response.status_code == 202, response.text
    jid = response.json()["data"]["job_id"]
    assert (await c["client"].post(f["path"], json=body, headers=f["auth"])).json()["data"]["job_id"] == jid
    changed = {**body, "page_id": "page-" + "f" * 24}
    assert (await c["client"].post(f["path"], json=changed, headers=f["auth"])).status_code == 409
    assert await worker.execute_once(role_runner=roles(True))
    read = await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])
    assert read.status_code == 200, read.text
    value = read.json()["data"]
    assert read.json()["contract_version"] == "content-work.v1" and value["observation_scope"] == "live_job"
    assert value["status"] == "succeeded" and len(value["attempts"]) == 6
    candidates = [e["data"]["candidate"] for e in value["events"] if e["data"].get("candidate")]
    assert len(candidates) == 2 and len(candidates[1]["body"]) == 3
    assert canonical_sha256(candidates[1]) == value["output_sha256"]
    site = json.loads(f["site_file"].read_bytes())
    page = next(p for p in site["pages"] if p["id"] == f["page_id"])
    assert page["body"] == candidates[-1]["body"] and page["approval"] is None and page["publishedRevision"] is None
    assert f["site_file"].read_bytes() != before
    snapshot = (await c["client"].get(f["path"].replace("/content-work", "/content"), headers=f["auth"])).json()
    assert snapshot["contract_version"] == "content.v1" and snapshot["data"] == f["snapshot"]
    async with scope(user=f["me"]["user_id"]) as tx:
        assert await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), {
            "e": c["environment"], "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}) == 7
    with pytest.raises(DBAPIError):
        async with scope(user=f["me"]["user_id"]) as tx:
            await tx.execute(update(GuideAttempt).values(role="creator"))
    with pytest.raises(DBAPIError):
        async with scope(user=f["me"]["user_id"]) as tx:
            await tx.execute(update(GuideEvent).values(summary="Neleistinas nekintamo įvykio pakeitimas."))
    with pytest.raises(DBAPIError):
        async with scope(user=f["me"]["user_id"]) as tx:
            await tx.execute(update(GuideJob).where(GuideJob.id == jid).values(source_hash="b" * 64))
    assert (await c["client"].get(f["path"] + "/" + jid)).status_code == 401
    _, foreign, _ = await verified(c)
    assert (await c["client"].get(f["path"] + "/" + jid, headers=foreign)).status_code == 404


async def test_cancel_stops_real_write_and_preserves_reserved_attempt(creation):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    original = f["site_file"].read_bytes()
    async def cancel(context, authorized, *, role, seconds):
        assert role == "creator" and await authorized()
        assert (await c["client"].post(f["path"] + "/" + jid + "/cancel", headers=f["auth"])).status_code == 200
        return native(), {"usage": {"input_tokens": 13, "output_tokens": 17}}
    assert await worker.execute_once(role_runner=cancel)
    value = (await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])).json()["data"]
    assert value["status"] == "cancelled" and len(value["attempts"]) == 1
    assert f["site_file"].read_bytes() == original
    assert not await worker.execute_once(role_runner=roles())


async def test_shared_mutex_and_old_attempts_limit_guide_before_second_provider_call(creation, monkeypatch):
    c = creation
    f = await prepared(c)
    monkeypatch.setattr(settings(), "creation_daily_limit", 2)
    response, _ = await enqueue(c, f)
    assert response.status_code == 202, response.text
    async with scope() as tx:
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"), {"k": "creation-execution:" + c["environment"]})
        assert not await worker.execute_once(role_runner=roles())
    original = f["site_file"].read_bytes()
    assert await worker.execute_once(role_runner=roles())
    value = (await c["client"].get(f["path"] + "/" + response.json()["data"]["job_id"], headers=f["auth"])).json()["data"]
    assert value["status"] == "failed" and value["failure_code"] == "creation_daily_limit"
    assert len(value["attempts"]) == 1 and f["site_file"].read_bytes() == original
    rejected, _ = await enqueue(c, f)
    assert rejected.status_code == 429


async def test_actual_cas_stale_before_apply_preserves_current_native_data(creation):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    altered = None
    async def writer(target, command, authorized, **kwargs):
        nonlocal altered
        if command == "apply":
            site = json.loads(f["site_file"].read_bytes())
            site["facts"] = "Pasikeitę atskirai pateikti sintetiniai faktai."
            f["site_file"].write_text(json.dumps(site, ensure_ascii=False), encoding="utf-8")
            altered = f["site_file"].read_bytes()
        return await studio.invoke(target, command, authorized, **kwargs)
    assert await worker.execute_once(role_runner=roles(), writer=writer)
    value = (await c["client"].get(f["path"] + "/" + response.json()["data"]["job_id"], headers=f["auth"])).json()["data"]
    assert value["status"] == "failed" and value["failure_code"] == "writer_context_stale"
    assert len(value["attempts"]) == 3 and f["site_file"].read_bytes() == altered


async def test_missing_brief_stale_revision_and_source_lease_fences(creation, monkeypatch):
    c = creation
    f = await prepared(c)
    home = next(p for p in f["snapshot"]["pages"] if p["path"] == "/")
    response, _ = await enqueue(c, f, page_id=home["page_id"])
    assert response.status_code == 409 and response.json()["code"] == "writer_planning_brief_required"
    response, _ = await enqueue(c, f, accepted_revision=2)
    assert response.status_code == 409
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    claimed = await worker.claim()
    assert claimed
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(GuideJob).where(GuideJob.id == jid).values(lease_until=utcnow()-timedelta(seconds=1)))
    assert not await worker.execute_once(role_runner=roles())
    value = (await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])).json()["data"]
    assert value["status"] == "failed" and value["failure_code"] == "worker_interrupted"
    assert not value["attempts"]


async def test_revocation_does_not_refund_global_native_attempts(creation):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    assert response.status_code == 202
    async def revoke(context, authorized, *, role, seconds):
        assert await authorized()
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == f["me"]["user_id"]).values(enabled=False))
        return native(), {}
    assert await worker.execute_once(role_runner=revoke)
    assert (await c["client"].get(f["path"], headers=f["auth"])).status_code == 404
    async with scope() as tx:
        count = await tx.scalar(text("SELECT control_creation_attempt_count(:e,:s)"), {
            "e": c["environment"], "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)})
        assert count == 2
        assert not list(await tx.scalars(select(GuideEvent)))


@pytest.mark.parametrize("fence", ["source", "deadline", "revision"])
async def test_current_source_deadline_revision_prevent_late_native_apply(creation, monkeypatch, fence):
    from pinet_core.creation.models import Creation
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    original = f["site_file"].read_bytes()
    async def fenced(context, authorized, *, role, seconds):
        assert role == "creator" and await authorized()
        if fence == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
        else:
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                if fence == "deadline":
                    await tx.execute(update(GuideJob).where(GuideJob.id == jid).values(deadline_at=utcnow()-timedelta(seconds=1)))
                else:
                    await tx.execute(update(Creation).where(Creation.id == f["creation_id"]).values(current_revision=2))
        return native(), {"usage": {"input_tokens": 15, "output_tokens": 25}}
    assert await worker.execute_once(role_runner=fenced)
    value = (await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])).json()["data"]
    assert value["status"] == "failed" and len(value["attempts"]) == 1
    assert f["site_file"].read_bytes() == original


async def test_daily_job_limit_is_serialized_and_failed_jobs_are_not_refunded(creation, monkeypatch):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    assert (await c["client"].post(f["path"] + "/" + jid + "/cancel", headers=f["auth"])).status_code == 200
    monkeypatch.setattr(settings(), "creation_daily_limit", 2)
    # Old private provider usage is one, so a second job can still be admitted.
    # Two cancelled admissions then exhaust the separate durable job limit.
    second, _ = await enqueue(c, f)
    assert second.status_code == 202, second.text
    second_id = second.json()["data"]["job_id"]
    assert (await c["client"].post(f["path"] + "/" + second_id + "/cancel", headers=f["auth"])).status_code == 200
    async with scope(user=f["me"]["user_id"]) as tx:
        assert await tx.scalar(text("SELECT control_content_work_job_count(:e,:s,true)"), {
            "e": c["environment"], "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}) == 2
    response, _ = await enqueue(c, f)
    assert response.status_code == 429 and response.json()["code"] == "content_work_daily_limit"


async def test_corrupt_completed_native_source_returns_distinct_source_error(creation):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    assert await worker.execute_once(role_runner=roles())
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        job = await tx.get(GuideJob, jid)
        job.result = {**job.result, "outputHash": "b" * 64}
    response = await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])
    assert response.status_code == 503 and response.json()["code"] == "invalid_content_source"


async def test_real_native_validation_failure_is_preserved_then_repaired_in_second_round(creation):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    jid = response.json()["data"]["job_id"]
    normal = roles()
    async def invalid_first(context, authorized, *, role, seconds):
        if role == "creator" and not context.get("critic_feedback"):
            value = native()
            value["body"].append({"type": "richParagraph", "content": [{"type": "link", "text": "Pasiruošimo gidas",
                "target": {"kind": "page", "pageId": "page-" + "f" * 24}}]})
            return value, {"usage": {"input_tokens": 21, "output_tokens": 31}}
        if role == "creator":
            assert context["critic_feedback"]["validation"]["code"] == "writer_unknown_link"
        return await normal(context, authorized, role=role, seconds=seconds)
    assert await worker.execute_once(role_runner=invalid_first)
    value = (await c["client"].get(f["path"] + "/" + jid, headers=f["auth"])).json()["data"]
    assert value["status"] == "succeeded" and len(value["attempts"]) == 4
    failed = [e for e in value["events"] if e["data"].get("failure_code")]
    assert len(failed) == 1 and failed[0]["data"]["failure_code"] == "writer_unknown_link"
    assert failed[0]["data"]["usage"]["input_tokens"] == 21
    assert [a["round_number"] for a in value["attempts"]] == [1, 2, 2, 2]
