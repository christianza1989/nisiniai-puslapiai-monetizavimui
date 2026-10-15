import pytest
from pydantic import ValidationError

from pinet_core.creation.private_preview_contract import document
from pinet_core.creation.private_preview_wire import PreparePrivateIntake, PrivateIntakeView


def test_exact_prepare_and_same_get_post_envelope():
    value = {"accepted_revision": 1, "candidate_sha256": "a"*64,
        "idempotency_key": "00000000-0000-4000-8000-000000000001"}
    assert PreparePrivateIntake.model_validate(value).accepted_revision == 1
    for extra in ("canonical_host", "model", "path"):
        with pytest.raises(ValidationError):
            PreparePrivateIntake.model_validate({**value, extra: "untrusted"})
    with pytest.raises(ValidationError):
        PreparePrivateIntake.model_validate({**value, "accepted_revision": True})
    api = document()
    path = api["paths"]["/customer/v2/creations/{creation_id}/private-preview-intake"]
    assert path["get"]["responses"] == path["post"]["responses"]
    assert api["components"]["schemas"]["PreparePrivateIntake"]["additionalProperties"] is False


def test_legacy_import_observation_needs_no_recovery_receipt():
    value = {"creation_id": "00000000-0000-4000-8000-000000000001", "current_revision": 1,
        "candidate_sha256": "a"*64, "state": "private_draft_imported", "public_canonical_host": "example.lt",
        "domain_authority": "UNVERIFIED", "native_host": "example.lt", "host_source": "existing_canonical_host",
        "private_preview_only": True, "can_prepare": False, "latest": None, "full_f1_status": "UNVERIFIED",
        "launch_status": "UNVERIFIED", "deployment": "not_performed", "channel_activation": "not_performed"}
    assert PrivateIntakeView.model_validate_json(__import__("json").dumps(value)).latest is None
    for changes in ({"can_prepare": True}, {"native_host": "foreign.lt"},
            {"host_source": "explicit_private_preview", "public_canonical_host": None}):
        with pytest.raises(ValidationError):
            PrivateIntakeView.model_validate_json(__import__("json").dumps({**value, **changes}))
