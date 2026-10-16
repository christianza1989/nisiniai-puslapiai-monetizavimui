"""Authenticated native review/approval bridge; no database or provider."""
import copy
from importlib import import_module
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, Request
from pydantic import ValidationError
from test_content_completion import source as completion_source
from test_creation_media import IDENTITY
from test_creation_media import fixture as media_fixture  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.routes import ControlError, authenticated
from pinet_core.creation import editorial_review as editorial
from pinet_core.creation.editorial_review_routes import router
from pinet_core.customer.service import customer_guard
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def reviewed(media_fixture, monkeypatch):  # noqa: F811
    f = media_fixture
    f.row.id = IDENTITY
    f.session = SimpleNamespace(user_id=str(uuid4()), id=str(uuid4()))
    f.proof["site_id"] = "creation-" + IDENTITY.replace("-", "")
    monkeypatch.setattr(editorial, "settings", lambda: f.cfg)
    context = {key: getattr(f.request, key) for key in ("accepted_revision", "candidate_sha256", "canonical_host", "expected_site_sha256")}
    context["operation_id"] = str(uuid4())
    pin = {"page_id": f.request.page_id, "revision_sha256": f.request.expected_revision_sha256,
           "planning_sha256": f.request.expected_planning_sha256}
    notes = {key: "Only an isolated synthetic protocol fixture, not actual customer review evidence."
             for key in editorial.Evidence.model_fields}
    request = editorial.RecordReview(**context, page=editorial.PagePin(**pin), evidence=editorial.Evidence(**notes))
    _, _, template = completion_source()
    seen, result = [], {}

    async def execute(arguments, payload, environment, authorized, seconds):
        f.state.calls += 1
        assert seconds == 20 and await authorized()
        assert arguments[1].name == "customer-content-workflow.mjs" and payload["command"] == "review-editorial"
        assert "patch" not in payload and "reviewer" not in payload and "provider" not in payload
        assert payload["actorId"] == "session-user:" + f.session.user_id
        seen.append(copy.deepcopy(payload))
        value = copy.deepcopy(template)
        value.update(creationId=IDENTITY, acceptedRevision=1, sourceHash=f.proof["candidate_sha256"],
            siteId=f.proof["site_id"], canonicalHost=f.proof["canonical_host"], expectedSiteHash="8" * 64)
        value["workflow"].update(siteId=f.proof["site_id"], canonicalHost=f.proof["canonical_host"])
        detail = value["pages"][0]
        detail.update(pageId=pin["page_id"], revisionHash=pin["revision_sha256"], planningHash=pin["planning_sha256"],
            reviewCurrent=True, reviewer=payload["actorId"], reviewedAt="2026-10-16T01:00:00Z", factChecks=[])
        item = value["workflow"]["pages"][0]
        item.update(pageId=pin["page_id"], revisionHash=pin["revision_sha256"], reviewCurrent=True)
        approved = payload["action"] == "approve-batch"
        if approved:
            detail.update(hasApprovedRevision=True, approvedRevisionHash=pin["revision_sha256"])
            item["hasApprovedRevision"] = True
        binding = {key: data for key, data in payload.items() if key not in {
            "command", "artifactsRoot", "dataDir", "outputDir", "authorizingSessionId"}}
        result.clear()
        result.update(version=editorial.VERSION, state="applied", operationId=context["operation_id"], creationId=IDENTITY,
            acceptedRevision=1, sourceHash=f.proof["candidate_sha256"], canonicalHost=f.proof["canonical_host"], siteId=f.proof["site_id"],
            action=payload["action"], actorId=payload["actorId"], requestHash=editorial.digest(binding), beforeSiteHash=context["expected_site_sha256"],
            appliedSiteHash="8" * 64, beforeEvidenceSha256="3" * 64, receiptSha256="4" * 64,
            pageRevisions=[{"pageId": pin["page_id"], "revisionHash": pin["revision_sha256"], "planningHash": pin["planning_sha256"],
                "reviewSha256": "5" * 64, "reviewer": payload["actorId"], "approvedRevisionHash": pin["revision_sha256"] if approved else None,
                "approvalSha256": "6" * 64 if approved else None}], changed=True, replayed=False,
            editorialReview="not-performed" if approved else "recorded", approval="approved" if approved else "not-performed",
            release="not-performed", deployment="not-performed", fullSite="UNVERIFIED", launch="UNVERIFIED")
        value["operation"] = {"command": editorial.COMMAND, "deployment": "not-performed", "result": result}
        return value

    monkeypatch.setattr(editorial.studio, "_execute", execute)
    return SimpleNamespace(f=f, context=context, pin=pin, request=request, execute=execute, seen=seen, result=result)


