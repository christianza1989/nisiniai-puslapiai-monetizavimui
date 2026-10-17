"""Explicit current-authority continuity state machine, no DB/provider/customer files."""
import copy
import hashlib
import json
import os
import shutil
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_private_preview import (
    recovery,  # noqa: F401
    request,
)

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import private_native_continuity as observer
from pinet_core.creation import private_preview as service
from pinet_core.creation.models import PrivateIntakeReceipt
from pinet_core.creation.service import digest
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def continuity(recovery, monkeypatch):  # noqa: F811
    s = recovery
    s.pins = s.context()["native_sources"].copy()
    s.reads = 0
    capture, scalar = service.capture, s.tx.scalar

    async def current_capture(*args, **kwargs):
        revision, observed = await capture(*args, **kwargs)
        observed["native_sources"] = s.pins.copy()
        return revision, observed

    async def anchor_query(statement):
        params = statement.compile().params
        if params.get("state_1") == "private_draft_imported":
            return next((r for r in reversed(s.requests) if "continuity" not in r.context
                and r.revision_id == params["revision_id_1"]
                and any(p.recovery_id == r.id and p.state == "private_draft_imported" for p in s.receipts)), None)
        return await scalar(statement)

    async def initial(payload, **kwargs):
        intake = await s.runner(payload, **kwargs)
        return {**intake, "siteId": "creation-" + s.creation.id.replace("-", ""), "requestHash": "2" * 64,
            "siteFileHash": "3" * 64, "fullF1": "UNVERIFIED", "launch": "UNVERIFIED", "deployment": "not-performed",
            "manifestPath": "synthetic-only", "dataDir": "synthetic-only", "outputDir": "synthetic-only", "replayed": False,
            "workflow": {"siteId": "creation-" + s.creation.id.replace("-", ""), "canonicalHost": service.private_host(s.creation.id),
                         "workflowVersion": 1, "deployment": "not-verified-by-studio"}}

    async def read(*, context, anchor_intake, still_authorized, seconds):
        s.reads += 1
        assert s.scopes == 0 and seconds == 20 and await still_authorized()
        assert context["source_revision"] == settings().control_source_revision
        assert "nativeContinuity" not in anchor_intake
        note = {"version": observer.VERSION, "anchor": context["continuity"], "observed_at": utcnow().isoformat(),
            "source_draft_sha256": s.revision.material_hash, "intake_context_sha256": anchor_intake["requestHash"],
            "manifest_sha256": context["continuity"]["manifest_sha256"], "site_sha256": "4" * 64,
            "assets_sha256": {}, "native_state": "private-v2", **dict.fromkeys(observer.AUTHORITY, "not-performed")}
        return {**anchor_intake, "replayed": True, "nativeContinuity": note}

    monkeypatch.setattr(service, "capture", current_capture)
    monkeypatch.setattr(s.tx, "scalar", anchor_query)
    monkeypatch.setattr(observer, "observer_sha256", lambda: "9" * 64)
    s.initial, s.reader = initial, read
    return s


async def imported(s):
    value = request(s)
    result = await service.prepare("token", s.creation.id, value, intake_runner=s.initial)
    assert result["state"] == "private_draft_imported"
    original = copy.deepcopy((s.requests[0].context, s.receipts[0].intake, s.job.usage))
    settings().control_source_revision = "c" * 40
    return value, original


async def forbidden(*args, **kwargs):
    pytest.fail("A retained continuity request must never fall back to initial import")


