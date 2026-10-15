"""Restricted SQL authority plus real native deterministic writes, zero provider."""
import json
import subprocess
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import accepted
from test_customer_creations import creation as creation_fixture
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Membership, Session
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation import content_amendment as copy
from pinet_core.creation import studio
from pinet_core.creation.models import Attempt, Job, Revision

creation = creation_fixture


def current_source(monkeypatch):
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=studio.ROOT, text=True).strip()
    assert not subprocess.check_output(["git", "status", "--porcelain"], cwd=studio.ROOT, text=True).strip()
    monkeypatch.setattr(settings(), "control_source_revision", head)
    return head


async def history(c):
    async with AsyncSession(c["admin"]) as tx:
        return [await tx.scalar(select(func.count()).select_from(model).where(model.environment_id == c["environment"]))
                for model in (Attempt, Job, Revision)]


async def prepare(c, monkeypatch, *, historical=False):
    if not historical:
        current_source(monkeypatch)
    accepted_request, _, auth, me = await accepted(c)
    if historical:
        current_source(monkeypatch)
    cid = accepted_request["creation_id"]
    response = await c["client"].get(f"/customer/v2/creations/{cid}/content-completion", headers=auth)
    assert response.status_code == 200, response.text
    completion = response.json()["data"]
    home = next(p for p in completion["pages"] if p["type"] == "home")
    body_read = await c["client"].get(f"/customer/v2/creations/{cid}/content-pages/{home['page_id']}",
        params={"accepted_revision": 1}, headers=auth)
    assert body_read.status_code == 200, body_read.text
    body = body_read.json()["data"]["document"]["body"]
    request = copy.Amendment(accepted_revision=1, candidate_sha256=completion["candidate_sha256"],
        canonical_host=completion["canonical_host"], page_id=home["page_id"], operation_id=str(uuid4()),
        expected_site_sha256=completion["site_context_sha256"], expected_revision_sha256=home["revision_sha256"],
        expected_planning_sha256=home["planning_sha256"],
        patch={"body": body + [{"type": "richParagraph", "content": [{"type": "text",
            "text": "Ši konkreti pataisa išsaugo privataus bandymo ribas ir nėra paslaugos patvirtinimas."}]}]})
    return accepted_request, auth, me, completion, request


async def invoke(c, accepted_request, me, request):
    async with scope(user=me["user_id"]) as tx:
        session = await tx.get(Session, accepted_request["authorizing_session_id"])
        return await copy.amend(tx, session, accepted_request["creation_id"], request)


async def test_actual_body_write_replay_and_conflict_preserve_intake_and_usage(creation, monkeypatch):
    c = creation
    accepted_request, auth, me, before, request = await prepare(c, monkeypatch)
    cid = accepted_request["creation_id"]
    count_before = await history(c)
    intake_before = (await c["client"].get(f"/customer/v2/creations/{cid}/content", headers=auth)).json()["data"]
    result = await invoke(c, accepted_request, me, request)
    receipt = result["amendment"]
    assert receipt["changed"] and not receipt["replayed"]
    assert receipt["beforeSiteHash"] == before["site_context_sha256"]
    assert receipt["appliedSiteHash"] != receipt["beforeSiteHash"]
    assert receipt["beforePageSha256"] != receipt["appliedPageSha256"]
    assert all(receipt[key] == "not-performed" for key in copy.AUTHORITY)
    replay = await invoke(c, accepted_request, me, request)
    assert replay["amendment"]["replayed"] and not replay["amendment"]["changed"]
    assert replay["amendment"]["receiptSha256"] == receipt["receiptSha256"]
    assert replay["completion"]["site_context_sha256"] == result["completion"]["site_context_sha256"]
    conflict = copy.Amendment.model_validate({**request.model_dump(), "patch": {"title": "Kitas privatus tekstas"}})
    with pytest.raises(ControlError) as error:
        await invoke(c, accepted_request, me, conflict)
    assert error.value.status == 409
    stale = copy.Amendment.model_validate({**request.model_dump(), "operation_id": str(uuid4())})
    with pytest.raises(ControlError) as error:
        await invoke(c, accepted_request, me, stale)
    assert error.value.status == 409
    assert await history(c) == count_before
    assert (await c["client"].get(f"/customer/v2/creations/{cid}/content", headers=auth)).json()["data"] == intake_before
    page = (await c["client"].get(f"/customer/v2/creations/{cid}/content-pages/{request.page_id}",
        params={"accepted_revision": 1}, headers=auth)).json()["data"]
    assert page["document"]["body"] == request.patch.body
    assert not page["page"]["review_current"] and not page["page"]["has_approved_revision"]
    _, _, artifacts, _ = studio.configuration()
    receipt_path = artifacts / "customer-content" / cid / "revision-1/reviewed-copy-amendments" / (request.operation_id + ".json")
    assert receipt_path.is_file()
    assert json.loads(receipt_path.read_bytes())["state"] == "applied"


async def test_foreign_or_revoked_owner_cannot_write_native_page(creation, monkeypatch):
    c = creation
    accepted_request, _, me, _, request = await prepare(c, monkeypatch)
    _, foreign_auth, foreign_me = await verified(c)
    from pinet_core.control.routes import token_hash
    async with scope(user=foreign_me["user_id"]) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash ==
            token_hash(foreign_auth["Authorization"].split()[1])))
        with pytest.raises(ControlError) as error:
            await copy.amend(tx, session, accepted_request["creation_id"], request)
        assert error.value.status == 404
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
            Membership.environment_id == c["environment"]).values(enabled=False))
    with pytest.raises(ControlError) as error:
        await invoke(c, accepted_request, me, request)
    assert error.value.status == 404


async def test_real_source_guard_refuses_unadopted_historical_native_content(creation, monkeypatch):
    c = creation
    accepted_request, _, me, _, request = await prepare(c, monkeypatch, historical=True)
    before = await history(c)
    with pytest.raises(ControlError) as error:
        await invoke(c, accepted_request, me, request)
    assert error.value.code == "build_continuation_stale"
    assert await history(c) == before


async def test_revocation_after_real_write_keeps_receipt_but_refuses_success(creation, monkeypatch):
    c = creation
    accepted_request, _, me, _, request = await prepare(c, monkeypatch)
    execute = studio._execute

    async def revoke_after(*args, **kwargs):
        result = await execute(*args, **kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
                Membership.environment_id == c["environment"]).values(enabled=False))
        return result

    monkeypatch.setattr(studio, "_execute", revoke_after)
    with pytest.raises(ControlError) as error:
        await invoke(c, accepted_request, me, request)
    assert error.value.status == 404
    _, _, artifacts, _ = studio.configuration()
    directory = artifacts / "customer-content" / accepted_request["creation_id"] / "revision-1"
    receipt_path = directory / "reviewed-copy-amendments" / (request.operation_id + ".json")
    assert json.loads(receipt_path.read_bytes())["state"] == "applied"
    assert not (directory / "reviewed-copy-amendments" / (request.operation_id + ".lock")).exists()
