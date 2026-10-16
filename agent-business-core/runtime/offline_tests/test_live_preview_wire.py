"""Pure customer live-preview contract; no server, DB or provider."""
import importlib.util
import json
from importlib import import_module
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.site_build import live_preview_wire as wire


def test_live_preview_request_is_an_explicit_bounded_action():
    wire = import_module("pinet_core.site_build.live_preview_wire")
    assert set(wire.Start.model_fields) == {"accepted_revision", "site_context_sha256", "idempotency_key"}


def start():
    return {"accepted_revision": 1, "site_context_sha256": "a" * 64, "idempotency_key": str(uuid4())}


def ready():
    return {"lease_id": str(uuid4()), "creation_id": str(uuid4()), "state": "ready", "accepted_revision": 1,
        "scope_sha256": "a" * 64, "execution_source_revision": "b" * 40, "public_source_revision": "c" * 40,
        "site_context_sha256": "d" * 64, "created_at": "2026-10-17T00:00:00Z", "expires_at": "2026-10-17T00:01:00Z",
        "preview_url": "http://127.0.0.1:12345/", "failure_code": None, "local_preview_only": True,
        "full_site_status": "UNVERIFIED", "launch_status": "UNVERIFIED", "deployment": "not_performed"}


def available(lease=None):
    return {"creation_id": lease["creation_id"] if lease else str(uuid4()), "can_start": True, "current_revision": 1,
        "site_context_sha256": "d" * 64, "blocked_reasons": [], "latest_lease": lease, "local_preview_only": True,
        "full_site_status": "UNVERIFIED", "launch_status": "UNVERIFIED"}


def validate(model, data):
    return model.model_validate_json(json.dumps(data))


@pytest.mark.parametrize("extra", ["origin", "preview_url", "scope", "prepared_proof", "source_revision", "actor_id", "session_id", "command", "path", "ttl"])
def test_start_never_imports_caller_authority_or_transport(extra):
    assert validate(wire.Start, start()).accepted_revision == 1
    with pytest.raises(ValidationError):
        validate(wire.Start, {**start(), extra: "forged"})


@pytest.mark.parametrize("patch", [{"accepted_revision": True}, {"accepted_revision": "1"}, {"accepted_revision": 0},
    {"accepted_revision": 21}, {"site_context_sha256": "A" * 64}, {"site_context_sha256": "a" * 63}, {"idempotency_key": "invalid"}])
def test_start_requires_exact_observed_context_and_revision(patch):
    with pytest.raises(ValidationError):
        validate(wire.Start, {**start(), **patch})


@pytest.mark.parametrize("url", ["https://127.0.0.1:12345/", "http://localhost:12345/", "http://example.org:12345/",
    "http://127.0.0.1/", "http://127.0.0.1:0/", "http://127.0.0.1:65536/", "http://127.0.0.1:0123/",
    "http://127.0.0.1:12345/path", "http://127.0.0.1:12345/?token=secret", "http://127.0.0.1:12345/#hash",
    "http://user@127.0.0.1:12345/", "http://127.0.0.1:12345/\n"])
def test_url_is_only_exact_owned_loopback_format(url):
    with pytest.raises(ValidationError):
        validate(wire.LeaseView, {**ready(), "preview_url": url})


@pytest.mark.parametrize("state", ["preparing", "starting", "closing", "closed", "expired", "revoked", "failed"])
def test_no_url_survives_an_inactive_state(state):
    with pytest.raises(ValidationError):
        validate(wire.LeaseView, {**ready(), "state": state})
    assert validate(wire.LeaseView, {**ready(), "state": state, "preview_url": None}).preview_url is None


@pytest.mark.parametrize("patch", [{"preview_url": None}, {"expires_at": None}, {"failure_code": "preview_failed"},
    {"expires_at": "2026-10-16T23:59:59Z"}, {"local_preview_only": False}, {"local_preview_only": 1},
    {"full_site_status": "PASS"}, {"launch_status": "PASS"}, {"deployment": "performed"}, {"pid": 1234}, {"token": "secret"}])
def test_ready_is_bounded_and_never_promotes_or_exposes_runtime_details(patch):
    with pytest.raises(ValidationError):
        validate(wire.LeaseView, {**ready(), **patch})


@pytest.mark.parametrize("patch", [{"current_revision": None}, {"site_context_sha256": None}, {"blocked_reasons": ["preview_busy"]},
    {"can_start": False}, {"local_preview_only": 1}, {"can_start": 1}])
def test_availability_is_explicit_and_cannot_infer_or_forge_admission(patch):
    with pytest.raises(ValidationError):
        validate(wire.Availability, {**available(), **patch})


def test_availability_includes_only_owned_latest_lease_and_bounded_reasons():
    lease = ready()
    assert validate(wire.Availability, available(lease)).latest_lease.preview_url == lease["preview_url"]
    with pytest.raises(ValidationError):
        validate(wire.Availability, {**available(), "latest_lease": lease})
    assert not validate(wire.Availability, {**available(), "can_start": False, "blocked_reasons": ["preview_busy"]}).can_start
    with pytest.raises(ValidationError):
        validate(wire.Availability, {**available(), "can_start": False, "blocked_reasons": ["preview_busy"] * 1025})


@pytest.mark.parametrize("model,data", [(wire.LeaseEnvelope, ready()), (wire.AvailabilityEnvelope, available(ready()))])
def test_expired_ready_url_cannot_escape_in_either_envelope(model, data):
    envelope = {"contract_version": wire.CONTRACT, "environment": "test", "source_revision": "b" * 40,
        "observed_at": "2026-10-17T00:00:30Z", "request_id": str(uuid4()), "data": data}
    validate(model, envelope)
    with pytest.raises(ValidationError):
        validate(model, {**envelope, "observed_at": "2026-10-17T00:02:00Z"})


def test_standalone_contract_matches_snapshot_and_exposes_only_four_bounded_operations():
    root = Path(__file__).resolve().parents[3]
    script = root / "agent-business-core/runtime/scripts/customer_live_preview_contract.py"
    spec = importlib.util.spec_from_file_location("live_preview_contract", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    doc = module.contract()
    assert json.loads((root / "docs/contracts/verslomatika-customer-live-preview.openapi.json").read_text(encoding="utf-8")) == doc
    operations = [row for path in doc["paths"].values() for row in path.values()]
    assert len(operations) == 4 and doc["info"]["version"] == wire.CONTRACT
    for row in operations:
        assert row["security"] == [{"CoreSession": []}] and row["x-body-byte-limit"] == 4096
        assert row["x-unknown-query-parameters"] == "rejected"
    assert set(doc["components"]["schemas"]["Start"]["properties"]) == set(wire.Start.model_fields)
    assert doc["components"]["schemas"]["Start"]["additionalProperties"] is False
