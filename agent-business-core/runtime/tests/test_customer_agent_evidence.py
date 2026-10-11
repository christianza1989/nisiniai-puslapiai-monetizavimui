"""Restricted PG historical evidence; all model outputs are injected, no providers."""
from copy import deepcopy
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agent_lab import (  # noqa: F401 - canonical fixture chain
    configured,
    creation,
    customers,
    fake,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_agents import verified
from test_customer_quality import expire

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.control_api import app
from pinet_core.customer_agents import evaluator, evidence, lab, review
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_agents.wire import Revise
from pinet_core.customer_profile.models import Admission
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Turn
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Event, Job, KnowledgeState, Outbox
from pinet_core.tasks.codex_transport import RunnerError


async def snapshot(c):
    async with AsyncSession(c["admin"]) as tx:
        return {m.__tablename__: [{col.name: deepcopy(getattr(r, col.name)) for col in m.__table__.columns}
            for r in await tx.scalars(select(m).where(m.environment_id == c["environment"]).order_by(m.id))]
            for m in (Agent, Config, Admission, Conversation, Event, Artifact, Job, KnowledgeState, Outbox)}


async def episode(c, monkeypatch, messages=None):
    fake(monkeypatch, [])
    return await lab.episode(c["token"], c["frozen"], messages or ["Useful synthetic learning need"], uuid4())


async def judged(c, monkeypatch, fail=False):
    result = await episode(c, monkeypatch)
    rq = review.Request(bearer=c["token"], conversation_id=result["conversation"]["conversation_id"],
        request_id=uuid4(), episode=result["snapshot"])
    async def provider(schema, _prompt, _wire, authorized):
        assert await authorized()
        if fail:
            raise RunnerError("run_timeout", {"input_tokens": 12})
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            event_id = await tx.scalar(select(Event.id).where(Event.conversation_id == str(rq.conversation_id),
                Event.kind == "client_transcript"))
        return schema(outcome="helpful", issues=[], evidence_event_ids=[event_id], improvement_hint=""), {
            "input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(evaluator, "run", provider)
    status = await review.run(rq)
    return result, status


async def listing(c, **options):
    return await evidence.listing(c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"], **options)


async def test_owned_http_projection_is_safe_accounted_exact_and_readonly(configured, monkeypatch):  # noqa: F811
    c = configured
    result, status = await judged(c, monkeypatch)
    assert status["status"] == "succeeded"
    before = await snapshot(c)
    path = f"/customer/v2/creations/{c['request']['creation_id']}/agents/{c['agent']['agent']['agent_id']}/test-runs"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.get(path, headers=c["auth"])
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    item = data["items"][0]
    assert item["conversation_id"] == result["conversation"]["conversation_id"]
    assert item["script_complete"] and item["customer_turns"] == item["succeeded_turns"] == 1
    assert item["quality"]["state"] == "succeeded" and item["quality"]["outcome"] == "helpful"
    assert item["quality"]["issues_count"] == 0 and item["quality"]["applies_to_latest_transcript"]
    assert item["usage"] == {"attempts": 2, "settled": 2, "known_receipts": 2, "complete": True,
        "input_tokens": 21, "output_tokens": 11, "cost_status": "UNVERIFIED"}
    assert data["evidence_only"] and not data["provider_execution"]
    assert data["calibration_status"] == "UNVERIFIED" and data["module_admission"] == "not_admitted"
    for private in (c["token"], c["frozen"]["session_id"], "Useful synthetic learning need", "Useful synthetic consultation", "specification", "prompt", "model_profile"):
        assert private not in response.text
    assert before == await snapshot(c)


async def test_source_expiry_and_runner_off_do_not_refresh_or_hide_historical_evidence(configured, monkeypatch):  # noqa: F811
    c = configured
    await judged(c, monkeypatch)
    await expire(c)
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    before = await snapshot(c)
    result = await listing(c)
    assert result["items"][0]["quality"]["outcome"] == "helpful"
    assert not result["provider_execution"] and before == await snapshot(c)


async def test_new_config_does_not_relabel_old_test_and_revision_filter_reopens_it(configured, monkeypatch):  # noqa: F811
    c = configured
    await judged(c, monkeypatch)
    await agents.revise(c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"],
        Revise(request_id=uuid4(), expected_revision=1, configuration={**c["spec"], "goal": "Changed synthetic learning task"}))
    assert (await listing(c))["items"] == []
    monkeypatch.setattr(settings(), "control_source_revision", "0" * 40)
    before = await snapshot(c)
    item = (await listing(c, revision=1))["items"][0]
    assert not item["current_configuration"] and not item["execution_source_current"]
    assert item["config_revision"] == 1 and item["execution_source_revision"] == c["frozen"]["execution_source_revision"]
    assert before == await snapshot(c)


async def test_later_client_turn_invalidates_quality_coverage_without_changing_old_judgment(configured, monkeypatch):  # noqa: F811
    c = configured
    result, _ = await judged(c, monkeypatch)
    cid = result["conversation"]["conversation_id"]
    fake(monkeypatch, [])
    await chat.turn(c["token"], c["request"]["creation_id"], cid,
        Turn(request_id=uuid4(), base_need_revision=1, message="A new synthetic need"), calibration=result["snapshot"])
    before = await snapshot(c)
    item = (await listing(c))["items"][0]
    assert not item["script_complete"] and item["customer_turns"] == 2
    assert item["quality"]["state"] == "succeeded" and item["quality"]["outcome"] == "helpful"
    assert not item["quality"]["applies_to_latest_transcript"]
    assert before == await snapshot(c)


async def test_failed_quality_preserves_known_usage_and_cannot_look_helpful(configured, monkeypatch):  # noqa: F811
    c = configured
    _, status = await judged(c, monkeypatch, fail=True)
    assert status["status"] == "failed"
    item = (await listing(c))["items"][0]
    assert item["quality"]["state"] == "failed" and "outcome" not in item["quality"]
    assert item["usage"]["complete"] and item["usage"]["input_tokens"] == 21
    assert item["usage"]["output_tokens"] is None


async def test_signed_keyset_pages_are_revision_bound_and_no_duplicate_episode(configured, monkeypatch):  # noqa: F811
    c = configured
    ids = {(await episode(c, monkeypatch))["conversation"]["conversation_id"] for _ in range(3)}
    first = await listing(c, limit=1)
    second = await listing(c, limit=2, cursor=first["next_cursor"])
    assert first["has_more"] and not second["has_more"]
    assert {r["conversation_id"] for r in first["items"] + second["items"]} == ids
    assert all(r["quality"]["state"] == "not_requested" for r in first["items"] + second["items"])
    await agents.revise(c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"],
        Revise(request_id=uuid4(), expected_revision=1, configuration={**c["spec"], "goal": "Changed synthetic learning task"}))
    with pytest.raises(ControlError):
        await listing(c, cursor=first["next_cursor"])
    old = await listing(c, revision=1, cursor=first["next_cursor"])
    assert len(old["items"]) == 2


async def test_other_customer_cannot_read_agent_test_evidence(configured, monkeypatch):  # noqa: F811
    c = configured
    await episode(c, monkeypatch)
    _, foreign, _ = await verified(c)
    token = agents.bearer_token(foreign["Authorization"])
    with pytest.raises(ControlError, match="not_found"):
        await evidence.listing(token, c["request"]["creation_id"], c["agent"]["agent"]["agent_id"])


async def test_tampered_retained_config_fails_closed_and_never_returns_private_payload(configured, monkeypatch):  # noqa: F811
    c = configured
    result = await episode(c, monkeypatch)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.get(Conversation, result["conversation"]["conversation_id"])
        value = deepcopy(row.payload)
        value["customer_text_binding"]["task_calibration"]["config_sha256"] = "0" * 64
        row.payload = value
    before = await snapshot(c)
    with pytest.raises(ControlError, match="invalid_agent_test_evidence"):
        await listing(c)
    assert before == await snapshot(c)


async def test_tampered_quality_attempt_cannot_present_a_successful_independent_judgment(configured, monkeypatch):  # noqa: F811
    c = configured
    result, _ = await judged(c, monkeypatch)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.scalar(select(Event).where(Event.conversation_id == result["conversation"]["conversation_id"],
            Event.kind == "quality_provider_attempt"))
        row.payload = {**row.payload, "binding_sha256": "0" * 64}
    before = await snapshot(c)
    item = (await listing(c))["items"][0]
    assert item["quality"]["state"] == "UNVERIFIED" and "outcome" not in item["quality"]
    assert before == await snapshot(c)


async def test_bounded_event_projection_does_not_show_partial_episode_token_totals(configured, monkeypatch):  # noqa: F811
    c = configured
    await judged(c, monkeypatch)
    monkeypatch.setattr(evidence, "EVENT_LIMIT", 4)
    before = await snapshot(c)
    item = (await listing(c))["items"][0]
    assert item["events_truncated"] and not item["script_complete"] and not item["usage"]["complete"]
    assert item["usage"]["input_tokens"] is item["usage"]["output_tokens"] is None
    assert before == await snapshot(c)
