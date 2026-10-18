"""One reserved test namespace; no live-domain admission and no identity migration."""
import pytest

from pinet_core.acquisition.correspondence import recipient_hash, seal
from pinet_core.acquisition.ledger import LedgerError


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
