"""No-provider authority, native receipt and fixed artifact-path regressions."""
from types import SimpleNamespace

import pytest

from pinet_core.control.routes import ControlError
from pinet_core.creation import media
from pinet_core.tasks.codex_transport import RunnerError

IDENTITY = "12345678-1234-4234-8234-123456789abc"
ASSET = "11111111-1111-4111-8111-111111111111"


@pytest.fixture
def fixture(monkeypatch, tmp_path):
    cfg = SimpleNamespace(control_source_revision="a" * 40)
    row = SimpleNamespace(status="draft_ready", active_job_id=None, current_revision=1)
    state = SimpleNamespace(busy=False, archived=False, owner=True, current=True, calls=0, locks=[])
    proof = {"accepted_revision": 1, "candidate_sha256": "b" * 64, "canonical_host": "media.example.invalid",
             "accepted_source_revision": cfg.control_source_revision}
    request = media.MediaAttachment(accepted_revision=1, candidate_sha256=proof["candidate_sha256"],
        canonical_host=proof["canonical_host"], page_id="page-" + "c" * 24,
        expected_site_sha256="d" * 64, expected_revision_sha256="e" * 64,
        expected_planning_sha256="f" * 64, source_name="existing.png", source_sha256="1" * 64,
        mime="image/png", alt="Tik sintetinio bandymo iliustracija", rights="Tik izoliuotas testas")
    script = tmp_path / "content-studio/scripts/customer-content-workflow.mjs"
    script.parent.mkdir(parents=True)
    script.write_text("// inert")
    artifacts = tmp_path / "prior-release/runtime/artifacts"

    class Transaction:
        async def refresh(self, _):
            pass

        async def scalar(self, _):
            return ASSET if state.busy else None

    async def owned(tx, session, identity, *, lock=False):
        assert identity == IDENTITY
        state.locks.append(lock)
        if not state.owner:
            raise ControlError(401, "unauthenticated")
        return row

    async def archived(*_):
        return state.archived

    async def accepted(*_):
        return dict(proof)

    monkeypatch.setattr(media, "settings", lambda: cfg)
    monkeypatch.setattr(media, "enabled", lambda: None)
    monkeypatch.setattr(media, "source_current", lambda: state.current)
    monkeypatch.setattr(media, "owned", owned)
    monkeypatch.setattr(media, "archived", archived)
    monkeypatch.setattr(media, "accepted_proof", accepted)
    monkeypatch.setattr(media.studio, "ROOT", tmp_path)
    monkeypatch.setattr(media.studio, "configuration", lambda: (tmp_path / "node", script, artifacts, {"PATH": "inert"}))
    completion = {"pages": [{"page_id": request.page_id, "revision_sha256": "2" * 64,
        "planning_sha256": request.expected_planning_sha256, "media_count": 1, "media_files_present": True}]}
    monkeypatch.setattr(media, "parse_node", lambda *_: completion)
    result = {}

    async def execute(arguments, payload, environment, authorized, seconds):
        state.calls += 1
        assert arguments == [tmp_path / "node", script] and seconds == 20 and await authorized()
        expected = artifacts / "customer-content" / IDENTITY / "revision-1"
        assert payload["sourcePath"] == str(expected / "media-inputs/existing.png")
        assert payload["dataDir"] == str(expected / "data")
        assert payload["command"] == "attach-media" and payload["expectedSourceSha256"] == request.source_sha256
        assert environment == {"PATH": "inert"}
        result.update(requestHash=media.digest({"creationId": IDENTITY, "acceptedRevision": 1,
            "sourceHash": proof["candidate_sha256"], "canonicalHost": proof["canonical_host"],
            "pageId": request.page_id, "sourceSha256": request.source_sha256, "metadata": payload["metadata"]}),
            state="attached", sourceSha256=request.source_sha256, pageId=request.page_id, assetId=ASSET,
            variantIds=[ASSET], appliedRevisionHash="2" * 64, appliedPlanningHash=request.expected_planning_sha256,
            receiptSha256="3" * 64, changed=True, replayed=False, approval="not-performed",
            mediaVerification="not-performed", generation="not-performed")
        return {"operation": {"command": "attach-media", "deployment": "not-performed", "result": result}}

    monkeypatch.setattr(media.studio, "_execute", execute)
    return SimpleNamespace(tx=Transaction(), session=object(), row=row, state=state, cfg=cfg, proof=proof,
        request=request, result=result, execute=execute)


async def test_fixed_shared_workflow_uses_stable_case_path_and_current_owner_locks(fixture):
    f = fixture
    value = await media.attach(f.tx, f.session, IDENTITY, f.request)
    assert f.state.calls == 1 and f.state.locks[0] is True and len(f.state.locks) >= 3
    assert value["attachment"]["generation"] == "not-performed"
    assert value["attachment"]["appliedRevisionHash"] == value["completion"]["pages"][0]["revision_sha256"]