async def test_explicit_new_source_uuid_reads_original_anchor_without_import_or_old_authority(continuity):
    s = continuity
    old, original = await imported(s)
    stale = await service.view(s.tx, s.session, s.creation)
    assert stale["state"] == "stale" and stale["native_host"] is None
    value = request(s)
    observed = await service.prepare("token", s.creation.id, value, intake_runner=forbidden, continuity_runner=s.reader)
    assert observed["state"] == "private_draft_imported" and observed["latest"]["source_revision"] == "c" * 40
    assert observed["latest"]["accepted_source_revision"] == "a" * 40
    assert s.calls == 1 and s.reads == 1 and len(s.requests) == len(s.receipts) == 2
    assert s.creation.canonical_host is None and (s.requests[0].context, s.receipts[0].intake, s.job.usage) == original
    assert s.requests[1].context["continuity"]["recovery_id"] == s.requests[0].id
    assert s.requests[1].context["continuity"]["intake_sha256"] == s.receipts[0].intake_sha256
    assert (await service.selected_intake(s.tx, s.creation, s.revision, s.job))[0] == service.private_host(s.creation.id)
    await service.prepare("token", s.creation.id, value, intake_runner=forbidden, continuity_runner=forbidden)
    assert s.reads == 1
    with pytest.raises(ControlError):
        await service.prepare("token", s.creation.id, old, intake_runner=forbidden, continuity_runner=forbidden)
    assert not any("s6" in key.lower() or "approval" in key.lower() for key in s.requests[1].context["continuity"])


async def test_later_renewal_anchors_original_import_not_a_chain_of_current_observations(continuity):
    s = continuity
    await imported(s)
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    settings().control_source_revision = "d" * 40
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    assert s.reads == 2 and s.calls == 1
    assert s.requests[2].context["continuity"]["recovery_id"] == s.requests[0].id
    assert s.receipts[0].intake.get("nativeContinuity") is None


async def test_explicit_paired_source_upgrade_retains_original_importer_and_current_execution_pins(continuity):
    s = continuity
    await imported(s)
    original = copy.deepcopy((s.requests[0].context, s.receipts[0].intake, s.job.usage))
    s.pins.update(public_source_revision="0" * 40, importer_sha256="1" * 64)
    value = await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    assert value["state"] == "private_draft_imported"
    marker = s.requests[-1].context["continuity"]
    assert marker["version"] == "private-native-anchor.v2"
    assert marker["origin_native_sources"] == original[0]["native_sources"]
    assert marker["execution_native_sources"] == s.pins
    assert marker["origin_source_revision"] == original[0]["source_revision"]
    assert marker["execution_source_revision"] == settings().control_source_revision
    assert s.receipts[-1].intake["importerHash"] == original[1]["importerHash"] != s.pins["importer_sha256"]
    assert (s.requests[0].context, s.receipts[0].intake, s.job.usage) == original
    assert s.calls == s.reads == 1
    replay = request(s, idempotency_key=s.requests[-1].idempotency_key)
    await service.prepare("token", s.creation.id, replay, intake_runner=forbidden, continuity_runner=forbidden)
    assert s.reads == 1 and len(s.requests) == len(s.receipts) == 2
    settings().control_source_revision = "d" * 40
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    assert s.requests[-1].context["continuity"]["recovery_id"] == s.requests[0].id
    assert s.requests[-1].context["continuity"]["origin_native_sources"] == original[0]["native_sources"]
    assert (s.requests[0].context, s.receipts[0].intake, s.job.usage) == original
    assert s.calls == 1 and s.reads == 2


async def test_expired_historical_session_is_evidence_only_new_verified_session_owns_renewal(continuity):
    s = continuity
    await imported(s)
    original_session = s.requests[0].session_id
    s.session.id = str(uuid4())
    value = await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    assert value["state"] == "private_draft_imported" and s.requests[1].session_id != original_session
    assert s.requests[0].session_id == original_session


async def test_retained_failure_is_not_retried_and_new_explicit_uuid_may_read_original_anchor(continuity):
    s = continuity
    await imported(s)
    failed_request = request(s)

    async def failed(**kwargs):
        s.reads += 1
        raise RunnerError("intake_artifact_changed")

    failed_view = await service.prepare("token", s.creation.id, failed_request, intake_runner=forbidden, continuity_runner=failed)
    assert failed_view["state"] == "failed"
    first_failure = {k: copy.deepcopy(getattr(s.receipts[1], k)) for k in PrivateIntakeReceipt.__table__.columns.keys()}
    await service.prepare("token", s.creation.id, failed_request, intake_runner=forbidden, continuity_runner=forbidden)
    assert s.reads == 1
    observed = await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    assert observed["state"] == "private_draft_imported"
    assert {k: getattr(s.receipts[1], k) for k in first_failure} == first_failure
    assert s.requests[2].context["continuity"]["recovery_id"] == s.requests[0].id


