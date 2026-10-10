"""Actual PostgreSQL team lifecycle, quota and fencing; synthetic fixed provider, no network calls."""
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_creations import creation as _creation_fixture
from test_customer_creations import draft, result, start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Membership
from pinet_core.control.routes import scope
from pinet_core.creation import adapter, team, worker
from pinet_core.creation.models import Artifact, Attempt, Job, Revision, TeamEvent
from pinet_core.creation.review import critic_sha256, draft_sha256
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError

creation = _creation_fixture  # Shared pytest fixture, explicit registry alias.


def critic(context, verdict="accept_draft"):
    value = context["draft"]
    return {"schema_version": "creation.critic.v1", "role": "critic", "draft_sha256": draft_sha256(value),
        "stage": "private_draft", "round_number": context["round_number"], "verdict": verdict,
        "summary": "Pateiktas privatus juodraštis įvertintas. Viešo paleidimo patikros dar neatliktos.",
        "findings": [] if verdict == "accept_draft" else [{"id": "f_1", "severity": "required", "area": "language",
            "explanation": "Kūrėjo atsakymą reikia aiškiai perrašyti taisyklinga lietuvių kalba.",
            "correction": "Patikslinti atsakymą ir dar kartą patikrinti visus galutinio teksto sakinius.",
            "evidence_refs": ["draft:/assistant_reply"]}],
        "checks": [{"kind": c["kind"], "status": c["status"], "evidence_refs": [c["id"]],
                    "summary": c["summary"]} for c in context["receipts"]]}


def coordinator(context):
    report = context["critic"]
    return {"schema_version": "creation.coordinator.v1", "role": "coordinator",
        "draft_sha256": draft_sha256(context["draft"]), "critic_sha256": critic_sha256(report),
        "stage": "private_draft", "round_number": context["round_number"], "decision": report["verdict"],
        "summary": "Sprendimas priimtas pagal šios versijos kritiko išvadą. Nepatikrinti etapai lieka atviri.",
        "correction_ids": [f["id"] for f in report["findings"] if f["severity"] != "suggestion"],
        "remaining_checks": [c["kind"] for c in report["checks"] if c["status"] in ("FAIL", "UNVERIFIED")],
        "next_actions": ["Tęsti faktines patikras prieš rengiant viešą leidimą."],
        "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED"}


def runner(calls, *, first_bad=False, always_revise=False):
    async def run(context, authorized, *, role, seconds):
        assert 0 < seconds <= settings().creation_runner_seconds and await authorized()
        calls.append(role)
        if role == "creator":
            value = draft("Patikslinau bandomojo verslo tekstą ir palikau nepatikrintus faktus atvirais klausimais.")
            if first_bad and len(calls) == 1:
                value["assistant_reply"] = "Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto."
            if len(calls) > 3:
                assert context["critic_feedback"]["verdict"] == "revise"
                assert "assistant_reply" not in context["current_draft"]
        elif role == "critic":
            failed = any(c["status"] == "FAIL" for c in context["receipts"])
            value = critic(context, "revise" if failed or always_revise else "accept_draft")
        else:
            value = coordinator(context)
        return value, {"usage": {"input_tokens": 100, "output_tokens": 20}, "web_search_count": 0}
    return run


async def team_read(c, auth, cid):
    response = await c["client"].get("/customer/v2/creations/" + cid + "/team", headers=auth)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "team.v1"
    return response.json()["data"]


