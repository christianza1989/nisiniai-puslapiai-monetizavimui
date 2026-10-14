"""Evidence is not permission: strict wire, bounded effects and final source fencing."""
import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.control.routes import ControlError
from pinet_core.site_build import foundation
from pinet_core.site_build.foundation_wire import FoundationScope, Observation


def scope():
    identity = str(uuid4())
    return FoundationScope.model_validate_json(json.dumps({
        **{key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id", "session_id",
            "approval_id", "approval_session_id", "discovery_id", "report_id")},
        "environment_id": "test-foundation", "creation_id": identity,
        "approval_fingerprint": "a"*64, "report_revision": 1, "report_sha256": "b"*64,
        "accepted": {"revision_id": str(uuid4()), "accepted_revision": 1, "candidate_sha256": "c"*64,
            "accepted_source_revision": "a"*40, "site_id": "creation-"+identity.replace("-", ""),
            "canonical_host": "foundation.example", "coordinator_event_id": str(uuid4()),
            **{key: "d"*64 for key in ("coordinator_sha256", "intake_sha256", "intake_request_sha256",
                "intake_importer_sha256", "intake_site_file_sha256")}},
        "sources": {"execution_source_revision": "e"*40, "public_source_revision": "f"*40,
            "bridge_sha256": "a"*64, "verifier_sha256": "b"*64, "parser_sha256": "c"*64},
        "language_review_mode": "required", "site_context_sha256": "e"*64,
        "page_snapshot_sha256": "f"*64, "required_page_ids": ["page-one"]}))


def observation(pin):
    return {"version": "native-foundation-evidence.v1", "state": "candidate",
        "scope_sha256": pin.fingerprint(), "sources": pin.sources.model_dump(mode="json"),
        "site_context_sha256": pin.site_context_sha256, "page_snapshot_sha256": pin.page_snapshot_sha256,
        "required_page_ids": pin.required_page_ids, "blockers": ["local_evidence_pending"],
        "release": {"release_id": str(uuid4()), "manifest_sha256": "a"*64, "package_sha256": "b"*64,
            "page_revisions": {"page-one": "c"*64}, "asset_sha256": {}}, "completion": None,
        "synthetic": True, "admission": "not_performed", "deployment": "not_performed",
        "channel_activation": "not_performed", "calibration_status": "UNVERIFIED"}


def test_scope_cannot_import_permissions_paths_or_foreign_site_and_revalidates_constructed_objects():
    pin = scope()
    for patch in ({"token": "secret"}, {"origin": "http://127.0.0.1:1"}, {"permissions": []},
            {"required_page_ids": ["page-two", "page-one"]},
            {"accepted": {**pin.accepted.model_dump(mode="json"), "site_id": "creation-"+"0"*32}}):
        with pytest.raises(ValidationError):
            FoundationScope.model_validate_json(json.dumps(pin.model_dump(mode="json") | patch))
    with pytest.raises(ControlError) as error:
        foundation.checked(pin.model_copy(update={"session_id": "invalid"}))
    assert error.value.code == "invalid_request"
    with pytest.raises(ValidationError):
        pin.environment_id = "local"


@pytest.mark.parametrize("field", ["scope_sha256", "site_context_sha256", "page_snapshot_sha256"])
def test_observation_rejects_foreign_or_stale_pin(field):
    pin = scope()
    value = observation(pin)
    value[field] = "0"*64
    with pytest.raises(ControlError) as error:
        foundation.parse_observation(value, pin)
    assert error.value.code == "invalid_foundation_evidence"


def test_verified_label_requires_complete_bound_evidence_and_no_activation_or_partial_release():
    pin = scope()
    value = observation(pin)
    assert foundation.parse_observation(value, pin).admission == "not_performed"
    for patch in ({"state": "verified-local"}, {"admission": "admitted"}, {"synthetic": False},
            {"release": {**value["release"], "page_revisions": {}}}):
        with pytest.raises(ControlError):
            foundation.parse_observation(value | patch, pin)
    with pytest.raises(ValidationError):
        Observation.model_validate_json(json.dumps(value | {"unexpected": True}))


async def test_observe_fixed_native_namespace_final_authority_and_source_loss(monkeypatch):
    pin = scope()
    async def guard():
        return None
    monkeypatch.setattr(foundation, "guard", guard)
    monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources)
    from pathlib import Path
    monkeypatch.setattr(foundation.studio, "configuration", lambda: (Path("node"), None, Path("/runtime/artifacts"), {}))
    permitted = True
    calls = []
    async def authorized():
        return permitted
    async def invoke(args, body, env, authorization, seconds):
        calls.append(body)
        assert Path(body["dataDir"]).parts[-3:] == (str(pin.creation_id), "revision-1", "data")
        assert "origin" not in body and "permissions" not in body and await authorization()
        return observation(pin)
    monkeypatch.setattr(foundation.studio, "_execute", invoke)
    result = await foundation.observe(pin, still_authorized=authorized)
    assert result.state == "candidate" and len(calls) == 1
    async def revoke(*args):
        nonlocal permitted
        permitted = False
        return observation(pin)
    monkeypatch.setattr(foundation.studio, "_execute", revoke)
    with pytest.raises(ControlError) as error:
        await foundation.observe(pin, still_authorized=authorized)
    assert error.value.code == "unauthenticated"
    permitted = True
    async def change_source(*args):
        monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources.model_copy(update={"public_source_revision": "0"*40}))
        return observation(pin)
    monkeypatch.setattr(foundation.studio, "_execute", change_source)
    with pytest.raises(ControlError) as error:
        await foundation.observe(pin, still_authorized=authorized)
    assert error.value.code == "source_unavailable"


