"""Actual Google RFC9207 callback shape; issuer is checked, never ignored."""
from urllib.parse import urlencode

import pytest

from pinet_core.mail_provider import oauth
from pinet_core.mail_provider.gmail import GmailError


def callback(flow, issuer):
    params = {"state": flow["state"], "code": "synthetic-code", "scope": " ".join(oauth.SCOPES)}
    if issuer is not None:
        params["iss"] = issuer
    return flow["redirect_uri"]+"?"+urlencode(params)


def test_google_exact_authorization_issuer_is_accepted_once():
    flow, _ = oauth.new_flow("synthetic.apps.googleusercontent.com", "http://127.0.0.1:15555/oauth/callback", {})
    url = callback(flow, "https://accounts.google.com")
    assert oauth.consume_callback(flow, url, {}) == "synthetic-code"
    assert flow["consumed"] is True
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, url, {})


@pytest.mark.parametrize("issuer", ["https://evil.example", "http://accounts.google.com", "accounts.google.com",
    "https://accounts.google.com/", "https://accounts.google.com.evil.example", "", None])
def test_wrong_or_legacy_issuer_is_rejected_without_consuming_flow(issuer):
    flow, _ = oauth.new_flow("synthetic.apps.googleusercontent.com", "http://127.0.0.1:15555/oauth/callback", {})
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, callback(flow, issuer), {})
    assert flow["consumed"] is False


def test_duplicate_issuer_rejected_even_when_both_values_are_google():
    flow, _ = oauth.new_flow("synthetic.apps.googleusercontent.com", "http://127.0.0.1:15555/oauth/callback", {})
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, callback(flow, "https://accounts.google.com")+"&iss=https%3A%2F%2Faccounts.google.com", {})
    assert flow["consumed"] is False
