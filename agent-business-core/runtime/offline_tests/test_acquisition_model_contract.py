from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition.ledger import LedgerError
from pinet_core.acquisition.model_contract import ApproveModel, PrepareModel, next_role, observed_usage


def approval():
    return {"registration_id": str(uuid4()), "authorizing_session_id": str(uuid4()), "authorization_id": str(uuid4()),
        "execution_source_revision": "a"*40, "agent_id": str(uuid4()),
        "expected_config_revision": 1, "expected_config_sha256": "b"*64,
        "expected_module_fingerprint": "c"*64, "model_execution_authorized": True,
        "maximum_attempts": 3, "duration_seconds": 60}


@pytest.mark.parametrize("change", [{"model_execution_authorized": False}, {"model_execution_authorized": 1},
    {"duration_seconds": True}, {"duration_seconds": 3601}, {"maximum_attempts": 0},
    {"maximum_attempts": 31}, {"maximum_attempts": True}, {"business_id": str(uuid4())},
    {"model": "other-model"}, {"purpose": "site_chat"}, {"expected_config_revision": "1"},
    {"expected_module_fingerprint": "guessed"}])
def test_operator_model_authority_is_explicit_bounded_and_does_not_accept_tenant_or_model(change):
    with pytest.raises(ValidationError):
        ApproveModel.model_validate(approval() | change)


def task():
    now = datetime.now(UTC)
    return {"request_id": str(uuid4()), "authorization_id": str(uuid4()), "recipient": "owner@example.test",
        "campaign": {"site_id": "synthetic", "campaign_id": "test", "mode": "draft_only",
            "segments": ["lodging"], "countries": ["NL"], "enabled": True,
            "expires_at": now+timedelta(hours=1),
            "facts": [{"id": "pilot", "text": "Synthetic requirement collection only.", "source": "synthetic-owner",
                "expires_at": now+timedelta(hours=1)}]},
        "prospect": {"site_id": "synthetic", "organization_key": "synthetic-lodging", "name": "Synthetic lodging",
            "role": "buyer", "segment": "lodging", "country": "NL", "evidence": [{"id": "listing",
                "url": "https://example.test", "checked_at": now, "expires_at": now+timedelta(hours=1),
                "fact": "Synthetic lodging test evidence.", "use_allowed": True}]}}


def test_preparation_request_cannot_select_source_scope_saved_config_or_send():
    value = task()
    assert PrepareModel.model_validate(value).recipient == "owner@example.test"
    for change in ({"external_sent": True}, {"scope": {}}, {"config_id": str(uuid4())},
            {"source_revision": "a"*40}, {"model": "other"}, {"recipient": "bad\r\nBcc: injected@example.test"},
            {"prospect": value["prospect"] | {"site_id": "foreign"}}):
        with pytest.raises((ValidationError, ValueError, LedgerError)):
            PrepareModel.model_validate(value | change)


def test_role_order_has_no_retry_after_reserved_failed_or_complete_review():
    assert next_role([], "researcher")
    assert not next_role([], "writer")
    one = [{"role": "researcher", "state": "succeeded"}]
    assert next_role(one, "writer") and next_role(one, "reviewer")
    assert next_role(one+[{"role": "writer", "state": "succeeded"}], "reviewer")
    for state in ("reserved", "failed"):
        assert not next_role([{"role": "researcher", "state": state}], "researcher")
        assert not next_role([{"role": "researcher", "state": state}], "writer")
    assert not next_role(one+[{"role": "reviewer", "state": "succeeded"}], "writer")


def test_usage_preserves_unknown_and_never_invents_zero_or_billing():
    assert observed_usage(None) is None and observed_usage({}) is None
    assert observed_usage({"input_tokens": True, "output_tokens": -1, "cost_usd": 10}) is None
    assert observed_usage({"input_tokens": 0, "output_tokens": 7, "other_tokens": 42}) == {"input_tokens": 0, "output_tokens": 7}
