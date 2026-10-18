"""Offline authority/contract tests; no real DB, provider or native customer case."""
import json
import os
import shutil
import subprocess
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_creation_media import IDENTITY
from test_creation_media import fixture as media_fixture  # noqa: F401

from pinet_core.control.routes import ControlError
from pinet_core.creation import editorial_preparation as editorial
from pinet_core.creation import media
from pinet_core.tasks.codex_transport import RunnerError

OPERATION = "12345678-1234-4234-8234-000000000039"
REAL_ROOT = editorial.studio.ROOT
REAL_EXECUTE = editorial.studio._execute
REAL_PARSE = editorial.parse_node


@pytest.fixture
def prepared(media_fixture, monkeypatch):  # noqa: F811
    f = media_fixture
    f.proof["site_id"] = "creation-" + IDENTITY.replace("-", "")
    context = {k: getattr(f.request, k) for k in ("accepted_revision", "candidate_sha256", "canonical_host")}
    request = editorial.Preparation(**context, action="amend-site", operation_id=OPERATION,
        expected_site_sha256=f.request.expected_site_sha256, patch={"facts": "Only an isolated synthetic test."})
    page = {"page_id": f.request.page_id, "type": "guide", "revision_sha256": "2" * 64,
            "planning_sha256": f.request.expected_planning_sha256}
    completion = {"site_context_sha256": "8" * 64, "pages": [page]}
    monkeypatch.setattr(editorial, "parse_node", lambda *_: completion)
    result, seen = {}, []

    async def execute(arguments, payload, environment, authorized, seconds):
        f.state.calls += 1
        assert seconds == 20 and await authorized()
        assert arguments[1].name == "customer-content-workflow.mjs"
        assert environment == {"PATH": "inert"}
        assert payload["dataDir"].replace("\\", "/").endswith(f"/customer-content/{IDENTITY}/revision-1/data")
        assert set(payload).isdisjoint({"sourcePath", "provider", "executable", "actorId", "review"})
        seen.append(payload)
        if payload["command"] in {"status", "prepare"}:
            return {"pageData": {"id": page["page_id"], "siteId": f.proof["site_id"], "type": page["type"],
                "publishAt": "2026-01-01T00:00:00.000Z", "editorial": {}, "linkSuggestions": [],
                "body": [{"private": "Not returned by status metadata projection"}]}}
        binding = {k: v for k, v in payload.items() if k not in {"command", "artifactsRoot", "dataDir", "outputDir"}}
        ids = payload.get("pageIds", [payload["pageId"]] if "pageId" in payload else [])
        result.update(version=editorial.VERSION, state="applied", operationId=payload["operationId"],
            creationId=IDENTITY, acceptedRevision=1, sourceHash=payload["sourceHash"], canonicalHost=payload["canonicalHost"],
            siteId=f.proof["site_id"], action=payload["action"], requestHash=editorial.digest(binding),
            beforeSiteHash=payload["expectedSiteHash"], appliedSiteHash=completion["site_context_sha256"],
            beforeEvidenceSha256="3" * 64, receiptSha256="4" * 64, plannedSiteSha256="5" * 64,
            pageRevisions=[{"pageId": p, "revisionHash": page["revision_sha256"], "planningHash": page["planning_sha256"]} for p in ids],
            changeRequired=True, changed=True, replayed=False, reconciled=False,
            **dict.fromkeys(editorial.AUTHORITY, "not-performed"))
        return {"operation": {"command": editorial.COMMAND, "deployment": "not-performed", "result": result}}

    monkeypatch.setattr(editorial.studio, "_execute", execute)
    return SimpleNamespace(f=f, context=context, request=request, completion=completion, result=result,
                           execute=execute, seen=seen, page=page)