def test_explicit_session_review_bridge_has_a_separate_native_authority():
    module = import_module("pinet_core.creation.editorial_review")
    assert module.COMMAND == "review-editorial"
    assert module.VERSION == "native-editorial-review.v1"


@pytest.mark.parametrize("action", ["record-review", "approve-batch"])
async def test_fixed_current_session_uses_separate_writer_and_preserves_unverified_release(reviewed, action):
    p = reviewed
    function = editorial.record_review if action == "record-review" else editorial.approve_batch
    request = p.request if action == "record-review" else editorial.ApproveBatch(**p.context, pages=[editorial.PagePin(**p.pin)])
    value = await function(p.f.tx, p.f.session, IDENTITY, request)
    assert p.f.state.calls == 1 and p.f.state.locks[0] is True and len(p.f.state.locks) >= 4
    assert value["operation"]["action"] == action and value["operation"]["actor_id"] == "session-user:" + p.f.session.user_id
    assert value["operation"]["release"] == "not-performed" and value["operation"]["full_site"] == "UNVERIFIED"
    assert value["completion"]["private_release_status"] == value["completion"]["launch_status"] == "UNVERIFIED"
    assert p.f.session.id not in str(value) and "dataDir" not in str(value)


@pytest.mark.parametrize("field,value", [("actor_id", "forged"), ("reviewer", "invented"), ("action", "release"),
    ("patch", {"factChecks": []}), ("command", "approve-batch"), ("source_path", "foreign")])
def test_request_cannot_supply_identity_commands_or_mutation_authority(reviewed, field, value):
    with pytest.raises(ValidationError):
        editorial.RecordReview.model_validate({**reviewed.request.model_dump(), field: value})


@pytest.mark.parametrize("mutation", ["missing", "empty", "pass", "foreign", "numeric"])
def test_review_requires_all_six_explicit_meaningful_notes(reviewed, mutation):
    data = reviewed.request.model_dump()
    if mutation == "missing":
        del data["evidence"]["facts"]
    else:
        data["evidence"]["facts" if mutation != "foreign" else "invented"] = {
            "empty": " " * 30, "pass": "PASS", "foreign": "A foreign review area is not authority.", "numeric": True}[mutation]
    with pytest.raises(ValidationError):
        editorial.RecordReview.model_validate(data)


def test_batch_requires_unique_exact_page_pins(reviewed):
    p = reviewed
    for pages in ([], [p.pin, p.pin], [{**p.pin, "planning_sha256": None}], [p.pin] * 201):
        with pytest.raises(ValidationError):
            editorial.ApproveBatch.model_validate({**p.context, "pages": pages})


@pytest.mark.parametrize("condition,code", [("owner", "unauthenticated"), ("source", "source_unavailable"),
    ("guide", "content_work_busy"), ("creation", "editorial_revision_unavailable"), ("candidate", "editorial_context_stale")])
async def test_current_owner_source_busy_and_accepted_pins_refuse_before_node(reviewed, condition, code):
    p = reviewed
    if condition == "owner":
        p.f.state.owner = False
    elif condition == "source":
        p.f.state.current = False
    elif condition == "guide":
        p.f.state.busy = True
    elif condition == "creation":
        p.f.row.active_job_id = str(uuid4())
    else:
        p.f.proof["candidate_sha256"] = "f" * 64
    with pytest.raises(ControlError, match=code):
        await editorial.record_review(p.f.tx, p.f.session, IDENTITY, p.request)
    assert p.f.state.calls == 0


@pytest.mark.parametrize("code,status", [("workflow_review_uncertain", 409), ("workflow_review_rejected", 409),
    ("workflow_review_conflict", 409), ("authorization_revoked", 401), ("native_failed", 503)])