@pytest.mark.parametrize("key", ["public_source_revision", "importer_sha256", "network_sha256"])
async def test_native_drift_without_explicit_new_source_or_with_network_change_never_reads(continuity, key):
    s = continuity
    await imported(s)
    s.pins[key] = "0" * (40 if key.endswith("revision") else 64)
    if key != "network_sha256":
        settings().control_source_revision = s.requests[0].context["source_revision"]
    with pytest.raises(ControlError, match="private_intake_anchor_stale"):
        await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=forbidden)
    assert s.calls == 1 and s.reads == 0 and len(s.requests) == len(s.receipts) == 1


@pytest.mark.parametrize("change", ["candidate", "coordinator", "owner", "revoked", "source_context", "creation_source", "host"])
async def test_changed_accepted_scope_or_revoked_owner_cannot_reuse_anchor(continuity, change):
    s = continuity
    await imported(s)
    if change == "candidate":
        s.revision.material_hash = "0" * 64
    elif change == "coordinator":
        s.changed = True
    elif change == "owner":
        s.creation.user_id = str(uuid4())
    elif change == "source_context":
        s.context_extra = {"contextSha256": "0" * 64}
    elif change == "creation_source":
        s.creation.source_revision = "0" * 40
    elif change == "host":
        s.creation.canonical_host = "foreign.invalid"
    else:
        s.revoked = True
    with pytest.raises(ControlError):
        await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=forbidden)
    assert s.reads == 0 and s.calls == 1


async def test_explicit_anchor_cannot_cross_an_accepted_revision_identity(continuity):
    s = continuity
    await imported(s)
    original = await service.retained_anchor(s.tx, s.creation, s.context())
    s.revision.id = str(uuid4())
    with pytest.raises(ControlError, match="private_intake_anchor_stale"):
        await service.retained_anchor(s.tx, s.creation, s.context(), original[0])
    assert s.reads == 0


@pytest.mark.parametrize("change", ["revoked", "source", "active", "anchor", "public_source_revision", "importer_sha256", "network_sha256"])
async def test_authority_or_anchor_change_after_read_cannot_commit_new_receipt(continuity, change):
    s = continuity
    await imported(s)

    async def changed(**kwargs):
        value = await s.reader(**kwargs)
        if change == "revoked":
            s.revoked = True
        elif change == "source":
            settings().control_source_revision = "d" * 40
        elif change == "active":
            s.creation.active_job_id = str(uuid4())
        elif change == "anchor":
            s.receipts[0].intake_sha256 = "0" * 64
        else:
            s.pins[change] = "0" * (40 if change.endswith("revision") else 64)
        return value

    with pytest.raises(ControlError):
        await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=changed)
    assert len(s.requests) == 2 and len(s.receipts) == 1


@pytest.mark.parametrize("change", ["origin_importer", "origin_public", "execution_importer", "execution_source", "extra"])
async def test_paired_upgrade_marker_cannot_relabel_origin_or_execution(continuity, change):
    s = continuity
    await imported(s)
    s.pins.update(public_source_revision="0" * 40, importer_sha256="1" * 64)
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    marker = copy.deepcopy(s.requests[-1].context["continuity"])
    if change == "origin_importer":
        marker["origin_native_sources"]["importer_sha256"] = s.pins["importer_sha256"]
    elif change == "origin_public":
        marker["origin_native_sources"]["public_source_revision"] = "f" * 40
    elif change == "execution_importer":
        marker["execution_native_sources"]["importer_sha256"] = "f" * 64
    elif change == "execution_source":
        marker["execution_source_revision"] = "f" * 40
    else:
        marker["approval"] = "approved"
    with pytest.raises(ControlError):
        await service.retained_anchor(s.tx, s.creation, s.requests[-1].context, marker)
    assert len(s.requests) == len(s.receipts) == 2 and s.reads == 1


