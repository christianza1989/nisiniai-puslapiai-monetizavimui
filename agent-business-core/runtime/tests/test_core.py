import asyncio
from datetime import timedelta

import pytest
from conftest import claim, edge, start, utterance, worker
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.jobs import claim_job, complete_artifact, deliver_one, run_one
from pinet_core.models import Artifact, Case, Contact, Conversation, Event, Job, Outbox, new_id, utcnow
from pinet_core.service import business


async def drain(bid):
    for _ in range(8):
        if not await run_one(bid, "test-jobs"):
            async with db.transaction(bid, settings().environment) as tx:
                next_time = await tx.scalar(select(func.min(Job.run_after)).where(Job.state == "retry_scheduled"))
            if not next_time:
                return
            await asyncio.sleep(max(0, min(3.1, (next_time - utcnow()).total_seconds() + 0.05)))


async def test_rls_and_api_cross_site(client):
    session = await start(client)
    one, two = await business("traktoriupadangos"), await business("greitossvetaines")
    async with db.transaction(one.id, settings().environment) as tx:
        assert await tx.get(Conversation, session["conversation_id"])
    async with db.transaction(two.id, settings().environment) as tx:
        assert await tx.get(Conversation, session["conversation_id"]) is None
    async with db.registry() as tx:
        assert await tx.scalar(select(func.count()).select_from(Conversation)) == 0
        assert await tx.scalar(text("SELECT current_setting('pinet.business', true)")) in {None, ""}
    assert (await edge(client, "GET", "greitossvetaines", session)).status_code == 404


async def test_composite_tenant_fk(client):
    session = await start(client)
    one, two = await business("traktoriupadangos"), await business("greitossvetaines")
    async with db.transaction(one.id, settings().environment) as tx:
        case_id = (await tx.get(Conversation, session["conversation_id"])).case_id
    with pytest.raises(IntegrityError):
        async with db.transaction(two.id, settings().environment) as tx:
            tx.add(Conversation(id=new_id(), business_id=two.id, environment_id=settings().environment,
                case_id=case_id, token_hash="invalid", expires_at=utcnow() + timedelta(minutes=1)))


@pytest.mark.parametrize("end_first", [False, True])
async def test_rendezvous_and_duplicate_finalization(client, end_first):
    session = await start(client)
    epoch = await claim(client, session)
    assert (await utterance(client, session, epoch)).status_code == 200
    payload = {"channel": "email", "value": "voice-test@example.org", "consent": True,
               "notice_version": "test-only", "purpose": "followup"}
    if end_first:
        assert (await edge(client, "POST", "traktoriupadangos", session, "/end")).status_code == 200
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", payload)).status_code == 200
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", payload)).status_code == 200
    assert (await edge(client, "POST", "traktoriupadangos", session, "/end")).status_code == 200
    assert (await edge(client, "POST", "traktoriupadangos", session, "/end")).status_code == 200
    item = await business("traktoriupadangos")
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        for table, count in [(Case, 1), (Contact, 1), (Job, 3), (Artifact, 3), (Outbox, 1)]:
            assert await tx.scalar(select(func.count()).select_from(table)) == count
        assert (await tx.scalar(select(Artifact).where(Artifact.kind == "quality"))).payload["audio_quality"] == "not_measured"
        events = (await tx.scalars(select(Event).where(Event.kind == "contact_ready"))).all()
        assert "voice-test@example.org" not in str([e.payload for e in events])
    status = await edge(client, "GET", "traktoriupadangos", session)
    assert status.json()["followup"]["test"] is True


async def test_event_idempotency_conflict(client):
    session = await start(client)
    epoch = await claim(client, session)
    first, second = await utterance(client, session, epoch), await utterance(client, session, epoch)
    assert first.json()["event_id"] == second.json()["event_id"]
    assert (await utterance(client, session, epoch, text="Pakeista reikšmė tuo pačiu raktu")).status_code == 409


async def test_voice_fencing(client):
    session = await start(client)
    epoch = await claim(client, session)
    assert (await worker(client, session, "/claim", {"owner": "other"})).status_code == 409
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        convo.lease_until = utcnow() - timedelta(seconds=1)
    next_epoch = await claim(client, session, "other")
    assert next_epoch == epoch + 1
    assert (await utterance(client, session, epoch)).status_code == 409


async def test_need_correction_invalidates_recommendations(client):
    session = await start(client)
    epoch = await claim(client, session)
    evidence = (await utterance(client, session, epoch)).json()["event_id"]
    body = {"epoch": epoch, "call_id": "need-1", "name": "need.patch", "arguments": {
        "base_revision": 0, "fields": {"tyre_marking": "420/85 R28"}, "evidence_event_id": evidence, "confirmed": True}}
    response = await worker(client, session, "/tools", body)
    assert response.status_code == 200
    assert response.json()["fields"]["tyre_marking"]["status"] == "proposed"
    assert (await worker(client, session, "/tools", body)).json()["revision"] == 1
    body["call_id"] = "need-2"
    assert (await worker(client, session, "/tools", body)).status_code == 409
    second = (await utterance(client, session, epoch, key="client-2", text="Pataisau, R30")).json()["event_id"]
    body["arguments"].update(base_revision=1, evidence_event_id=second, fields={"tyre_marking": "420/85 R30"})
    assert (await worker(client, session, "/tools", body)).json()["recommendations_invalidated"] is True