async def test_current_guarded_operator_uses_fixed_context_without_new_authority(prepared):
    p = prepared
    value = await editorial.prepare(p.f.tx, p.f.session, IDENTITY, p.request)
    assert p.f.state.calls == 1 and p.f.state.locks[0] is True and len(p.f.state.locks) >= 3
    assert value["completion"] == p.completion
    assert all(value["preparation"][k] == "not-performed" for k in editorial.AUTHORITY)


@pytest.mark.parametrize("action", ["amend-page", "resolve-internal-links", "finalize-links"])
async def test_only_existing_metadata_and_link_operations_are_bound(prepared, action):
    p = prepared
    extra = ({"page_ids": [p.page["page_id"]]} if action == "finalize-links" else
        {"page_id": p.page["page_id"], "expected_revision_sha256": "e" * 64,
         "expected_planning_sha256": p.page["planning_sha256"]})
    if action == "amend-page":
        extra["patch"] = {"type": "index"}
    request = {**p.context, "action": action, "operation_id": OPERATION,
               "expected_site_sha256": p.request.expected_site_sha256, **extra}
    result = await editorial.prepare(p.f.tx, p.f.session, IDENTITY, request)
    assert result["preparation"]["action"] == action
    assert result["preparation"]["pageRevisions"][0]["pageId"] == p.page["page_id"]


async def test_status_is_fenced_read_only_and_projects_only_existing_metadata(prepared):
    p = prepared
    assert (await editorial.status(p.f.tx, p.f.session, IDENTITY, p.context))["page_metadata"] is None
    value = await editorial.status(p.f.tx, p.f.session, IDENTITY, {**p.context, "page_id": p.page["page_id"]})
    assert set(value["page_metadata"]) == {"type", "publishAt", "editorial", "linkSuggestions"}
    assert [v["command"] for v in p.seen] == ["status", "prepare"]
    assert all("operationId" not in v for v in p.seen)


@pytest.mark.parametrize("condition,code", [
    ("guide", "content_work_busy"), ("owner", "unauthenticated"), ("source", "source_unavailable"),
    ("revision", "editorial_revision_unavailable"), ("archive", "editorial_revision_unavailable"),
    ("active", "editorial_revision_unavailable"), ("candidate", "editorial_context_stale"),
    ("host", "editorial_context_stale")])
async def test_stale_revoked_or_busy_context_never_starts_a_child(prepared, condition, code):
    p, f = prepared, prepared.f
    if condition == "guide":
        f.state.busy = True
    elif condition == "owner":
        f.state.owner = False
    elif condition == "source":
        f.state.current = False
    elif condition == "revision":
        f.row.current_revision = 2
    elif condition == "archive":
        f.state.archived = True
    elif condition == "active":
        f.row.active_job_id = OPERATION
    else:
        f.proof["canonical_host" if condition == "host" else "candidate_sha256"] = "foreign.invalid" if condition == "host" else "0" * 64
    with pytest.raises(ControlError) as error:
        await editorial.prepare(f.tx, f.session, IDENTITY, p.request)
    assert error.value.code == code and f.state.calls == 0
    with pytest.raises(ControlError):
        await editorial.status(f.tx, f.session, IDENTITY, p.context)
    assert f.state.calls == 0


async def test_private_effective_host_works_without_writing_null_public_host(prepared):
    p = prepared
    p.f.row.canonical_host = None
    private_host = IDENTITY.replace("-", "") + ".preview.invalid"
    p.f.proof["canonical_host"] = private_host
    request = {**p.request.model_dump(exclude_unset=True), "canonical_host": private_host}
    assert (await editorial.prepare(p.f.tx, p.f.session, IDENTITY, request))["preparation"]["canonicalHost"] == private_host
    assert p.f.row.canonical_host is None


