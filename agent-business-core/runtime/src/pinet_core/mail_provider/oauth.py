"""Minimum local installed-app Gmail OAuth, state/PKCE and explicit refresh."""
import base64
import hashlib
import hmac
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlencode, urlsplit

import httpx

from .gmail import GmailError

SCOPES = ("https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send")
ISSUER = "https://accounts.google.com"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def client_configuration(document):
    """Accept official downloaded installed-app JSON, never an arbitrary endpoint."""
    try:
        value = document["installed"]
        client_id, secret = value["client_id"], value["client_secret"]
        if (not isinstance(client_id, str) or not re.fullmatch(r"[a-zA-Z0-9._-]{1,250}\.apps\.googleusercontent\.com", client_id)
                or not isinstance(secret, str) or not 1 <= len(secret) <= 512
                or any(c.isspace() for c in secret)
                or value.get("token_uri") != TOKEN_URL
                or value.get("auth_uri") != "https://accounts.google.com/o/oauth2/auth"):
            raise ValueError("invalid_client")
        return {"client_id": client_id, "client_secret": secret}
    except (KeyError, TypeError, ValueError):
        raise GmailError("gmail_installed_client_required") from None


def new_flow(client_id, redirect_uri, binding):
    target = urlsplit(redirect_uri)
    if (target.scheme != "http" or target.hostname != "127.0.0.1" or not target.port
            or target.username or target.password or target.query or target.fragment or target.path != "/oauth/callback"):
        raise GmailError("gmail_loopback_callback_required")
    verifier, state = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode("ascii").rstrip("=")
    flow = {"client_id": client_id, "redirect_uri": redirect_uri, "binding": binding,
            "verifier": verifier, "state": state, "expires_at": (datetime.now(UTC)+timedelta(minutes=10)).isoformat(),
            "consumed": False}
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({"client_id": client_id,
        "redirect_uri": redirect_uri, "response_type": "code", "scope": " ".join(SCOPES),
        "state": state, "code_challenge": challenge, "code_challenge_method": "S256", "access_type": "offline"})
    return flow, url


def consume_callback(flow, callback_url, expected_binding, *, now=None):
    """The controller must persist consumed=true before the one token exchange."""
    target, expected = urlsplit(callback_url), urlsplit(flow["redirect_uri"])
    if (flow["consumed"] or flow["binding"] != expected_binding
            or datetime.fromisoformat(flow["expires_at"]) <= (now or datetime.now(UTC))
            or (target.scheme, target.netloc, target.path) != (expected.scheme, expected.netloc, expected.path)
            or target.fragment):
        raise GmailError("gmail_oauth_state_invalid")
    query = parse_qs(target.query, keep_blank_values=True)
    if (any(len(values) != 1 for values in query.values()) or set(query) - {"code", "state", "iss", "scope", "authuser", "prompt", "error"}
            or query.get("iss") != [ISSUER]
            or not hmac.compare_digest(query.get("state", [""])[0], flow["state"])):
        raise GmailError("gmail_oauth_state_invalid")
    flow["consumed"] = True
    if "error" in query or not 1 <= len(query.get("code", [""])[0]) <= 4096:
        raise GmailError("gmail_oauth_not_granted")
    return query["code"][0]


async def token_request(client, fields, *, previous=None):
    """No retry; original client state/unknown attempts are retained by caller."""
    try:
        async with client.stream("POST", TOKEN_URL, data=fields) as response:
            if not 200 <= response.status_code < 300:
                raise ValueError("token_response_unavailable")
            content = bytearray()
            async for chunk in response.aiter_bytes():
                content.extend(chunk)
                if len(content) > 65536:
                    raise ValueError("token_response_unavailable")
            import json
            value = json.loads(content)
        token, duration = value["access_token"], value["expires_in"]
        scopes = set(value.get("scope", " ".join((previous or {}).get("scopes", []))).split())
        refresh = value.get("refresh_token") or (previous or {}).get("refresh_token")
        if (value.get("token_type", "").casefold() != "bearer" or not isinstance(token, str)
                or not 1 <= len(token) <= 8192 or any(c.isspace() for c in token)
                or type(duration) is not int or not 30 <= duration <= 86400 or scopes != set(SCOPES)
                or not isinstance(refresh, str) or not 1 <= len(refresh) <= 8192 or any(c.isspace() for c in refresh)):
            raise ValueError("minimum_token_required")
        return {"access_token": token, "refresh_token": refresh, "scopes": sorted(scopes),
                "expires_at": (datetime.now(UTC)+timedelta(seconds=duration)).isoformat()}
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        raise GmailError("gmail_oauth_token_unavailable") from None