async def test_paired_upgrade_cannot_mislabel_original_intake_importer(continuity):
    s = continuity
    await imported(s)
    s.pins.update(public_source_revision="0" * 40, importer_sha256="1" * 64)
    s.requests[0].context["native_sources"]["importer_sha256"] = "2" * 64
    s.requests[0].context_sha256 = digest(s.requests[0].context)
    with pytest.raises(ControlError, match="private_intake_anchor_stale"):
        await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=forbidden)
    assert s.reads == 0 and len(s.requests) == len(s.receipts) == 1


async def test_continuity_marker_receipt_corruption_never_becomes_current(continuity):
    s = continuity
    await imported(s)
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    s.receipts[-1].intake["nativeContinuity"]["approval"] = "performed"
    s.receipts[-1].intake_sha256 = digest(s.receipts[-1].intake)
    with pytest.raises(ControlError, match="invalid_private_intake_source"):
        await service.selected_intake(s.tx, s.creation, s.revision, s.job)


async def test_missing_or_foreign_marker_is_not_replaced_by_another_anchor(continuity):
    s = continuity
    await imported(s)
    await service.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    marker = {**s.requests[-1].context["continuity"], "recovery_id": str(uuid4())}
    with pytest.raises(ControlError, match="private_intake_anchor_stale"):
        await service.retained_anchor(s.tx, s.creation, s.context(), marker)


@pytest.mark.parametrize("bad", [{}, None, {"version": observer.MARKER_VERSION}, {"version": observer.MARKER_VERSION, "provider": "paid"}])
def test_marker_is_strict_server_provenance_only(bad):
    with pytest.raises(ControlError, match="invalid_private_intake_source"):
        observer.checked_marker(bad)


@pytest.fixture
async def wrapped(continuity, monkeypatch, tmp_path):
    s = continuity
    await imported(s)
    marker, intake = await service.retained_anchor(s.tx, s.creation, s.context())
    context = {**s.context(), "continuity": marker}
    artifacts = tmp_path / "runtime/artifacts"
    seen = []
    monkeypatch.setattr(observer.studio, "configuration", lambda: (tmp_path / "inert-node", None, artifacts, {"PATH": "inert"}))

    async def execute(arguments, payload, environment, authorized, seconds):
        seen.append(payload)
        assert arguments[1].name == "customer-private-native-continuity.mjs"
        assert payload["version"] == "private-native-continuity-request.v1"
        assert payload["anchor"] == marker and payload["anchorIntake"] == intake
        assert payload["dataDir"] == str(artifacts / "customer-content" / s.creation.id / "revision-1/data")
        assert set(payload).isdisjoint({"draft", "provider", "command", "sourcePath", "model", "review"})
        assert environment == {"PATH": "inert"} and seconds == 20 and await authorized()
        return await s.reader(context=context, anchor_intake=intake, still_authorized=authorized, seconds=seconds)

    async def authorized():
        return True

    monkeypatch.setattr(observer.studio, "_execute", execute)
    return SimpleNamespace(s=s, context=context, intake=intake, marker=marker, seen=seen, execute=execute, authorized=authorized)


async def test_wrapper_calls_only_fixed_readonly_transport_and_preserves_initial_manifest_hash(wrapped):
    w = wrapped
    value = await observer.observe(context=w.context, anchor_intake=w.intake, still_authorized=w.authorized)
    assert value["siteFileHash"] == w.intake["siteFileHash"]
    assert value["nativeContinuity"]["site_sha256"] != value["siteFileHash"]
    assert len(w.seen) == 1


@pytest.mark.parametrize("field", ["siteFileHash", "sourceHash", "anchor", "approval", "manifest", "site", "foreign_asset", "time", "extra"])
async def test_forged_readonly_observation_is_rejected(wrapped, monkeypatch, field):
    w = wrapped

    async def execute(*args, **kwargs):
        value = await w.execute(*args, **kwargs)
        if field in {"siteFileHash", "sourceHash"}:
            value[field] = "0" * 64
        elif field == "anchor":
            value["nativeContinuity"]["anchor"] = {}
        elif field == "approval":
            value["nativeContinuity"]["approval"] = "performed"
        elif field == "manifest":
            value["nativeContinuity"]["manifest_sha256"] = "0" * 64
        elif field == "site":
            value["nativeContinuity"]["site_sha256"] = "invalid"
        elif field == "foreign_asset":
            value["nativeContinuity"]["assets_sha256"] = {"/content-assets/foreign/pixel.webp": "0" * 64}
        elif field == "time":
            value["nativeContinuity"]["observed_at"] = "2999-01-01T00:00:00+00:00"
        else:
            value["unexpectedAuthority"] = True
        return value

    monkeypatch.setattr(observer.studio, "_execute", execute)
    with pytest.raises(RunnerError, match="private_continuity_invalid"):
        await observer.observe(context=w.context, anchor_intake=w.intake, still_authorized=w.authorized)
    assert len(w.seen) == 1