async def test_ui_ack_is_separate_from_contact(client):
    session = await start(client)
    epoch = await claim(client, session)
    response = await worker(client, session, "/tools", {"epoch": epoch, "call_id": "ui-1",
        "name": "ui.open_contact_form", "arguments": {}})
    assert response.json()["status"] == "requested"
    rid = response.json()["request_id"]
    wrong = await edge(client, "POST", "traktoriupadangos", session, "/ui", {"request_id": "other", "state": "shown"})
    assert wrong.status_code == 409
    assert (await edge(client, "POST", "traktoriupadangos", session, "/ui", {"request_id": rid, "state": "shown"})).status_code == 200
    assert (await edge(client, "GET", "traktoriupadangos", session)).json()["contacts"] == []
    repeated = await worker(client, session, "/tools", {"epoch": epoch, "call_id": "ui-2",
        "name": "ui.open_contact_form", "arguments": {}})
    assert repeated.json()["request_id"] == rid
    visible = (await edge(client, "GET", "traktoriupadangos", session)).json()["ui"]
    assert visible["state"] == "shown" and visible["fields"] == ["email", "phone"]
    assert (await edge(client, "POST", "traktoriupadangos", session, "/ui", {"request_id": rid, "state": "dismissed"})).status_code == 200
    assert (await edge(client, "POST", "traktoriupadangos", session, "/ui", {"request_id": rid, "state": "shown"})).status_code == 409


async def test_changed_contact_rejected_and_phone_not_delivered(client):
    session = await start(client)
    body = {"channel": "phone", "value": "+37060000000", "consent": True, "notice_version": "test-only"}
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", body)).json()["delivery"] == "channel_unavailable"
    body["value"] = "+37061111111"
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", body)).status_code == 409


async def test_no_contact_no_outbox_and_no_interaction_quality(client):
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        assert await tx.scalar(select(func.count()).select_from(Outbox)) == 0
        assert (await tx.scalar(select(Artifact).where(Artifact.kind == "quality"))).payload["outcome"] == "no_interaction"


async def test_job_stale_generation_cannot_commit(client):
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    first = await claim_job(item.id, "old-worker")
    async with db.transaction(item.id, settings().environment) as tx:
        job = await tx.get(Job, first["id"])
        job.lease_until = utcnow() - timedelta(seconds=1)
    second = await claim_job(item.id, "new-worker")
    assert second["generation"] == first["generation"] + 1
    with pytest.raises(RuntimeError, match="stale_job_lease"):
        await complete_artifact(item.id, first, {})


async def test_model_cannot_select_commercial_tools(client):
    session = await start(client)
    epoch = await claim(client, session)
    response = await worker(client, session, "/tools", {"epoch": epoch, "call_id": "illegal",
        "name": "quote.commit", "arguments": {"price": 1}})
    assert response.status_code == 422


async def test_session_secret_and_body_limit(client):
    session = await start(client)
    bad = {**session, "session_token": "x" * 40}
    assert (await edge(client, "GET", "traktoriupadangos", bad)).status_code == 401
    assert (await client.post("/health", content=b"x" * 220001)).status_code == 413


async def test_test_followup_never_sends(client, monkeypatch):
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", {
        "channel": "email", "value": "voice-test@example.org", "consent": True, "notice_version": "test-only"})
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    monkeypatch.setattr(settings(), "smtp_enabled", True)
    assert await deliver_one(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox))).state == "blocked_test_or_hash"


async def test_creation_replay_is_one_case(client):
    from uuid import uuid4

    from conftest import knowledge
    payload = {"request_id": str(uuid4()), "knowledge": knowledge(), "notice_version": "test-only",
               "consent": True, "mode": "simulation"}
    headers = {"Authorization": f"Bearer {settings().worker_secret}"}
    first = await client.post("/internal/sites/traktoriupadangos/simulation", json=payload, headers=headers)
    second = await client.post("/internal/sites/traktoriupadangos/simulation", json=payload, headers=headers)
    assert first.json()["conversation_id"] == second.json()["conversation_id"]
    assert first.json()["session_token"] == second.json()["session_token"]
    payload["notice_version"] = "different"
    assert (await client.post("/internal/sites/traktoriupadangos/simulation", json=payload, headers=headers)).status_code == 409


async def test_edge_nonce_replay_and_tampering(client):
    import time

    from pinet_core.security import edge_signature
    session = await start(client)
    path = f"/v1/sites/traktoriupadangos/sessions/{session['conversation_id']}"
    stamp, nonce = str(int(time.time())), new_id()
    headers = {"x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
               "x-pinet-signature": edge_signature(settings().edge_secret, stamp, nonce, "GET", path, b""),
               "x-pinet-session": session["session_token"]}
    assert (await client.get(path, headers=headers)).status_code == 200
    assert (await client.get(path, headers=headers)).status_code == 409
    headers["x-pinet-nonce"] = new_id()
    assert (await client.get(path, headers=headers)).status_code == 401


