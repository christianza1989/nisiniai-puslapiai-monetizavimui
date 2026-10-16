"""Opt-in dedicated PG: held paid workers, real owner HTTP/SQL/native evidence.

Helper collection only. Root supplies the QA database and owns actual execution.
Setup role outputs and all subsequent review notes are isolated synthetic fixtures.
"""
import os
import subprocess
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_build_continuation_pg import accepted, snapshot
from test_customer_public import verified
from test_editorial_review_bridge_pg import (
    editorial_case,  # noqa: F401
    post,
    request,
    review_all,
)
from test_private_preview_pg import preview  # noqa: F401
from test_site_build import build, creation, customers  # noqa: F401

from pinet_core.config import settings
from pinet_core.content_work.models import GuideJob
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import editorial_preparation, media, studio
from pinet_core.creation.routes import owned
from pinet_core.creation_registration.service import accepted_proof
from pinet_core.customer_text.service import customer_session
from pinet_core.site_build import foundation, lifecycle, service
from pinet_core.site_build.continuation_models import BuildContinuation

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied dedicated PostgreSQL QA; no actual customer/provider operations")
RUNNERS = ("workspace_team_runner_enabled", "customer_text_runner_enabled", "business_discovery_runner_enabled",
    "site_build_api_runner_enabled", "creation_runner_enabled", "chat_runner_enabled")


def hold(monkeypatch):
    for key in RUNNERS:
        monkeypatch.setattr(settings(), key, False)


def held():
    assert all(getattr(settings(), key) is False for key in RUNNERS)


async def test_real_owner_s6_inspection_and_blocked_preview_with_workers_held(build, monkeypatch):  # noqa: F811
    c = build
    cid, auth = await accepted(c, monkeypatch)
    before = await snapshot(c, cid)
    # Real current source for Node Foundation; historical acceptance stays intact.
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=studio.ROOT, encoding="ascii").strip()
    monkeypatch.setattr(settings(), "control_source_revision", source)
    monkeypatch.setattr(media, "source_current", lambda: True)  # explicit synthetic source-current seam
    hold(monkeypatch)
    base = f"/customer/v2/creations/{cid}"
    value = await c["client"].get(base + "/build-continuations", headers=auth)
    assert value.status_code == 200 and value.json()["data"]["latest"] is None, value.text
    token = auth["Authorization"].split()[1]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        row = await owned(tx, session, cid, lock=True)
        proof = await accepted_proof(tx, row)
        native = editorial_preparation.Status(accepted_revision=1, candidate_sha256=proof["candidate_sha256"], canonical_host=proof["canonical_host"])
        with pytest.raises(ControlError, match="build_continuation_stale"):
            await editorial_preparation.status(tx, session, cid, native)
    payload = {"accepted_revision": 1, "idempotency_key": str(uuid4())}
    resumed = await c["client"].post(base + "/build-continuations", headers=auth, json=payload)
    assert resumed.status_code == 200 and resumed.json()["data"]["current"], resumed.text
    assert resumed.json()["data"]["execution_source_revision"] == source
    assert resumed.json()["data"]["accepted_source_revision"] == before["revision_source"]
    assert (await c["client"].get(base + "/foundation", headers=auth)).status_code == 200
    _, foreign, _ = await verified(c)
    assert (await c["client"].get(base + "/build-continuations", headers=foreign)).status_code == 404
    assert (await c["client"].post(base + "/build-continuations", headers=foreign, json=payload)).status_code == 404
    with monkeypatch.context() as stage:
        stage.setattr(foundation, "source_current", lambda: False)
        stale = await c["client"].get(base + "/build-continuations", headers=auth)
        assert stale.status_code == 503 and stale.json()["code"] == "source_unavailable", stale.text
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        status = await editorial_preparation.status(tx, session, cid, native)
        assert status["completion"]["state"] == "current"
        pin = await foundation.capture(tx, session, cid)

    async def authorized():
        async with scope(token=token_hash(token)) as tx:
            await foundation.verify(tx, pin)
            return True

    # Actual Node preparation is reachable with runners held, but this fixture
    # lacks actual complete reviews/approvals. Its canonical blocker must remain.
    with pytest.raises(ControlError, match="foundation_preview_content_blocked"):
        await foundation.prepare_preview(pin, still_authorized=authorized)
    with pytest.raises(ControlError, match="site_build_unavailable"):
        await service.advance(cid)
    with pytest.raises((ControlError, RuntimeError)):
        lifecycle.actors()
    assert await snapshot(c, cid) == before
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(BuildContinuation).where(BuildContinuation.creation_id == cid)) == 1
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 0
    held()


async def test_real_native_review_and_atomic_approval_with_all_workers_held(editorial_case, monkeypatch):  # noqa: F811
    case = editorial_case
    hold(monkeypatch)
    await review_all(case)
    body = await request(case, approve=True)
    approved = await post(case, body, approve=True)
    assert approved.status_code == 200, approved.text
    result = approved.json()["data"]["operation"]
    assert result["approval"] == "approved" and result["release"] == result["deployment"] == "not-performed"
    assert result["full_site"] == result["launch"] == "UNVERIFIED"
    held()