@pytest.mark.parametrize("first_bad,expected_calls", [(False, 3), (True, 6)])
async def test_actual_role_receipts_and_language_correction_accept_exact_candidate(creation, first_bad, expected_calls):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    cid, calls = row["creation_id"], []
    assert (await team_read(c, auth, cid))["attempts"] == []
    assert await worker.execute_once(role_runner=runner(calls, first_bad=first_bad))
    view = await team_read(c, auth, cid)
    assert calls == ["creator", "critic", "coordinator"] * (expected_calls // 3), view["events"][-1] if view["events"] else view
    assert view["status"] == "draft_ready" and view["current_revision"] == 1
    assert len(view["attempts"]) == expected_calls and len(view["events"]) == expected_calls * 2
    assert all(a["state"] == "succeeded" for a in view["attempts"])
    assert view["events"][-1]["data"]["candidate_sha256"] == view["accepted_candidate_sha256"]
    assert view["full_f1_status"] == view["launch_status"] == "UNVERIFIED"
    files = (await c["client"].get("/customer/v2/creations/"+cid+"/artifacts", headers=auth)).json()["data"]["items"]
    assert len(files) == 3  # Rejected candidate is never promoted as another accepted revision.
    assert (await team_read(c, auth, cid)) == view
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        assert len(job.usage["attempts"]) == expected_calls and job.cost_microusd is None
    with pytest.raises(DBAPIError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(TeamEvent).values(summary="Fiktyvi pakeista išvada."))


async def test_two_round_limit_preserves_findings_without_promotion(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    calls = []
    await worker.execute_once(role_runner=runner(calls, always_revise=True))
    view = await team_read(c, auth, row["creation_id"])
    assert len(calls) == 6 and view["status"] == "needs_review" and view["current_revision"] is None
    assert view["events"][-1]["data"]["decision"] == "revise"
    assert view["accepted_candidate_sha256"] is None
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == row["creation_id"]))
        assert job.failure_code == "review_limit" and len(job.usage["attempts"]) == 6


async def test_customer_call_budget_stops_before_third_dispatch(creation, monkeypatch):
    c = creation
    monkeypatch.setattr(settings(), "creation_daily_limit", 2)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    calls = []
    await worker.execute_once(role_runner=runner(calls))
    view = await team_read(c, auth, row["creation_id"])
    assert calls == ["creator", "critic"] and len(view["attempts"]) == 2
    assert view["status"] == "needs_review" and view["accepted_candidate_sha256"] is None
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == row["creation_id"]))
        assert job.failure_code == "draft_budget_exhausted" and len(job.usage["attempts"]) == 2


async def test_revoked_history_stays_charged_and_foreign_team_hidden(creation, monkeypatch):
    c = creation
    monkeypatch.setattr(settings(), "creation_global_daily_limit", 3)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    await worker.execute_once(role_runner=runner([]))
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(enabled=False))
    async with scope(user=me["user_id"]) as tx:
        assert not list(await tx.scalars(select(Attempt)))
        start_day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        assert await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), {"e": c["environment"], "s": start_day}) == 3
    _, other_auth, other = await verified(c)
    assert (await c["client"].get("/customer/v2/creations/"+row["creation_id"]+"/team", headers=other_auth)).status_code == 404
    next_row, _ = await start(c, other_auth, other)
    calls = []
    await worker.execute_once(role_runner=runner(calls))
    assert calls == [] and (await team_read(c, other_auth, next_row["creation_id"]))["status"] == "needs_review"


async def test_cancel_preserves_observed_usage_and_rejects_late_result(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    base = runner([])
    async def cancelled(context, authorized, *, role, seconds):
        value, receipt = await base(context, authorized, role=role, seconds=seconds)
        if role == "coordinator":
            response = await c["client"].post("/customer/v2/creations/"+row["creation_id"]+"/cancel", headers=auth)
            assert response.status_code == 200
        return value, receipt
    await worker.execute_once(role_runner=cancelled)
    view = await team_read(c, auth, row["creation_id"])
    assert view["status"] == "cancelled" and view["current_revision"] is None
    assert view["attempts"][-1]["state"] == "interrupted"
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == row["creation_id"]))
        assert len(job.usage["attempts"]) == 3 and job.usage["attempts"][-1]["usage"]["output_tokens"] == 20


async def test_overall_deadline_rejects_late_review_keeps_usage(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    clock = [0]
    monkeypatch.setattr(team, "monotonic", lambda: clock[0])
    base = runner([])
    async def slow(context, authorized, *, role, seconds):
        value, receipt = await base(context, authorized, role=role, seconds=seconds)
        if role == "critic":
            clock[0] = settings().creation_runner_seconds + 1
        return value, receipt
    await worker.execute_once(role_runner=slow)
    view = await team_read(c, auth, row["creation_id"])
    assert view["status"] == "failed" and view["current_revision"] is None
    assert len(view["attempts"]) == 2 and view["events"][-1]["data"]["failure_code"] == "run_timeout"
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == row["creation_id"]))
        assert job.usage["attempts"][-1]["usage"]["input_tokens"] == 100


