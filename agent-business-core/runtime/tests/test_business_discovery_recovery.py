"""A failed review retains a useful exact draft, never an approval or late result."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import discovery, plan_roles, questions, start  # noqa: F401
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.business_discovery import worker
from pinet_core.business_discovery.models import DiscoveryAttempt, DiscoveryJob, Report
from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("failure_at,expected_attempts", [("critic", 2), ("coordinator", 3),
    ("second_creator", 4), ("review_exhausted", 6)])
async def test_failed_review_retains_exact_draft_for_discussion(discovery, failure_at, expected_attempts):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    did = row["discovery_id"]
    calls = []

    async def interrupted(context, authorized, *, role, seconds):
        calls.append(role)
        if role == failure_at or failure_at == "second_creator" and role == "creator" and len(calls) > 1:
            raise RunnerError("provider_error", {"usage": {"input_tokens": 5, "output_tokens": 0}})
        value, receipt = await plan_roles(context, authorized, role=role, seconds=seconds)
        if role != "creator" and failure_at in {"second_creator", "review_exhausted"}:
            value.update(approved=False, required_changes=["Patikslinkite sintetinio pasiūlymo sprendimą."])
        return value, receipt

    assert await worker.execute_once(discovery_id=did, role_runner=interrupted)
    detail = (await c["client"].get(f"/customer/v2/discoveries/{did}", headers=auth)).json()["data"]
    assert detail["status"] == "failed" and detail["current_revision"] == 1
    assert not detail["can_build"] and detail["can_message"]
    report = (await c["client"].get(f"/customer/v2/discoveries/{did}/reports", headers=auth)).json()["data"]["items"][0]
    assert report["reply"]["plan"] and report["reply"]["state"] == "plan_ready"
    assert len(report["reviews"]) < 2 or not all(r["approved"] for r in report["reviews"])
    approval = {"report_revision": 1, "report_sha256": report["report_sha256"], "idempotency_key": str(uuid4())}
    assert (await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json=approval)).status_code == 409
    history = (await c["client"].get(f"/customer/v2/discoveries/{did}/messages", headers=auth)).json()["data"]["items"]
    assert history[-1]["role"] == "assistant" and history[-1]["status"] == "failed"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.discovery_id == did)) == expected_attempts
    # A new customer turn continues the same report, without rewriting or retrying it.
    message = {"base_revision": 1, "message": "Verslui galiu skirti laiko vakarais.", "idempotency_key": str(uuid4())}
    assert (await c["client"].post(f"/customer/v2/discoveries/{did}/messages", headers=auth, json=message)).status_code == 202
    assert await worker.execute_once(discovery_id=did, role_runner=questions)
    reports = (await c["client"].get(f"/customer/v2/discoveries/{did}/reports", headers=auth)).json()["data"]["items"]
    assert len(reports) == 2 and reports[1] == report


@pytest.mark.parametrize("fence", ["session_expiry", "archive", "deadline", "lease", "source", "instructions"])
async def test_failed_review_cannot_publish_a_draft_after_authority_fence(discovery, monkeypatch, fence):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    did = row["discovery_id"]

    async def interrupted(context, authorized, *, role, seconds):
        if role == "creator":
            return await plan_roles(context, authorized, role=role, seconds=seconds)
        if fence == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
        elif fence == "instructions":
            monkeypatch.setattr(worker.adapter, "fingerprint", lambda: "f" * 64)
        elif fence == "archive":
            response = await c["client"].post(f"/customer/v2/discoveries/{did}/archive", headers=auth,
                                            json={"idempotency_key": str(uuid4())})
            assert response.status_code == 200
        else:
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                job = await tx.scalar(select(DiscoveryJob).where(DiscoveryJob.discovery_id == did))
                past = utcnow() - timedelta(seconds=1)
                if fence == "session_expiry":
                    await tx.execute(update(Session).where(Session.id == job.session_id).values(expires_at=past))
                elif fence == "deadline":
                    job.deadline_at = past
                else:
                    job.lease_until = past
        raise RunnerError("provider_error", {"usage": {"input_tokens": 5, "output_tokens": 0}})

    assert await worker.execute_once(discovery_id=did, role_runner=interrupted)
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Report).where(Report.discovery_id == did)) == 0
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.discovery_id == did)) == 2


async def test_invalid_first_creator_output_is_not_retained_as_a_report(discovery):  # noqa: F811
    c = discovery
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    did = row["discovery_id"]

    async def invalid(context, authorized, *, role, seconds):
        return {"assistant_message": "Netinkamas planas.", "state": "plan_ready", "questions": [], "plan": None}, {}

    assert await worker.execute_once(discovery_id=did, role_runner=invalid)
    detail = (await c["client"].get(f"/customer/v2/discoveries/{did}", headers=auth)).json()["data"]
    assert detail["status"] == "failed" and detail["current_revision"] == 0
    assert detail["failure_code"] == "output_invalid" and not detail["can_build"]
