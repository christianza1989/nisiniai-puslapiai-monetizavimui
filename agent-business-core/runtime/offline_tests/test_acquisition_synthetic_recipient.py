"""One reserved test namespace; no live-domain admission and no identity migration."""
import json
from email.message import EmailMessage

import pytest
from pydantic import TypeAdapter, ValidationError
from test_acquisition_correspondence import inbound

from pinet_core.acquisition.correspondence import recipient_hash, seal
from pinet_core.acquisition.headless_mail import parse_bound_reply
from pinet_core.acquisition.ledger import LedgerError
from pinet_core.acquisition.work_interfaces import InboundCapture, SyntheticAddress


@pytest.mark.parametrize("address", ["owner@example.test", "office@venue-03.example.test",
    "owner+quote@de.venue-03.example.test", "a@" + "b"*63 + ".example.test"])
def test_reserved_example_test_namespace(address):
    assert recipient_hash(address) == seal(["acquisition-correspondence-recipient.v1", address])


@pytest.mark.parametrize("address", ["a@gmail.com", "a@hotube.eu", "a@evil-example.test",
    "a@example.test.evil", "a@other.test", "a@-venue.example.test", "a@venue-.example.test",
    "a@venue..example.test", "a@" + "b"*64 + ".example.test", "a..b@example.test",
    "a.@example.test", "a\n@example.test", "a@example.test\n", "a@example.test,b@example.test",
    "a@EXAMPLE.TEST", "a@exаmple.test", "a@" + ("x"*63 + ".")*4 + "example.test", None])
def test_real_malformed_or_oversized_address_is_refused(address):
    with pytest.raises(LedgerError, match="synthetic_recipient_required"):
        recipient_hash(address)


def test_legacy_key_stays_exact_and_subdomain_identities_do_not_collapse():
    old = recipient_hash("owner@example.test")
    assert old == seal(["acquisition-correspondence-recipient.v1", "owner@example.test"])
    assert len({old, recipient_hash("owner@a.example.test"), recipient_hash("owner@b.example.test")}) == 3


@pytest.mark.parametrize("address", ["owner@example.test", "owner@venue-07.example.test",
    "owner+quote@de.venue-07.example.test"])
def test_real_mime_reply_reaches_the_same_inbound_address_contract(address):
    message = EmailMessage()
    parent = "<parent@example.test>"
    message["From"], message["To"] = address, "info@pinet.lt"
    message["Subject"] = "One tub, not two"
    message["Message-ID"] = "<reply@example.test>"
    message["In-Reply-To"] = message["References"] = parent
    message.set_content("Please update the quantity to one tub.")
    known = {parent: {"id": "mail-test", "case_id": "case-test", "site": "madbeauty",
        "sender": "info@pinet.lt", "recipient": address}}
    parsed = parse_bound_reply(message.as_bytes(), known)
    value = {**inbound(), "sender": parsed["sender"], "recipient": parsed["recipient"],
        "subject": parsed["subject"], "body": parsed["body"]}
    captured = InboundCapture.model_validate_json(json.dumps(value))
    assert captured.sender == address and captured.external_sent is False
    assert recipient_hash(captured.sender) == recipient_hash(address)


@pytest.mark.parametrize("address", ["a@gmail.com", "a@evil-example.test", "a@example.test.evil",
    "a@-venue.example.test", "a@venue-.example.test", "a..b@example.test", "a.@example.test",
    "a@example.test\n", "a@" + ("x"*63 + ".")*4 + "example.test", None])
def test_sender_alias_refuses_the_same_unsafe_inputs(address):
    with pytest.raises(ValidationError):
        TypeAdapter(SyntheticAddress).validate_python(address)
