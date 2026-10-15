"""Restricted actual PG/auth/RLS projection with injected model receipts, no providers."""

from copy import deepcopy

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agent_evidence import (  # noqa: F401 - canonical fixture chain
    configured,
    creation,
    customers,
    listing,
    profile,
    registration,
    snapshot,
    text_customer,
)
from test_customer_agents import verified
from test_customer_competence import VALUES, provider
from test_customer_quality import expire
from test_customer_review import request

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.control_api import app
from pinet_core.customer_agents import evidence, review
from pinet_core.customer_agents import service as agents
from pinet_core.customer_profile.models import Admission
from pinet_core.models import Artifact, Event


async def scored(c, monkeypatch, *, cause="unknown", issues=None):
    rq = await request(c, monkeypatch)
    calls = []
    provider(monkeypatch, c, calls, cause=cause, issues=issues)
    rq = review.ScoredRequest(**rq.model_dump())
    result = await review.run(rq)
    assert result["status"] == "succeeded"
    return str(rq.conversation_id), calls


async def scores(c, **options):
    return await evidence.listing(
        c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"], scores=True, **options
    )


async def test_owned_http_numeric_projection_readonly_private_and_old_wire_unchanged(configured, monkeypatch):  # noqa: F811
    c = configured
    cid, calls = await scored(c, monkeypatch)
    before = await snapshot(c)
    path = f"/customer/v2/creations/{c['request']['creation_id']}/agents/{c['agent']['agent']['agent_id']}/score-evidence"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855"
    ) as client:
        response = await client.get(path, headers=c["auth"])
    assert response.status_code == 200
    data = response.json()["data"]
    item = data["items"][0]
    assert item["conversation_id"] == cid and item["competence"]["state"] == "competent"
    assert item["competence"]["scores"]["listening"] == VALUES["listening"]
    assert item["competence"]["critical_issues_count"] == 0 and not data["provider_execution"]
    assert data["module_admission"] == "not_admitted" and data["calibration_status"] == "UNVERIFIED"
    for private in (
        c["token"],
        c["frozen"]["session_id"],
        VALUES["explanation"],
        'critical_issues"',
        "model_assessment",
        "model_profile",
        "protected_case",
        "Synthetic course",
    ):
        assert private not in response.text
    old = await listing(c)
    assert old["items"][0] == {
        key: value for key, value in (await scores(c))["items"][0].items() if key != "competence"
    }
    assert before == await snapshot(c) and len(calls) == 1


async def test_actual_attributed_quality_uses_original_combined_output_hash(configured, monkeypatch):  # noqa: F811
    c = configured
    _, calls = await scored(c, monkeypatch, cause="knowledge", issues=["Synthetic clarification missing"])
    result = (await scores(c))["items"][0]
    assert result["competence"]["state"] == "competent" and result["quality"]["root_cause"] == "communication"
    assert len(calls) == 2


@pytest.mark.parametrize("change", ["output", "criterion", "request_optin"])
async def test_actual_receipt_corruption_hides_numbers_without_writes(configured, monkeypatch, change):  # noqa: F811
    c = configured
    cid, calls = await scored(c, monkeypatch)
    assert (await scores(c))["items"][0]["competence"]["state"] == "competent"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "criterion":
            row = await tx.scalar(
                select(Artifact).where(Artifact.conversation_id == cid, Artifact.kind == "quality")
            )
            payload = deepcopy(row.payload)
            payload["competence"]["criterion_sha256"] = "0" * 64
            row.payload = payload
        else:
            kind = "quality_provider_usage" if change == "output" else "quality_request"
            row = await tx.scalar(select(Event).where(Event.conversation_id == cid, Event.kind == kind))
            payload = deepcopy(row.payload)
            if change == "output":
                payload["output_sha256"] = "0" * 64
            else:
                payload.pop("competence_contract")
            row.payload = payload
    before = await snapshot(c)
    result = (await scores(c))["items"][0]["competence"]
    assert result["state"] == "UNVERIFIED" and "scores" not in result
    assert before == await snapshot(c) and len(calls) == 1


async def test_expired_revoked_profile_and_runner_off_preserve_owned_historical_scores(
    configured,  # noqa: F811 - imported fixture
    monkeypatch,
):  # noqa: F811
    c = configured
    await scored(c, monkeypatch)
    await expire(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.get(Admission, c["frozen"]["admission_id"])
        from pinet_core.models import utcnow

        row.revoked_at = utcnow()
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    before = await snapshot(c)
    result = (await scores(c))["items"][0]
    assert result["profile_revoked"] and result["competence"]["state"] == "competent"
    assert before == await snapshot(c)


async def test_score_cursor_is_distinct_revision_bound_and_foreign_customer_denied(configured, monkeypatch):  # noqa: F811
    c = configured
    for _ in range(2):
        await request(c, monkeypatch)
    first = await scores(c, limit=1)
    second = await scores(c, limit=1, cursor=first["next_cursor"])
    assert first["has_more"] and not second["has_more"]
    assert first["items"][0]["conversation_id"] != second["items"][0]["conversation_id"]
    assert first["items"][0]["competence"]["state"] == "not_requested"
    old = await listing(c, limit=1)
    with pytest.raises(ControlError):
        await scores(c, cursor=old["next_cursor"])
    with pytest.raises(ControlError):
        await listing(c, cursor=first["next_cursor"])
    _, foreign, _ = await verified(c)
    token = agents.bearer_token(foreign["Authorization"])
    with pytest.raises(ControlError, match="not_found"):
        await evidence.listing(
            token, c["request"]["creation_id"], c["agent"]["agent"]["agent_id"], scores=True
        )


async def test_truncated_receipts_do_not_expose_partial_numeric_results(configured, monkeypatch):  # noqa: F811
    c = configured
    await scored(c, monkeypatch)
    assert (await scores(c))["items"][0]["competence"]["state"] == "competent"
    monkeypatch.setattr(evidence, "EVENT_LIMIT", 4)
    before = await snapshot(c)
    result = (await scores(c))["items"][0]
    assert result["events_truncated"] and result["competence"]["state"] == "UNVERIFIED"
    assert "scores" not in result["competence"] and before == await snapshot(c)


@pytest.mark.parametrize("payload", [[], None, "Synthetic scalar"])
async def test_actual_jsonb_non_object_returns_unverified_readonly(configured, monkeypatch, payload):  # noqa: F811
    c = configured
    cid, calls = await scored(c, monkeypatch)
    assert (await scores(c))["items"][0]["competence"]["state"] == "competent"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.scalar(
            select(Artifact).where(Artifact.conversation_id == cid, Artifact.kind == "quality")
        )
        row.payload = payload
    before = await snapshot(c)
    path = f"/customer/v2/creations/{c['request']['creation_id']}/agents/{c['agent']['agent']['agent_id']}/score-evidence"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855"
    ) as client:
        response = await client.get(path, headers=c["auth"])
    assert response.status_code == 200
    result = response.json()["data"]["items"][0]["competence"]
    assert result["state"] == "UNVERIFIED" and "scores" not in result
    assert before == await snapshot(c) and len(calls) == 1