async def test_transport_refusal_is_never_an_implicit_retry(reviewed, monkeypatch, code, status):
    p = reviewed
    async def failed(*args):
        p.f.state.calls += 1
        raise RunnerError(code)
    monkeypatch.setattr(editorial.studio, "_execute", failed)
    with pytest.raises(ControlError) as caught:
        await editorial.record_review(p.f.tx, p.f.session, IDENTITY, p.request)
    assert caught.value.status == status and p.f.state.calls == 1


async def test_lost_authority_after_native_receipt_never_reports_success(reviewed, monkeypatch):
    p = reviewed
    async def late(*args):
        result = await p.execute(*args)
        p.f.state.owner = False
        return result
    monkeypatch.setattr(editorial.studio, "_execute", late)
    with pytest.raises(ControlError, match="unauthenticated"):
        await editorial.record_review(p.f.tx, p.f.session, IDENTITY, p.request)
    assert p.f.state.calls == 1 and p.result["state"] == "applied"


async def test_review_preserves_older_approval_without_approving_the_current_draft(reviewed, monkeypatch):
    p = reviewed
    async def retained(*args):
        value = await p.execute(*args)
        row = value["operation"]["result"]["pageRevisions"][0]
        row.update(approvedRevisionHash="7" * 64, approvalSha256="9" * 64)
        value["pages"][0].update(hasApprovedRevision=True, approvedRevisionHash="7" * 64)
        value["workflow"]["pages"][0]["hasApprovedRevision"] = True
        return value
    monkeypatch.setattr(editorial.studio, "_execute", retained)
    value = await editorial.record_review(p.f.tx, p.f.session, IDENTITY, p.request)
    page = value["operation"]["pages"][0]
    assert page["approved_revision_sha256"] == "7" * 64 != page["revision_sha256"]
    assert page["approval_sha256"] == "9" * 64 and value["operation"]["approval"] == "not-performed"


@pytest.mark.parametrize("key,value", [("requestHash", "f" * 64), ("actorId", "session-user:" + str(uuid4())),
    ("release", "PASS"), ("changed", 1), ("pageRevisions", []), ("unrequested", True)])
async def test_untrusted_native_receipt_cannot_substitute_scope_or_gates(reviewed, monkeypatch, key, value):
    p = reviewed
    async def corrupt(*args):
        result = await p.execute(*args)
        result["operation"]["result"][key] = value
        return result
    monkeypatch.setattr(editorial.studio, "_execute", corrupt)
    with pytest.raises(ControlError, match="invalid_editorial_review_source"):
        await editorial.record_review(p.f.tx, p.f.session, IDENTITY, p.request)


async def test_router_is_bounded_strict_and_mounted_in_both_maintained_apis(reviewed, monkeypatch):
    p = reviewed
    for key, value in {"control_enabled": True, "control_mode": "local", "environment": "test-editorial-review",
            "control_cursor_secret": "c" * 40, "control_source_revision": p.f.cfg.control_source_revision,
            "control_session_seconds": 3600}.items():
        monkeypatch.setattr(settings(), key, value)
    app = FastAPI()
    app.include_router(router)
    async def auth():
        yield p.f.tx, p.f.session
    app.dependency_overrides[authenticated] = auth
    app.dependency_overrides[customer_guard] = lambda: None
    @app.middleware("http")
    async def identity(request: Request, call_next):
        request.state.control_request_id = str(uuid4())
        return await call_next(request)
    url = "/customer/v2/creations/" + IDENTITY + "/editorial-reviews"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 1234)), base_url="http://127.0.0.1") as client:
        value = await client.post(url, json=p.request.model_dump(mode="json"))
        assert value.status_code == 200, value.text
        assert value.json()["contract_version"] == editorial.CONTRACT
        assert (await client.post(url, json={**p.request.model_dump(mode="json"), "reviewer": "forged"})).status_code == 400
        assert (await client.post(url + "?command=release", json=p.request.model_dump(mode="json"))).status_code == 400
        assert (await client.post(url, content=b" " * 131073, headers={"content-type": "application/json"})).status_code == 400
    from pinet_core import api, control_api
    for mounted in (api.app, control_api.app):
        paths = mounted.openapi()["paths"]
        assert url.replace(IDENTITY, "{creation_id}") in paths
        assert "/customer/v2/creations/{creation_id}/editorial-approvals" in paths