async def test_legacy_revision_is_not_claimed_three_role_accepted_and_failure_receipt_retained(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    await worker.execute_once(result)
    assert (await team_read(c, auth, row["creation_id"]))["accepted_candidate_sha256"] is None
    response = await c["client"].post("/customer/v2/creations/"+row["creation_id"]+"/revisions", headers=auth,
        json={"base_revision": 1, "message": "Patikrink naują rezultatą.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202
    async def broken(context, authorized, *, role, seconds):
        raise RunnerError("output_invalid", {"usage": {"input_tokens": 321, "output_tokens": 123}, "web_search_count": 0})
    await worker.execute_once(role_runner=broken)
    view = await team_read(c, auth, row["creation_id"])
    assert view["current_revision"] == 1 and view["events"][-1]["data"]["usage"]["input_tokens"] == 321


async def test_cancel_cannot_release_global_process_barrier_before_executor_returns(creation):
    c = creation
    _, auth, me = await verified(c)
    first, _ = await start(c, auth, me)
    second, _ = await start(c, auth, me, idempotency_key=str(uuid4()))
    called = []
    async def cancelled(context, authorized):
        await c["client"].post("/customer/v2/creations/"+first["creation_id"]+"/cancel", headers=auth)
        assert not await worker.execute_once(role_runner=runner(called))
        assert called == []
        return draft(), {}
    await worker.execute_once(cancelled)
    assert await worker.execute_once(role_runner=runner(called))
    assert (await team_read(c, auth, second["creation_id"]))["status"] == "draft_ready"


async def test_final_receipt_storage_delay_cannot_promote_after_deadline(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    clock = [0]
    monkeypatch.setattr(team, "monotonic", lambda: clock[0])
    finish = team.finish
    async def slow_finish(claimed, attempt_id, state, summary, payload):
        await finish(claimed, attempt_id, state, summary, payload)
        if payload.get("decision") == "accept_draft" and payload.get("next_actions"):
            clock[0] = settings().creation_runner_seconds + 1
    monkeypatch.setattr(team, "finish", slow_finish)
    await worker.execute_once(role_runner=runner([]))
    view = await team_read(c, auth, row["creation_id"])
    assert view["status"] == "failed" and view["current_revision"] is None
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == row["creation_id"]))
        assert job.failure_code == "run_timeout" and len(job.usage["attempts"]) == 3


def graph_candidate(*, broken):
    value = draft()
    value["content_plan"] = [{
        "path": "/gidai/" + path + "/", "title": title, "head_query": title,
        "intent": "Padėti komandai pasirinkti tinkamą praktinio mokymo veiksmą.",
        "audience_problem": "Komanda nori saugiai išbandyti naują darbo būdą ir įvertinti jo naudą.",
        "business_goal": "Patikrinti tikrą tinkamų komandų susidomėjimą siauru mokymo pasiūlymu.",
        "primary_topic": "Praktinis komandos mokymas", "reason": "Atskiras skaitytojo klausimas reikalauja atskiro atsakymo.",
        "month": "", "seasonal_hook": "", "pillar_path": "",
        "outline": ["Pasirinkti užduotį.", "Saugiai pasirengti bandymui.", "Palyginti bandymo rezultatą."],
        "source_queries": ["Praktinio komandos mokymo užduoties pasirinkimas"], "source_urls": [],
        "internal_links": ["/"], "media_brief": "Parodyti tris darbo užduoties pasirinkimo žingsnius, be fiktyvių rezultatų.",
        "media_alt": "Trys komandos darbo užduoties pasirinkimo žingsniai", "priority": "initial",
    } for path, title in (("uzduotis", "Kaip pasirinkti mokymo užduotį?"),
        ("duomenys", "Kokius duomenis naudoti mokymo metu?"), ("rezultatas", "Kaip įvertinti mokymo rezultatą?"))]
    root = value["content_plan"][0]["path"]
    for support in value["content_plan"][1:]:
        support["pillar_path"] = root
        support["internal_links"].append(root)
    if broken:
        value["content_plan"][0]["pillar_path"] = root
    return value


def structural_runner(calls, *, always_broken=False):
    async def run(context, authorized, *, role, seconds):
        assert await authorized() and seconds > 0
        calls.append(role)
        if role == "creator":
            if len(calls) == 1:
                assert not context.get("structure_repair")
                value = graph_candidate(broken=True)
            else:
                assert context["structure_repair"] is True and context["permitted_web_actions"] == 0
                assert context["structural_feedback"]["check"] == "creator-graph.v1"
                assert context["structural_feedback"]["issues"][0]["field"] == "draft:/content_plan/0/pillar_path"
                assert context["current_draft"]["content_plan"][0]["pillar_path"] == "/gidai/uzduotis/"
                assert "assistant_reply" not in context["current_draft"]
                assert context["expected_instruction_hash"] == adapter.role_instruction_hash("creator", structure_repair=True)
                value = graph_candidate(broken=always_broken)
        else:
            assert context["round_number"] == 2
            value = critic(context) if role == "critic" else coordinator(context)
        return value, {"usage": {"input_tokens": 100, "output_tokens": 20},
                       "web_search_count": 2 if len(calls) == 1 else 0}
    return run


@pytest.mark.parametrize("always_broken", [False, True])
async def test_structural_failure_charged_visible_and_only_one_correction(creation, always_broken):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    cid, calls = row["creation_id"], []
    assert await worker.execute_once(role_runner=structural_runner(calls, always_broken=always_broken))
    view = await team_read(c, auth, cid)
    assert calls == (["creator", "creator"] if always_broken else ["creator", "creator", "critic", "coordinator"])
    assert len(view["events"]) == len(calls) * 2
    first = view["events"][1]
    assert first["state"] == "failed" and first["data"]["failure_code"] == "output_invalid"
    assert first["data"]["web_search_count"] == 2 and first["data"]["usage"]["input_tokens"] == 100
    assert first["data"]["candidate_sha256"] is None  # An invalid candidate is never accepted.
    assert view["attempts"][0]["instruction_hash"] != view["attempts"][1]["instruction_hash"]
    assert [a["round_number"] for a in view["attempts"][:2]] == [1, 2]
    assert view["current_revision"] == (None if always_broken else 1)
    assert bool(view["accepted_candidate_sha256"]) is (not always_broken)
    files = (await c["client"].get("/customer/v2/creations/"+cid+"/artifacts", headers=auth)).json()["data"]["items"]
    assert len(files) == (0 if always_broken else 3)
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        assert job.usage["web_search_count"] == 2 and len(job.usage["attempts"]) == len(calls)
        assert job.usage["attempts"][0]["creator_repair_context"]["candidate"]["content_plan"][0]["pillar_path"] == "/gidai/uzduotis/"


@pytest.mark.parametrize("barrier", ["budget", "cancel", "revoke", "deadline"])
async def test_structural_correction_cannot_bypass_current_barriers(creation, monkeypatch, barrier):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    cid, calls = row["creation_id"], []
    if barrier == "budget":
        monkeypatch.setattr(settings(), "creation_daily_limit", 1)
    clock = [0]
    monkeypatch.setattr(team, "monotonic", lambda: clock[0])
    base = structural_runner(calls)
    async def fenced(context, authorized, *, role, seconds):
        value, receipt = await base(context, authorized, role=role, seconds=seconds)
        if barrier == "cancel":
            assert (await c["client"].post("/customer/v2/creations/"+cid+"/cancel", headers=auth)).status_code == 200
        elif barrier == "revoke":
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(enabled=False))
        elif barrier == "deadline":
            clock[0] = settings().creation_runner_seconds + 1
        return value, receipt
    assert await worker.execute_once(role_runner=fenced)
    assert calls == ["creator"]
    # Administrative evidence inspects this synthetic case even after current RLS authority is revoked.
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.creation_id == cid)))
        assert len(attempts) == 1
        assert not list(await tx.scalars(select(Revision).where(Revision.creation_id == cid)))
        assert not list(await tx.scalars(select(Artifact).where(Artifact.creation_id == cid)))
        if barrier == "revoke":
            assert job.usage is None  # Current RLS fences even a late accounting write; original provider files remain private.
        else:
            assert len(job.usage["attempts"]) == 1 and job.usage["attempts"][0]["usage"]["input_tokens"] == 100
            assert job.usage["web_search_count"] == 2
    if barrier == "revoke":
        assert (await c["client"].get("/customer/v2/creations/"+cid+"/team", headers=auth)).status_code == 404
        async with scope(user=me["user_id"]) as tx:
            start_day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            assert await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"),
                {"e": c["environment"], "s": start_day}) == 1
    if barrier != "revoke":
        view = await team_read(c, auth, cid)
        assert view["current_revision"] is None and view["accepted_candidate_sha256"] is None
