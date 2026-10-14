"""Strict ordinary owner API cannot supply paths, evidence or execution authority."""
import json
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.site_build.receipt_contract import document
from pinet_core.site_build.receipt_wire import Check, FoundationView, ReceiptView
from pinet_core.site_build.receipts import request_fingerprint


@pytest.mark.parametrize("extra", [{"origin": "http://127.0.0.1:9"}, {"scope": {}}, {"state": "verified-local"},
    {"path": "C:/private"}, {"tools": ["mail.send"]}, {"source_revision": "a"*40}, {"sender": "coordinator"}])
def test_owner_check_cannot_supply_proof_or_paths(extra):
    with pytest.raises(ValidationError):
        Check.model_validate_json(json.dumps({"accepted_revision": 1, "command": "candidate",
            "idempotency_key": str(uuid4()), **extra}))


@pytest.mark.parametrize("value", ["deploy", "activate", "calibrate", "verify-retained"])
def test_owner_commands_are_bounded(value):
    with pytest.raises(ValidationError):
        Check.model_validate_json(json.dumps({"accepted_revision": 1, "command": value,
            "idempotency_key": str(uuid4())}))


def test_replay_material_covers_creation_revision_command_and_uuid():
    creation = str(uuid4())
    value = Check.model_validate_json(json.dumps({"accepted_revision": 1, "command": "candidate", "idempotency_key": str(uuid4())}))
    expected = request_fingerprint(creation, value)
    assert expected == request_fingerprint(creation, Check.model_validate_json(value.model_dump_json()))
    for changed in (value.model_copy(update={"accepted_revision": 2}), value.model_copy(update={"command": "verify-local"}),
            value.model_copy(update={"idempotency_key": uuid4()})):
        assert request_fingerprint(creation, changed) != expected
    assert request_fingerprint(str(uuid4()), value) != expected


def test_native_http_decoded_uuid_is_accepted_without_coercing_revision_or_command():
    value = {"accepted_revision": 1, "command": "candidate", "idempotency_key": str(uuid4())}
    assert str(Check.model_validate(value).idempotency_key) == value["idempotency_key"]
    for changed in ({"accepted_revision": "1"}, {"accepted_revision": True}, {"idempotency_key": 1}):
        with pytest.raises(ValidationError):
            Check.model_validate({**value, **changed})


def receipt():
    return {"receipt_id": str(uuid4()), "idempotency_key": str(uuid4()), "command": "candidate",
        "creation_id": str(uuid4()), "accepted_revision": 1,
        "checked_at": "2026-10-14T09:00:00Z", "state": "candidate", "blockers": ["review_evidence_missing"],
        "release_id": str(uuid4()), "package_sha256": "a"*64, "execution_source_revision": "b"*40,
        "public_source_revision": "c"*40, "synthetic": True, "calibration_status": "UNVERIFIED",
        "channel_activation": "not_performed", "deployment": "not_performed"}


def test_owner_projection_never_turns_partial_or_stale_into_ready():
    value = receipt()
    ReceiptView.model_validate_json(json.dumps(value))
    with pytest.raises(ValidationError):
        ReceiptView.model_validate_json(json.dumps({**value, "state": "verified-local"}))
    view = {"creation_id": value["creation_id"], "current_revision": 1, "observed_at": value["checked_at"],
        "state": "candidate", "foundation_status": "UNVERIFIED", "agent_foundation_ready": False,
        "can_check": True, "latest": value, "blockers": value["blockers"], "calibration_status": "UNVERIFIED",
        "channel_activation": "not_performed", "deployment": "not_performed"}
    FoundationView.model_validate_json(json.dumps(view))
    with pytest.raises(ValidationError):
        FoundationView.model_validate_json(json.dumps({**view, "agent_foundation_ready": True}))
    with pytest.raises(ValidationError):
        FoundationView.model_validate_json(json.dumps({**view, "foundation_status": "LOCAL_DELIVERY_CHECKS_PASS", "agent_foundation_ready": True}))


def test_exact_contract_has_no_origin_paths_model_tool_or_permission_input():
    root = Path(__file__).resolve().parents[3]
    assert json.loads((root / "docs/contracts/verslomatika-site-foundation.openapi.json").read_text("utf-8")) == document()
    assert set(document()["components"]["schemas"]["Check"]["properties"]) == {"accepted_revision", "command", "idempotency_key"}