async def test_historical_acceptance_requires_exact_current_s6(prepared, monkeypatch):
    p = prepared
    p.f.proof["accepted_source_revision"] = "0" * 40

    async def missing(*_):
        return False

    monkeypatch.setattr(media.continuation, "schema_ready", missing)
    with pytest.raises(ControlError) as error:
        await editorial.prepare(p.f.tx, p.f.session, IDENTITY, p.request)
    assert error.value.code == "build_continuation_stale" and p.f.state.calls == 0

    async def current(*_):
        return True

    monkeypatch.setattr(media.continuation, "schema_ready", current)
    monkeypatch.setattr(media.continuation, "latest", current)
    monkeypatch.setattr(media.continuation, "current", current)
    assert (await editorial.prepare(p.f.tx, p.f.session, IDENTITY, p.request))["preparation"]["state"] == "applied"


@pytest.mark.parametrize("override", [
    {"action": "approve-batch"}, {"action": "release"}, {"sourcePath": "foreign"}, {"provider": "paid"},
    {"expected_site_sha256": "bad"}, {"accepted_revision": True}, {"operation_id": "../foreign"},
    {"page_id": "page-foreign"}, {"patch": {}}, {"patch": {"facts": None}},
    {"patch": {"canonicalHost": "foreign.invalid"}}, {"patch": {"contentPolicy": {}}},
    {"patch": {"facts": "x" * 12001}}, {"patch": {"brand": {"accent": "invalid"}}}])
async def test_strict_operator_request_cannot_add_paths_authority_or_change_action_shape(prepared, override):
    p = prepared
    with pytest.raises(ControlError) as error:
        await editorial.prepare(p.f.tx, p.f.session, IDENTITY, {**p.request.model_dump(exclude_unset=True), **override})
    assert error.value.code == "invalid_editorial_preparation" and p.f.state.calls == 0


@pytest.mark.parametrize("value", [2.0, -0.0, 9007199254740992])
async def test_metadata_json_number_drift_refuses_before_native_write(prepared, value):
    p = prepared
    request = {**p.context, "action": "amend-page", "operation_id": OPERATION,
        "expected_site_sha256": p.request.expected_site_sha256, "page_id": p.page["page_id"],
        "expected_revision_sha256": "e" * 64, "expected_planning_sha256": "f" * 64,
        "patch": {"editorial": {"readingMinutes": value}}}
    with pytest.raises(ControlError) as error:
        await editorial.prepare(p.f.tx, p.f.session, IDENTITY, request)
    assert error.value.status == 400 and p.f.state.calls == 0


@pytest.mark.parametrize("field,value", [
    ("requestHash", "0" * 64), ("action", "release"), ("appliedSiteHash", "0" * 64),
    ("pageRevisions", [{"pageId": "foreign"}]), ("beforeEvidenceSha256", "bad"), ("receiptSha256", "bad"),
    ("operationId", "00000000-0000-4000-8000-000000000000"), ("approval", "performed"),
    ("editorialReview", "PASS"), ("changed", 1), ("unexpectedAuthority", True), ("reconciled", True)])