async def test_concurrent_admission_limits(client, monkeypatch):
    from conftest import knowledge

    from pinet_core import service
    from pinet_core.contracts import Start
    cfg = settings()
    monkeypatch.setattr(cfg, "allow_simulation", False)
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 1000000)
    monkeypatch.setattr(cfg, "voice_cost_ceiling_microusd", 10000)
    for key, value in {"voice_enabled": True, "m0_verified": True, "google_api_key": "test-placeholder",
                       "livekit_api_key": "test-placeholder", "livekit_api_secret": "test-placeholder"}.items():
        monkeypatch.setattr(cfg, key, value)
    item = await business("traktoriupadangos")
    from pinet_core.contracts import Policy
    from pinet_core.models import BusinessPolicy
    async with db.transaction(item.id, cfg.environment) as tx:
        tx.add(BusinessPolicy(business_id=item.id, environment_id=cfg.environment,
                              revision=1, payload=Policy(enabled=True, daily_budget_microusd=1000000).model_dump()))
    results = await asyncio.gather(*[service.start(item, Start(knowledge=knowledge(), consent=True,
                                    notice_version="test-only")) for _ in range(7)], return_exceptions=True)
    assert sum(isinstance(result, dict) for result in results) == cfg.per_site_sessions
    assert all(getattr(result, "status_code", None) == 429 for result in results if not isinstance(result, dict))


async def test_candidate_is_inert_and_requires_quality(client):
    from pinet_core.service import PROMPT_HASH
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        quality = await tx.scalar(select(Artifact).where(Artifact.kind == "quality"))
        quality_id = quality.id
    candidate = {"parent_hash": PROMPT_HASH, "instruction": "Matmenis patikslink vienu klausimu.",
                 "issue_artifact_id": quality_id, "scope": "clarification"}
    response = await worker(client, session, "/candidate", candidate)
    assert response.status_code == 200 and response.json()["activated"] is False
    candidate["filesystem_path"] = "SKILLS/niche-site-builder/SKILL.md"
    assert (await worker(client, session, "/candidate", candidate)).status_code == 422


async def test_retention_cascades_private_records(client, monkeypatch):
    from pinet_core.jobs import maintenance
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", {
        "channel": "email", "value": "voice-test@example.org", "consent": True, "notice_version": "test-only"})
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        convo.created_at = utcnow() - timedelta(days=settings().retention_days + 1)
    await maintenance(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        for table in [Conversation, Contact, Event, Job, Artifact, Outbox]:
            assert await tx.scalar(select(func.count()).select_from(table)) == 0


async def test_quality_creates_inert_candidate_or_editorial_task(client):
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    analysis = await claim_job(item.id, "analysis-worker")
    await complete_artifact(item.id, analysis, {"draft_only": True})
    quality = await claim_job(item.id, "review-worker")
    from pinet_core.service import PROMPT_HASH
    await complete_artifact(item.id, quality, {"outcome": "needs_review", "root_cause": "communication",
        "issues": ["too_many_questions"], "evidence_event_ids": [], "suggested_scope": "clarification",
        "improvement_hint": "Klausk po vieną klausimą ir leisk klientui atsakyti.", "release_hash": PROMPT_HASH})
    async with db.transaction(item.id, settings().environment) as tx:
        candidate = await tx.scalar(select(Artifact).where(Artifact.kind.like("candidate:%")))
        assert candidate.payload["activated"] is False
        assert candidate.payload["protected_evaluation_required"] is True
        assert (await tx.get(Conversation, session["conversation_id"])).payload["release_hash"] == PROMPT_HASH


async def test_expired_knowledge_is_unavailable(client):
    session = await start(client)
    epoch = await claim(client, session)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        from pinet_core.models import KnowledgeState
        state = await tx.scalar(select(KnowledgeState))
        state.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)
    response = await worker(client, session, "/tools", {"epoch": epoch, "call_id": "expired",
        "name": "knowledge.resolve", "arguments": {"query": "padangos"}})
    assert response.json()["reason"] == "knowledge_snapshot_expired"


@pytest.mark.parametrize("kind", ["analysis", "quality"])
async def test_simulation_never_uses_paid_model(client, monkeypatch, kind):
    from pinet_core import jobs
    from pinet_core.service import PROMPT_HASH
    monkeypatch.setattr(settings(), "google_api_key", "test-placeholder")

    async def forbidden(*args, **kwargs):
        raise AssertionError("simulation must not call a provider")
    monkeypatch.setattr(jobs, "model_output", forbidden)
    result = await jobs.evaluate(kind, {"test": True, "evidence": [{"id": "fixture", "speaker": "client",
        "text": "Synthetic test only"}], "coverage": "text_only", "release_hash": PROMPT_HASH})
    assert result["engine"] == "programmatic_baseline"