@pytest.mark.parametrize("condition,code", [
    ("guide", "content_work_busy"), ("creation", "media_revision_unavailable"),
    ("active_id", "media_revision_unavailable"), ("archive", "media_revision_unavailable"),
    ("revision", "media_revision_unavailable"), ("owner", "unauthenticated"),
    ("source", "source_unavailable"), ("candidate", "media_context_stale"),
])
async def test_no_child_is_admitted_when_owner_revision_or_work_is_unavailable(fixture, condition, code):
    f = fixture
    if condition == "guide":
        f.state.busy = True
    elif condition == "creation":
        f.row.status = "running"
    elif condition == "active_id":
        f.row.active_job_id = ASSET
    elif condition == "archive":
        f.state.archived = True
    elif condition == "revision":
        f.row.current_revision = 2
    elif condition == "owner":
        f.state.owner = False
    elif condition == "source":
        f.state.current = False
    else:
        f.proof["candidate_sha256"] = "9" * 64
    with pytest.raises(ControlError) as error:
        await media.attach(f.tx, f.session, IDENTITY, f.request)
    assert error.value.code == code and f.state.calls == 0


async def test_historical_native_acceptance_requires_current_explicit_continuation(fixture, monkeypatch):
    f = fixture
    f.proof["accepted_source_revision"] = "0" * 40

    async def missing(*_):
        return False

    monkeypatch.setattr(media.continuation, "schema_ready", missing)
    with pytest.raises(ControlError) as error:
        await media.attach(f.tx, f.session, IDENTITY, f.request)
    assert error.value.code == "build_continuation_stale" and f.state.calls == 0


async def test_exact_current_continuation_allows_unchanged_historical_accepted_material(fixture, monkeypatch):
    f = fixture
    f.proof["accepted_source_revision"] = "0" * 40

    async def ready(*_):
        return True

    async def latest(*_):
        return object()

    monkeypatch.setattr(media.continuation, "schema_ready", ready)
    monkeypatch.setattr(media.continuation, "latest", latest)
    monkeypatch.setattr(media.continuation, "current", ready)
    assert (await media.attach(f.tx, f.session, IDENTITY, f.request))["attachment"]["state"] == "attached"


@pytest.mark.parametrize("field,value", [("generation", "succeeded"), ("appliedRevisionHash", "0" * 64),
    ("sourceSha256", "0" * 64), ("variantIds", []), ("changed", 1)])
async def test_unbound_or_invented_completion_is_refused(fixture, monkeypatch, field, value):
    f = fixture

    async def execute(*args, **kwargs):
        output = await f.execute(*args, **kwargs)
        f.result[field] = value
        return output

    monkeypatch.setattr(media.studio, "_execute", execute)
    with pytest.raises(ControlError) as error:
        await media.attach(f.tx, f.session, IDENTITY, f.request)
    assert error.value.code == "invalid_media_attachment_source"


@pytest.mark.parametrize("field,value", [("source_name", "../foreign.png"), ("sourcePath", "/foreign.png"),
    ("provider", "openai"), ("accepted_revision", True)])
async def test_request_cannot_supply_paths_provider_or_untyped_scope(fixture, field, value):
    f = fixture
    with pytest.raises(ControlError) as error:
        await media.attach(f.tx, f.session, IDENTITY, {**f.request.model_dump(), field: value})
    assert error.value.status == 400 and f.state.calls == 0


@pytest.mark.parametrize("condition", ["guide", "owner", "source", "candidate"])
async def test_live_and_final_guards_refuse_drift_without_fabricating_receipt(fixture, monkeypatch, condition):
    f = fixture

    async def execute(*args, **kwargs):
        value = await f.execute(*args, **kwargs)
        if condition == "guide":
            f.state.busy = True
        elif condition == "owner":
            f.state.owner = False
        elif condition == "source":
            f.cfg.control_source_revision = "0" * 40
        else:
            f.proof["candidate_sha256"] = "0" * 64
        return value

    monkeypatch.setattr(media.studio, "_execute", execute)
    with pytest.raises(ControlError):
        await media.attach(f.tx, f.session, IDENTITY, f.request)
    assert f.state.calls == 1


@pytest.mark.parametrize("code,status", [("workflow_context_stale", 409), ("workflow_media_import_uncertain", 409),
    ("workflow_media_receipt_conflict", 409), ("authorization_revoked", 401), ("studio_timeout", 503)])
async def test_failure_codes_preserve_ambiguous_import_and_authorization_boundaries(fixture, monkeypatch, code, status):
    async def fail(*_, **__):
        raise RunnerError(code)

    monkeypatch.setattr(media.studio, "_execute", fail)
    with pytest.raises(ControlError) as error:
        await media.attach(fixture.tx, fixture.session, IDENTITY, fixture.request)
    assert error.value.code == code and error.value.status == status