def verified_observation(pin):
    value = observation(pin)
    value.update(state="verified-local", blockers=[], completion={"state": "LOCAL_DELIVERY_CHECKS_PASS",
        "checked_at": "2026-10-14T09:00:00Z", "report_sha256": "a"*64, "audit_sha256": "b"*64,
        "review_evidence_sha256": "c"*64, "preview_sha256": "d"*64, "public_pages": 1, "requests": 8})
    return foundation.parse_observation(value, pin)


def retained_setup(monkeypatch, pin):
    from pathlib import Path
    async def guard():
        return None
    monkeypatch.setattr(foundation, "guard", guard)
    monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources)
    monkeypatch.setattr(foundation.settings(), "environment", pin.environment_id)
    monkeypatch.setattr(foundation.language_mode, "mode", lambda: pin.language_review_mode)
    monkeypatch.setattr(foundation.studio, "configuration", lambda: (Path("node"), None, Path("/artifacts"), {}))


async def yes():
    return True


async def test_retained_fixed_readonly_command_historic_session_and_result_binding(monkeypatch):
    pin = scope()
    record = verified_observation(pin)
    retained_setup(monkeypatch, pin)
    calls = []
    async def invoke(args, body, env, authorization, seconds):
        calls.append(body)
        assert body["command"] == "check-retained" and seconds == 20
        assert body["scope"]["session_id"] == str(pin.session_id)
        assert body["scope"]["approval_session_id"] == str(pin.approval_session_id)
        assert body["observation"] == record.model_dump(mode="json")
        assert "origin" not in body and await authorization()
        return {"version": record.version, "state": "retained-current", "scope_sha256": pin.fingerprint(),
            "observation_sha256": foundation.digest(record.model_dump(mode="json")),
            "sources": pin.sources.model_dump(mode="json"), "synthetic": True, "admission": "not_performed"}
    monkeypatch.setattr(foundation.studio, "_execute", invoke)
    result = await foundation.check_retained(pin, record, still_authorized=yes)
    assert result.state == "retained-current" and len(calls) == 1
    with pytest.raises(ControlError) as error:
        await foundation.check_retained(pin, observation(pin), still_authorized=yes)
    assert error.value.code == "foundation_evidence_unverified" and len(calls) == 1
    raw = await invoke(None, calls[0], None, yes, 20)
    async def wrong(*args):
        return raw | {"observation_sha256": "0"*64}
    monkeypatch.setattr(foundation.studio, "_execute", wrong)
    with pytest.raises(ControlError) as error:
        await foundation.check_retained(pin, record, still_authorized=yes)
    assert error.value.status == 503 and error.value.code == "invalid_foundation_evidence"


@pytest.mark.parametrize("failure,status,code", [
    ("foundation_invalid_evidence", 409, "invalid_foundation_evidence"),
    ("studio_unavailable", 503, "foundation_bridge_unavailable"),
    ("studio_timeout", 503, "foundation_bridge_unavailable"),
    ("studio_output_limit", 503, "foundation_bridge_unavailable"),
    ("foundation_source_stale", 503, "source_unavailable"),
    ("authorization_revoked", 401, "unauthenticated"),
])
async def test_retained_evidence_drift_is_distinct_from_process_source_or_authority_failure(monkeypatch, failure, status, code):
    pin = scope()
    retained_setup(monkeypatch, pin)
    async def invoke(*args):
        raise foundation.RunnerError(failure)
    monkeypatch.setattr(foundation.studio, "_execute", invoke)
    with pytest.raises(ControlError) as error:
        await foundation.check_retained(pin, verified_observation(pin), still_authorized=yes)
    assert error.value.status == status and error.value.code == code


@pytest.mark.parametrize("change,status,code", [("source",503,"source_unavailable"),
    ("language",409,"foundation_context_stale"), ("authority",401,"unauthenticated")])
async def test_retained_final_pin_and_authority_loss(monkeypatch, change, status, code):
    pin = scope()
    record = verified_observation(pin)
    retained_setup(monkeypatch, pin)
    permitted = True
    async def authority():
        return permitted
    async def invoke(*args):
        nonlocal permitted
        if change == "source":
            monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources.model_copy(update={"public_source_revision": "0"*40}))
        elif change == "language":
            monkeypatch.setattr(foundation.language_mode, "mode", lambda: "paused_local_pilot")
        else:
            permitted = False
        return {"version": record.version, "state": "retained-current", "scope_sha256": pin.fingerprint(),
            "observation_sha256": foundation.digest(record.model_dump(mode="json")),
            "sources": pin.sources.model_dump(mode="json"), "synthetic": True, "admission": "not_performed"}
    monkeypatch.setattr(foundation.studio, "_execute", invoke)
    with pytest.raises(ControlError) as error:
        await foundation.check_retained(pin, record, still_authorized=authority)
    assert error.value.status == status and error.value.code == code


def test_public_dirty_source_unavailability_and_reserved_host_synthetic_marker(monkeypatch):
    monkeypatch.setattr(foundation.studio, "configuration", lambda: (None, None, None, {"STUDIO_PUBLIC_CORE_DIR": "/public"}))
    monkeypatch.setattr(foundation.subprocess, "check_output", lambda arguments, **kwargs:
        "f"*40 if arguments[1] == "rev-parse" else " M config/niche-network.json")
    with pytest.raises(ControlError) as error:
        foundation.source_pins()
    assert error.value.status == 503 and error.value.code == "source_unavailable"
    pin = scope()
    pin = FoundationScope.model_validate_json(json.dumps(pin.model_dump(mode="json") | {
        "environment_id": "local", "accepted": pin.accepted.model_dump(mode="json") | {"canonical_host": "foundation.invalid"}}))
    assert foundation.parse_observation(observation(pin), pin).synthetic