async def test_actual_python_node_observer_roundtrip_keeps_retained_files_unchanged(tmp_path, monkeypatch):
    """Real subprocess/hash/native bridge; authorization is an explicit offline seam."""
    node = shutil.which("node")
    assert node, "Node is required for the canonical observer regression"
    root = observer.studio.ROOT
    artifacts = tmp_path / "runtime/artifacts"
    artifacts.mkdir(parents=True)
    network = artifacts / "synthetic-network.json"
    network.write_text(json.dumps({"defaultEmail": "unused@example.invalid", "operatorName": "Synthetic operator", "contactsBySite": {}}))
    environment = {k: v for k, v in os.environ.items() if k.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"}}
    environment["STUDIO_NETWORK_SETTINGS"] = str(network)
    monkeypatch.setattr(observer.studio, "configuration", lambda: (node, None, artifacts, environment))
    identity = str(uuid4())
    directory = artifacts / "customer-content" / identity / "revision-1"
    section = {"heading": "Synthetic private continuity", "body": "This isolated synthetic fixture represents no real customer, professional author, commercial capability or public launch.", "items": []}
    draft = {"business_name": "Isolated continuity", "tagline": "Synthetic private fixture", "business": {"customer": "Synthetic team"}, "brand": {"accent": "teal"},
        "pages": [{"path": p, "title": "Synthetic continuity page", "navigation_label": "Test", "meta_description": "An isolated synthetic private continuity page.",
                   "intent": "Inspect private native continuity without providers.", "sections": [section, section]} for p in ("/", "/gidai/", "/kontaktai/")], "content_plan": []}
    base = {"creationId": identity, "acceptedRevision": 1, "sourceHash": digest(draft), "canonicalHost": service.private_host(identity),
            "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}

    async def authorized():
        return True  # synthetic seam, never proof of current owner/RLS/S6

    intake = await observer.studio._execute([node, root / "content-studio/scripts/customer-creation-intake.mjs"],
        {**base, "draft": draft}, environment, authorized, 20)
    script = root / "content-studio/scripts/customer-content-workflow.mjs"
    current = await observer.studio._execute([node, script], {**base, "command": "status"}, environment, authorized, 20)
    await observer.studio._execute([node, script], {**base, "command": "amend-site", "expectedSiteHash": current["expectedSiteHash"],
        "patch": {"facts": "Only a synthetic continuity fixture."}}, environment, authorized, 20)
    context = {"creation_id": identity, "native_host": base["canonicalHost"],
        "accepted": {"accepted_revision": 1, "candidate_sha256": base["sourceHash"]},
        "native_sources": {"importer_sha256": intake["importerHash"]}, "continuity": {
            "version": observer.MARKER_VERSION, "recovery_id": str(uuid4()), "receipt_id": str(uuid4()),
            "context_sha256": "1" * 64, "intake_sha256": digest(intake), "manifest_sha256": observer.manifest_hash(intake),
            "observer_sha256": observer.observer_sha256()}}
    before = {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()}
    value = await observer.observe(context=context, anchor_intake=intake, still_authorized=authorized)
    assert value["siteFileHash"] == intake["siteFileHash"]
    site = directory / "data/sites" / (intake["siteId"] + ".json")
    assert value["nativeContinuity"]["site_sha256"] == hashlib.sha256(site.read_bytes()).hexdigest() != intake["siteFileHash"]
    assert {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()} == before
    assert all(value["nativeContinuity"][key] == "not-performed" for key in observer.AUTHORITY)
