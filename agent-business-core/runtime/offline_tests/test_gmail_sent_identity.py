"""An authenticated provider RFC alias still needs the exact reviewed message."""
import hashlib
from datetime import UTC, datetime
from email import policy
from email.parser import BytesParser

import pytest

from pinet_core.mail_provider.gmail import GmailError, raw_message, sent_identity


def messages():
    expected = raw_message({"sender": "owner@example.com", "recipient": "owner@example.com", "subject": "2 test tubs",
        "body": "No order. Price and delivery date are not confirmed.", "sender_name": "Synthetic"},
        "<canonical@example.com>", datetime.now(UTC))
    observed = BytesParser(policy=policy.default).parsebytes(expected)
    observed.replace_header("Message-ID", "<provider-rewritten@example.com>")
    return expected, observed


def test_verified_rewrite_retains_exact_message_without_mutating_canonical():
    expected, observed = messages()
    raw = observed.as_bytes(policy=policy.SMTP)
    assert sent_identity(raw, expected) == {"message_id": "<provider-rewritten@example.com>",
        "raw_sha256": hashlib.sha256(raw).hexdigest()}
    assert b"<canonical@example.com>" in expected


@pytest.mark.parametrize("mutation", ["from", "to", "subject", "body", "attachment", "missing-id", "duplicate-id"])
def test_alias_does_not_bypass_reviewed_content_or_participants(mutation):
    expected, observed = messages()
    if mutation in {"from", "to"}:
        observed.replace_header(mutation, "foreign@example.com")
    elif mutation == "subject":
        observed.replace_header("Subject", "Changed subject")
    elif mutation == "body":
        observed.get_body(preferencelist=("plain",)).set_content("A real order has been placed.")
    elif mutation == "attachment":
        observed.add_attachment(b"unreviewed", maintype="application", subtype="octet-stream", filename="unreviewed.bin")
    elif mutation == "missing-id":
        del observed["Message-ID"]
    raw = observed.as_bytes(policy=policy.SMTP)
    if mutation == "duplicate-id":
        raw = b"Message-ID: <duplicate@example.com>\r\n"+raw
    with pytest.raises(GmailError, match="sent_identity_unverified"):
        sent_identity(raw, expected)
