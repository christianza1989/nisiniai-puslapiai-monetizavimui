"""Source bridge tests only; no SQL, native case, build, server or provider."""
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_foundation_bridge import scope

from pinet_core.control.routes import ControlError
from pinet_core.site_build import foundation


def test_preparation_is_a_distinct_maintained_operation_before_certification():
    assert callable(getattr(foundation, "prepare_preview", None))


def proof(pin):
    body = {"version": "native-candidate-preview.v1", "state": "prepared", "scope_sha256": pin.fingerprint(),
        "sources": pin.sources.model_dump(mode="json"), "site_context_sha256": pin.site_context_sha256,
        "page_snapshot_sha256": pin.page_snapshot_sha256, "required_page_ids": pin.required_page_ids,
        "release": {"release_id": str(uuid4()), "manifest_sha256": "a"*64, "package_sha256": "b"*64,
            "page_revisions": {"page-one": "c"*64}, "asset_sha256": {}}, "build_sha256": "d"*64,
        "synthetic": True, "server": "not_started", "full_site_status": "UNVERIFIED", "launch_status": "UNVERIFIED",
        "admission": "not_performed", "deployment": "not_performed", "channel_activation": "not_performed",
        "calibration_status": "UNVERIFIED"}
    return {**body, "artifact_sha256": foundation.digest(body)}


def reseal(value):
    body = {k: v for k, v in value.items() if k != "artifact_sha256"}
    return {**body, "artifact_sha256": foundation.digest(body)}


@pytest.mark.parametrize("patch", [{"scope_sha256": "0"*64}, {"site_context_sha256": "0"*64},
    {"page_snapshot_sha256": "0"*64}, {"required_page_ids": ["page-foreign"]},
    {"server": "running"}, {"full_site_status": "PASS"}, {"launch_status": "PASS"}, {"state": "verified-local"},
    {"origin": "http://127.0.0.1:1"}, {"path": "/customer"}, {"command": "anything"}, {"synthetic": False},
    {"artifact_sha256": "0"*64}])
def test_opaque_preparation_never_imports_authority_paths_urls_or_a_foreign_pin(patch):
    pin = scope()
    value = proof(pin) | patch
    if "artifact_sha256" not in patch:
        value = reseal(value)  # Even a self-consistent forged envelope has no authority.
    with pytest.raises(ControlError, match="invalid_prepared_preview"):
        foundation.parse_prepared_preview(value, pin)


@pytest.fixture
def transport(monkeypatch):
    pin, calls, state = scope(), [], {"authorized": True}
    async def guard():
        return None
    async def authorized():
        return state["authorized"]
    async def execute(args, payload, env, callback, seconds):
        assert await callback() and seconds == 180
        assert args[1] == foundation.SCRIPT and payload["command"] == "prepare-preview"
        assert payload["scope"] == pin.model_dump(mode="json")
        assert Path(payload["dataDir"]).parts[-3:] == (str(pin.creation_id), "revision-1", "data")
        assert set(payload) == {"command", "scope", "creationId", "acceptedRevision", "sourceHash", "canonicalHost",
            "artifactsRoot", "dataDir", "outputDir"}
        calls.append(payload)
        return proof(pin)
    monkeypatch.setattr(foundation, "guard", guard)
    monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources)
    monkeypatch.setattr(foundation, "settings", lambda: SimpleNamespace(environment=pin.environment_id))
    monkeypatch.setattr(foundation.language_mode, "mode", lambda: pin.language_review_mode)
    monkeypatch.setattr(foundation.studio, "configuration", lambda: (Path("node"), None, Path("/runtime/artifacts"), {}))
    monkeypatch.setattr(foundation.studio, "_execute", execute)
    return pin, calls, state, authorized, execute


async def test_prepare_is_bound_to_current_server_namespace_and_is_not_an_observation(transport):
    pin, calls, _, authorized, _ = transport
    result = await foundation.prepare_preview(pin, still_authorized=authorized)
    assert result.state == "prepared" and len(calls) == 1
    assert result.server == "not_started" and result.full_site_status == result.launch_status == "UNVERIFIED"
    assert result.model_dump(mode="json") == foundation.parse_prepared_preview(result.model_dump(mode="json"), pin).model_dump(mode="json")
    with pytest.raises(ControlError, match="invalid_foundation_evidence"):
        foundation.parse_observation(result.model_dump(mode="json"), pin)
    with pytest.raises(ControlError, match="invalid_request"):
        await foundation.observe(pin, command="prepare-preview", still_authorized=authorized)
    assert len(calls) == 1


@pytest.mark.parametrize("stage", ["before", "after"])
async def test_revocation_never_yields_a_successful_preparation(transport, monkeypatch, stage):
    pin, calls, state, authorized, execute = transport
    if stage == "before":
        state["authorized"] = False
    else:
        async def revoked(*args):
            result = await execute(*args)
            state["authorized"] = False
            return result
        monkeypatch.setattr(foundation.studio, "_execute", revoked)
    with pytest.raises(ControlError, match="unauthenticated") as error:
        await foundation.prepare_preview(pin, still_authorized=authorized)
    assert error.value.status == 401 and len(calls) == (stage == "after")


@pytest.mark.parametrize("change", ["source", "language", "environment"])
async def test_consumed_final_source_language_environment_remain_current(transport, monkeypatch, change):
    pin, _, _, authorized, execute = transport
    async def changed(*args):
        result = await execute(*args)
        if change == "source":
            monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources.model_copy(update={"bridge_sha256": "0"*64}))
        elif change == "language":
            monkeypatch.setattr(foundation.language_mode, "mode", lambda: "paused_local_pilot")
        else:
            monkeypatch.setattr(foundation, "settings", lambda: SimpleNamespace(environment="foreign"))
        return result
    monkeypatch.setattr(foundation.studio, "_execute", changed)
    with pytest.raises(ControlError) as error:
        await foundation.prepare_preview(pin, still_authorized=authorized)
    assert error.value.code == ("source_unavailable" if change == "source" else "foundation_context_stale")


@pytest.mark.parametrize("failure,status,code", [("authorization_revoked", 401, "unauthenticated"),
    ("foundation_preview_content_blocked", 409, "foundation_preview_content_blocked"),
    ("foundation_context_stale", 409, "foundation_context_stale"),
    ("foundation_source_stale", 503, "source_unavailable"),
    ("foundation_source_unavailable", 503, "source_unavailable"),
    ("foundation_preview_build_changed", 503, "foundation_bridge_unavailable")])
async def test_failure_does_not_synthesize_an_approval_or_preparation(transport, monkeypatch, failure, status, code):
    pin, _, _, authorized, _ = transport
    async def failed(*_):
        raise foundation.RunnerError(failure)
    monkeypatch.setattr(foundation.studio, "_execute", failed)
    with pytest.raises(ControlError) as error:
        await foundation.prepare_preview(pin, still_authorized=authorized)
    assert error.value.status == status and error.value.code == code
