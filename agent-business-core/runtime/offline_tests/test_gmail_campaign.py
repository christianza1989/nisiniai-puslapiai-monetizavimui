"""Private operator plan bounds; no mailbox, DNS, database or provider IO."""
import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.mail_provider.campaign import CampaignPlan, read_plan
from pinet_core.mail_provider.gmail import GmailError


def plan():
    now = datetime.now(UTC)
    return {"id": str(uuid4()), "enabled": True, "connection_id": str(uuid4()), "business_id": str(uuid4()),
        "user_id": str(uuid4()), "grant_id": str(uuid4()), "source_binding_id": str(uuid4()),
        "source_binding_fingerprint": "a"*64, "execution_source_revision": "b"*40, "environment": "test-plan",
        "sender": "owner@example.com", "approved_at": now.isoformat(), "expires_at": (now+timedelta(hours=1)).isoformat(),
        "maximum_sends": 2, "maximum_daily_sends": 2, "suppressed_recipients": [],
        "letters": [{"id": str(uuid4()), "recipient": "buyer@example.com", "subject": "Two outdoor tubs",
            "body": "Please confirm the requirements for two outdoor tubs.", "language": "de",
            "contact_source": "https://example.com/contact", "contact_evidence": "Public contact page evidence.",
            "permission_basis": "Explicit operator review of contact permission.", "review_reference": "review-1"}]}


@pytest.mark.parametrize("change", ["too-many", "daily", "long-expiry", "duplicate", "test-recipient", "header", "source", "extra"])
def test_plan_refuses_unbounded_ambiguous_or_capture_inputs(change):
    value = plan()
    if change == "too-many":
        value["maximum_sends"] = 101
    elif change == "daily":
        value["maximum_daily_sends"] = 51
    elif change == "long-expiry":
        value["expires_at"] = (datetime.now(UTC)+timedelta(days=8)).isoformat()
    elif change == "duplicate":
        value["letters"] *= 2
    elif change == "test-recipient":
        value["letters"][0]["recipient"] = "capture@buyer.test"
    elif change == "header":
        value["letters"][0]["subject"] = "Hello\r\nBcc: extra@example.com"
    elif change == "source":
        value["letters"][0]["contact_source"] = "https://secret:password@example.com/contact"
    else:
        value["recipient_override"] = "foreign@example.com"
    with pytest.raises(ValidationError):
        CampaignPlan.model_validate(value)


def test_exact_private_file_pin_refuses_changed_bytes(tmp_path):
    path = tmp_path / "campaign.private.json"
    path.write_text(json.dumps(plan()), encoding="utf-8")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert read_plan(path, digest).enabled is True
    path.write_text(path.read_text("utf-8")+"\n", encoding="utf-8")
    with pytest.raises(GmailError, match="plan_unavailable"):
        read_plan(path, digest)
    with pytest.raises(GmailError):
        read_plan("relative/private.json", digest)