async def test_forged_or_unbound_receipt_cannot_be_reported(prepared, monkeypatch, field, value):
    p = prepared

    async def execute(*args, **kwargs):
        output = await p.execute(*args, **kwargs)
        p.result[field] = value
        return output

    monkeypatch.setattr(editorial.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await editorial.prepare(p.f.tx, p.f.session, IDENTITY, p.request)
    assert error.value.code == "invalid_editorial_preparation_source"


@pytest.mark.parametrize("condition", ["owner", "source", "guide", "accepted"])
async def test_authority_loss_after_child_never_fabricates_success_or_retries(prepared, monkeypatch, condition):
    p = prepared

    async def execute(*args, **kwargs):
        output = await p.execute(*args, **kwargs)
        if condition == "owner":
            p.f.state.owner = False
        elif condition == "source":
            p.f.cfg.control_source_revision = "0" * 40
        elif condition == "guide":
            p.f.state.busy = True
        else:
            p.f.proof["candidate_sha256"] = "0" * 64
        return output

    monkeypatch.setattr(editorial.studio, "_execute", execute)
    with pytest.raises(ControlError):
        await editorial.prepare(p.f.tx, p.f.session, IDENTITY, p.request)
    assert p.f.state.calls == 1 and p.result["state"] == "applied"


@pytest.mark.parametrize("code,status", [("workflow_context_stale", 409), ("workflow_preparation_uncertain", 409),
    ("workflow_preparation_receipt_conflict", 409), ("workflow_preparation_busy", 409),
    ("authorization_revoked", 401), ("studio_timeout", 503)])
async def test_uncertain_failure_retains_original_code_and_never_retries(prepared, monkeypatch, code, status):
    async def execute(*_, **__):
        prepared.f.state.calls += 1
        raise RunnerError(code)

    monkeypatch.setattr(editorial.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await editorial.prepare(prepared.f.tx, prepared.f.session, IDENTITY, prepared.request)
    assert error.value.code == code and error.value.status == status and prepared.f.state.calls == 1


async def test_explicit_caller_revocation_cannot_enter_the_operator(prepared):
    async def revoked():
        return False

    with pytest.raises(ControlError) as error:
        await editorial.prepare(prepared.f.tx, prepared.f.session, IDENTITY, prepared.request, still_authorized=revoked)
    assert error.value.code == "unauthenticated" and prepared.f.state.calls == 0


async def test_actual_python_node_receipts_and_status_roundtrip_in_isolated_native_fixture(media_fixture, monkeypatch):  # noqa: F811
    """Real transport/model/receipts/parser; authority remains an explicit offline seam."""
    f = media_fixture
    node = shutil.which("node")
    assert node, "Node is required for the canonical adapter regression"
    _, _, artifacts, _ = editorial.studio.configuration()
    artifacts.mkdir(parents=True)
    network = artifacts / "synthetic-network.json"
    network.write_text(json.dumps({"defaultEmail": "unused@example.invalid", "operatorName": "Synthetic operator", "contactsBySite": {}}))
    env = {k: v for k, v in os.environ.items() if k.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"}}
    env["STUDIO_NETWORK_SETTINGS"] = str(network)
    section = {"heading": "Synthetic private preparation", "body": "This isolated synthetic editorial fixture makes no claim about a real customer, manufacturer, professional author, commercial delivery or public launch.", "items": []}
    draft = {"business_name": "Isolated preparation", "tagline": "Synthetic private fixture", "business": {"customer": "Synthetic team"}, "brand": {"accent": "indigo"},
        "pages": [{"path": p, "title": "Synthetic preparation page", "navigation_label": "Test", "meta_description": "Isolated synthetic preparation page description.",
                   "intent": "Inspect one isolated preparation operation.", "sections": [section, section]} for p in ("/", "/gidai/", "/kontaktai/")], "content_plan": []}
    native_host = IDENTITY.replace("-", "") + ".preview.invalid"
    directory = artifacts / "customer-content" / IDENTITY / "revision-1"
    base = {"creationId": IDENTITY, "acceptedRevision": 1, "sourceHash": editorial.digest(draft), "canonicalHost": native_host,
            "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    imported = subprocess.run([node, str(REAL_ROOT / "content-studio/scripts/customer-creation-intake.mjs")],
        input=json.dumps({**base, "draft": draft}), text=True, encoding="utf-8", capture_output=True, env=env, timeout=20)
    assert imported.returncode == 0, imported.stderr
    receipt = json.loads(imported.stdout)
    f.row.id, f.row.canonical_host = IDENTITY, None
    f.proof.update(candidate_sha256=base["sourceHash"], canonical_host=native_host, site_id=receipt["siteId"])
    monkeypatch.setattr(editorial.studio, "ROOT", REAL_ROOT)
    monkeypatch.setattr(editorial.studio, "configuration", lambda: (node, None, artifacts, env))
    monkeypatch.setattr(editorial.studio, "_execute", REAL_EXECUTE)
    monkeypatch.setattr(editorial, "parse_node", REAL_PARSE)
    original = {name: (directory / name).read_bytes() for name in ("source-draft.json", "intake-context.json", "intake-manifest.json")}
    context = {"accepted_revision": 1, "candidate_sha256": base["sourceHash"], "canonical_host": native_host}
    current = (await editorial.status(f.tx, f.session, IDENTITY, context))["completion"]
    request = {**context, "action": "amend-site", "operation_id": str(uuid4()), "expected_site_sha256": current["site_context_sha256"],
               "patch": {"facts": "Only an isolated synthetic fixture.", "contact": {"email": "fixture@example.invalid", "phone": ""}, "operatorName": "Synthetic operator"}}
    applied = await editorial.prepare(f.tx, f.session, IDENTITY, request)
    replay = await editorial.prepare(f.tx, f.session, IDENTITY, request)
    assert replay["preparation"]["receiptSha256"] == applied["preparation"]["receiptSha256"]
    assert replay["preparation"]["replayed"] and not replay["preparation"]["changed"]
    page = next(p for p in applied["completion"]["pages"] if p["path"] == "/gidai/")
    observed = await editorial.status(f.tx, f.session, IDENTITY, {**context, "page_id": page["page_id"]})
    metadata = observed["page_metadata"]
    assert "body" not in metadata and metadata["type"] == "index"
    metadata["editorial"]["authors"] = [{"id": "synthetic-editor", "siteId": receipt["siteId"], "locale": "lt-LT", "slug": "synthetic",
        "name": "Synthetic editorial organization", "role": "Isolated test", "bio": "No real expert or manufacturer is represented.", "kind": "organization", "sameAs": []}]
    amended = await editorial.prepare(f.tx, f.session, IDENTITY, {**context, "action": "amend-page", "operation_id": str(uuid4()),
        "expected_site_sha256": observed["completion"]["site_context_sha256"], "page_id": page["page_id"],
        "expected_revision_sha256": page["revision_sha256"], "expected_planning_sha256": page["planning_sha256"], "patch": metadata})
    final = await editorial.prepare(f.tx, f.session, IDENTITY, {**context, "action": "finalize-links", "operation_id": str(uuid4()),
        "expected_site_sha256": amended["completion"]["site_context_sha256"], "page_ids": [p["page_id"] for p in amended["completion"]["pages"]]})
    assert not any(p["has_approved_revision"] or p["review_current"] for p in final["completion"]["pages"])
    lost = {**context, "action": "amend-site", "operation_id": str(uuid4()),
            "expected_site_sha256": final["completion"]["site_context_sha256"],
            "patch": {"audience": "Synthetic audience written before authority is revoked."}}

    async def lose_after_actual_write(*args, **kwargs):
        value = await REAL_EXECUTE(*args, **kwargs)
        f.state.owner = False
        return value

    monkeypatch.setattr(editorial.studio, "_execute", lose_after_actual_write)
    with pytest.raises(ControlError) as error:
        await editorial.prepare(f.tx, f.session, IDENTITY, lost)
    assert error.value.code == "unauthenticated"
    after_file = directory / "editorial-preparations" / (lost["operation_id"] + ".after.json")
    retained_after = after_file.read_bytes()
    site_file = directory / "data/sites" / (receipt["siteId"] + ".json")
    retained_site = site_file.read_bytes()
    f.state.owner = True  # explicit synthetic renewal, not an automatic production retry
    monkeypatch.setattr(editorial.studio, "_execute", REAL_EXECUTE)
    reconciled = await editorial.prepare(f.tx, f.session, IDENTITY, lost)
    assert reconciled["preparation"]["replayed"] and not reconciled["preparation"]["changed"]
    assert after_file.read_bytes() == retained_after and site_file.read_bytes() == retained_site
    assert all((directory / name).read_bytes() == raw for name, raw in original.items())
    assert f.row.canonical_host is None
