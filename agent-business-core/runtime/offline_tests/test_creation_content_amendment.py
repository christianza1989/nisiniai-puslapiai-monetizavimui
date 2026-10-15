"""No-provider authority and exact receipt binding for deterministic copy edits."""
from types import SimpleNamespace

import pytest
from test_creation_media import IDENTITY
from test_creation_media import fixture as media_fixture  # noqa: F401

from pinet_core.control.routes import ControlError
from pinet_core.creation import content_amendment as copy
from pinet_core.tasks.codex_transport import RunnerError

OPERATION = "12345678-1234-4234-8234-000000000001"


@pytest.fixture
def amendment(media_fixture, monkeypatch):  # noqa: F811
    f = media_fixture
    f.proof["site_id"] = "creation-" + IDENTITY.replace("-", "")
    request = copy.Amendment(**{key: getattr(f.request, key) for key in (
        "accepted_revision", "candidate_sha256", "canonical_host", "page_id", "expected_site_sha256",
        "expected_revision_sha256", "expected_planning_sha256")}, operation_id=OPERATION,
        patch={"title": "Tikslus privataus juodraščio pavadinimas"})
    completion = {"site_context_sha256": "8" * 64, "pages": [{"page_id": request.page_id,
        "revision_sha256": "2" * 64, "planning_sha256": request.expected_planning_sha256}]}
    monkeypatch.setattr(copy, "parse_node", lambda *_: completion)
    result = {}

    async def execute(arguments, payload, environment, authorized, seconds):
        f.state.calls += 1
        assert seconds == 20 and await authorized()
        assert arguments[1].name == "customer-content-workflow.mjs"
        assert payload["command"] == copy.COMMAND
        assert payload["operationId"] == OPERATION and payload["pageId"] == request.page_id
        assert payload["dataDir"].replace("\\", "/").endswith(f"/customer-content/{IDENTITY}/revision-1/data")
        assert "sourcePath" not in payload and "provider" not in payload
        binding = {key: value for key, value in payload.items()
                   if key not in {"command", "artifactsRoot", "dataDir", "outputDir"}}
        result.update(version="native-reviewed-copy-amendment.v1", state="applied", operationId=OPERATION,
            creationId=IDENTITY, acceptedRevision=1, sourceHash=request.candidate_sha256,
            canonicalHost=request.canonical_host, siteId=f.proof["site_id"], pageId=request.page_id,
            requestHash=copy.digest(binding), receiptSha256="3" * 64,
            beforeSiteHash=request.expected_site_sha256, beforeRevisionHash=request.expected_revision_sha256,
            beforePlanningHash=request.expected_planning_sha256, beforePageSha256="4" * 64,
            appliedSiteHash=completion["site_context_sha256"], appliedRevisionHash="2" * 64,
            appliedPlanningHash=request.expected_planning_sha256, appliedPageSha256="5" * 64,
            changed=True, replayed=False, **dict.fromkeys(copy.AUTHORITY, "not-performed"))
        return {"operation": {"command": copy.COMMAND, "deployment": "not-performed", "result": result}}

    monkeypatch.setattr(copy.studio, "_execute", execute)
    return SimpleNamespace(f=f, request=request, completion=completion, result=result, execute=execute)


async def test_copy_uses_same_current_owner_guard_and_fixed_stable_artifact_paths(amendment):
    a = amendment
    value = await copy.amend(a.f.tx, a.f.session, IDENTITY, a.request)
    assert a.f.state.calls == 1 and a.f.state.locks[0] is True and len(a.f.state.locks) >= 3
    assert value["amendment"]["editorialReview"] == "not-performed"
    assert value["completion"] == a.completion


@pytest.mark.parametrize("condition,code", [
    ("guide", "content_work_busy"), ("owner", "unauthenticated"),
    ("source", "source_unavailable"), ("revision", "content_revision_unavailable"),
    ("candidate", "content_context_stale"),
])
async def test_copy_does_not_start_child_with_stale_authority(amendment, condition, code):
    a, f = amendment, amendment.f
    if condition == "guide":
        f.state.busy = True
    elif condition == "owner":
        f.state.owner = False
    elif condition == "source":
        f.state.current = False
    elif condition == "revision":
        f.row.current_revision = 2
    else:
        f.proof["candidate_sha256"] = "9" * 64
    with pytest.raises(ControlError) as error:
        await copy.amend(f.tx, f.session, IDENTITY, a.request)
    assert error.value.code == code and f.state.calls == 0


async def test_historical_source_cannot_skip_explicit_continuation(amendment, monkeypatch):
    a = amendment
    a.f.proof["accepted_source_revision"] = "0" * 40

    async def missing(*_):
        return False

    from pinet_core.creation import media
    monkeypatch.setattr(media.continuation, "schema_ready", missing)
    with pytest.raises(ControlError) as error:
        await copy.amend(a.f.tx, a.f.session, IDENTITY, a.request)
    assert error.value.code == "build_continuation_stale" and a.f.state.calls == 0


@pytest.mark.parametrize("field,value", [
    ("requestHash", "0" * 64), ("beforeRevisionHash", "0" * 64), ("appliedSiteHash", "0" * 64),
    ("appliedPlanningHash", "0" * 64), ("pageId", "page-" + "0" * 24),
    ("operationId", "00000000-0000-4000-8000-000000000000"),
    ("approval", "performed"), ("sourceVerification", "performed"), ("editorialReview", "PASS"),
    ("changed", 1), ("receiptSha256", "invalid"), ("unexpectedAuthority", True),
])
async def test_forged_or_unbound_receipt_cannot_be_returned(amendment, monkeypatch, field, value):
    a = amendment

    async def execute(*args, **kwargs):
        output = await a.execute(*args, **kwargs)
        a.result[field] = value
        return output

    monkeypatch.setattr(copy.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await copy.amend(a.f.tx, a.f.session, IDENTITY, a.request)
    assert error.value.code == "invalid_content_amendment_source"


@pytest.mark.parametrize("patch", [{}, {"body": None}, {"approval": True}, {"title": " "},
    {"body": [{}] * 301}, {"body": [{"text": "ą" * 100001}]}])
async def test_copy_patch_is_bounded_and_cannot_set_authority(amendment, patch):
    a = amendment
    with pytest.raises(ControlError) as error:
        await copy.amend(a.f.tx, a.f.session, IDENTITY, {**a.request.model_dump(), "patch": patch})
    assert error.value.code == "invalid_content_amendment" and a.f.state.calls == 0


async def test_authority_lost_after_child_does_not_fabricate_success(amendment, monkeypatch):
    a = amendment

    async def execute(*args, **kwargs):
        output = await a.execute(*args, **kwargs)
        a.f.state.owner = False
        return output

    monkeypatch.setattr(copy.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await copy.amend(a.f.tx, a.f.session, IDENTITY, a.request)
    assert error.value.code == "unauthenticated" and a.f.state.calls == 1


@pytest.mark.parametrize("code,status", [("workflow_context_stale", 409), ("workflow_amendment_uncertain", 409),
    ("workflow_amendment_receipt_conflict", 409), ("authorization_revoked", 401), ("studio_timeout", 503)])
async def test_uncertain_write_keeps_failure_instead_of_retrying(amendment, monkeypatch, code, status):
    async def execute(*_, **__):
        amendment.f.state.calls += 1
        raise RunnerError(code)

    monkeypatch.setattr(copy.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await copy.amend(amendment.f.tx, amendment.f.session, IDENTITY, amendment.request)
    assert error.value.code == code and error.value.status == status and amendment.f.state.calls == 1
