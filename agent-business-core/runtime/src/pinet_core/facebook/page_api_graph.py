"""Fixed official Graph API origin, private credentials and a single HTTP write attempt."""
import hashlib
import json
import logging
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
from fastapi import HTTPException
from pydantic import Field, SecretStr

from ..config import settings
from ..models import utcnow
from . import service as fb
from .contracts import Strict

GRAPH = "https://graph.facebook.com/v26.0/"
POST_SCOPES = {"pages_manage_posts", "pages_manage_engagement", "pages_read_engagement",
               "pages_read_user_engagement"}
COMMENT_SCOPES = {"pages_manage_engagement", "pages_read_engagement", "pages_read_user_engagement"}
SCOPES = {"post": POST_SCOPES, "photo": POST_SCOPES, "comment": COMMENT_SCOPES, "reply": COMMENT_SCOPES}


class Credentials(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    site_id: str
    environment: str
    account_key: str = Field(min_length=8, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    page_id: str = Field(pattern=r"^[0-9]{5,30}$")
    app_id: str = Field(pattern=r"^[0-9]{5,30}$")
    page_token: SecretStr
    app_token: SecretStr

    def fingerprint(self):
        value = self.model_dump(exclude={"page_token", "app_token"})
        value["page_token_hash"] = hashlib.sha256(self.page_token.get_secret_value().encode()).hexdigest()
        value["app_token_hash"] = hashlib.sha256(self.app_token.get_secret_value().encode()).hexdigest()
        return fb.fingerprint(value)


def credentials(site_id, key):
    try:
        candidate = Path(settings().facebook_page_credentials_path).expanduser()
        root = (fb.ROOT / "agent-business-core/runtime/artifacts").resolve()
        path = candidate.resolve()
        if (not settings().facebook_page_credentials_path or not path.is_relative_to(root)
                or candidate.is_symlink() or not path.is_file() or path.stat().st_size > 65536):
            raise ValueError("private credential file required")
        data = json.loads(path.read_text(encoding="utf-8"))
        matches = [x for x in data["credentials"] if x.get("site_id") == site_id
                   and x.get("environment") == settings().environment and x.get("key") == key]
        if len(matches) != 1:
            raise ValueError("one scoped credential required")
        value = Credentials.model_validate(matches[0])
        if any(not token.get_secret_value() or len(token.get_secret_value()) > 4096
               for token in (value.page_token, value.app_token)):
            raise ValueError("tokens required")
        return value
    except Exception:
        # Never surface validation exceptions, file content, or credential values.
        raise HTTPException(503, "facebook_page_credentials_unavailable") from None


class RedactGraphLog(logging.Filter):
    def filter(self, record):
        # debug_token has a mandated query token; httpx INFO otherwise prints it.
        if "graph.facebook.com" in record.getMessage():
            record.msg, record.args = "Facebook Graph HTTP request (credentials redacted)", ()
        return True


logging.getLogger("httpx").addFilter(RedactGraphLog())


class GraphFailure(Exception):
    def __init__(self, reason, uncertain=False):
        super().__init__(reason)
        self.reason, self.uncertain = reason, uncertain


def http_transport():
    """Production uses httpx's no-retry default; only isolated tests replace this factory."""
    return None


class Graph:
    def __init__(self, credential):
        self.credential = credential
        transport = http_transport()
        if transport is not None and not (settings().allow_simulation
                                          and settings().environment.startswith("test-")):
            raise HTTPException(403, "facebook_graph_mock_requires_test_environment")
        self.fixture = transport is not None
        self.client = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(20, connect=5),
                                        follow_redirects=False, trust_env=False)

    async def close(self):
        await self.client.aclose()

    async def request(self, method, path, *, params=None, data=None, files=None, app=False):
        if not re.fullmatch(r"(?:me|debug_token|[0-9_]+)(?:/(?:feed|photos|comments))?", path):
            raise GraphFailure("facebook_graph_target_invalid")
        token = self.credential.app_token if app else self.credential.page_token
        try:
            async with self.client.stream(method, GRAPH + path, params=params, data=data, files=files,
                    headers={"Authorization": "Bearer " + token.get_secret_value()}) as response:
                raw = bytearray()
                async for chunk in response.aiter_bytes():
                    raw.extend(chunk)
                    if len(raw) > 512000:
                        raise GraphFailure("facebook_graph_response_too_large", method == "POST")
                try:
                    value = json.loads(raw)
                except (ValueError, UnicodeDecodeError):
                    raise GraphFailure("facebook_graph_response_invalid", method == "POST") from None
                if not isinstance(value, dict):
                    raise GraphFailure("facebook_graph_response_invalid", method == "POST")
                if not response.is_success or "error" in value:
                    error = value.get("error", {})
                    code = error.get("code") if isinstance(error, dict) else None
                    reason = f"facebook_graph_http_{response.status_code}"
                    if isinstance(code, int):
                        reason += f"_code_{code}"
                    # Only an explicit 4xx Graph rejection is known not to have created a write.
                    unknown = method == "POST" and not (400 <= response.status_code < 500 and code is not None)
                    raise GraphFailure(reason, unknown)
                return value
        except (httpx.HTTPError, OSError):
            raise GraphFailure("facebook_graph_network_failure", method == "POST") from None

    async def verify(self):
        data = (await self.request("GET", "debug_token", app=True,
                params={"input_token": self.credential.page_token.get_secret_value()})).get("data", {})
        if (not data.get("is_valid") or data.get("type") != "PAGE"
                or str(data.get("app_id")) != self.credential.app_id):
            raise GraphFailure("facebook_page_token_identity_invalid")
        expires = utcnow() + timedelta(hours=24)
        for key in ("expires_at", "data_access_expires_at"):
            stamp = data.get(key, 0)
            if not isinstance(stamp, (int, float)) or stamp < 0:
                raise GraphFailure("facebook_page_token_expiry_invalid")
            if stamp:
                expires = min(expires, datetime.fromtimestamp(stamp, UTC))
        if expires <= utcnow():
            raise GraphFailure("facebook_page_token_expired")
        scopes = set(data.get("scopes", []))
        for grant in data.get("granular_scopes", []):
            targets = grant.get("target_ids")
            if targets and self.credential.page_id not in [str(x) for x in targets]:
                scopes.discard(grant.get("scope"))
        me = await self.request("GET", "me", params={"fields": "id,name"})
        if str(me.get("id")) != self.credential.page_id or not isinstance(me.get("name"), str):
            raise GraphFailure("facebook_page_actor_mismatch")
        actions = sorted(action for action, required in SCOPES.items() if required <= scopes)
        if not actions:
            raise GraphFailure("facebook_page_scopes_missing")
        return {"page_id": self.credential.page_id, "page_name": me["name"][:160],
                "app_id": self.credential.app_id, "account_key": self.credential.account_key,
                "actions": actions, "scopes": sorted(scopes & set.union(*SCOPES.values())),
                "valid_until": expires.isoformat(), "verified_at": utcnow().isoformat(),
                "credential_hash": self.credential.fingerprint(), "fixture": self.fixture}

    async def edge_contains(self, parent, ident):
        after = None
        for _ in range(3):
            params = {"fields": "id", "limit": 100}
            if after:
                params["after"] = after
            value = await self.request("GET", parent + "/comments", params=params)
            if any(str(x.get("id")) == ident for x in value.get("data", [])):
                return True
            # Never follow provider-controlled next URLs or collect raw comment bodies.
            next_cursor = value.get("paging", {}).get("cursors", {}).get("after")
            if not value.get("paging", {}).get("next") or not isinstance(next_cursor, str):
                break
            if len(next_cursor) > 2000 or next_cursor == after:
                break
            after = next_cursor
        return False

    async def preflight(self, job):
        me = await self.request("GET", "me", params={"fields": "id,name"})
        if str(me.get("id")) != self.credential.page_id:
            raise GraphFailure("facebook_page_actor_mismatch")
        if job["action"] in {"comment", "reply"}:
            parent = await self.request("GET", job["parent_post_id"], params={"fields": "id,from"})
            if (str(parent.get("id")) != job["parent_post_id"]
                    or str(parent.get("from", {}).get("id")) != self.credential.page_id):
                raise GraphFailure("facebook_comment_parent_not_owned_page")
            if job["action"] == "reply" and not await self.edge_contains(
                    job["parent_post_id"], job["parent_comment_id"]):
                raise GraphFailure("facebook_reply_parent_not_in_owned_post")

    async def publish(self, job, image=None):
        action = job["action"]
        if action == "photo":
            value = await self.request("POST", self.credential.page_id + "/photos",
                data={"caption": job["body"], "published": "true"},
                files={"source": ("image." + job["media"]["format"].lower(), image,
                                  "image/" + job["media"]["format"].lower())})
            ident, post_id = str(value.get("id", "")), str(value.get("post_id", ""))
        else:
            parent = (self.credential.page_id if action == "post" else
                      job["parent_comment_id"] if action == "reply" else job["parent_post_id"])
            value = await self.request("POST", parent + ("/feed" if action == "post" else "/comments"),
                                       data={"message": job["body"]})
            ident, post_id = str(value.get("id", "")), ""
        if (not re.fullmatch(r"[0-9]+(?:_[0-9]+)?", ident)
                or (action == "post" and not ident.startswith(self.credential.page_id + "_"))
                or (action == "photo" and not re.fullmatch(self.credential.page_id + r"_[0-9]+", post_id))):
            raise GraphFailure("facebook_graph_write_receipt_invalid", True)
        return {"provider_id": ident, "provider_post_id": post_id or (
            ident if action == "post" else job["parent_post_id"]),
            "acknowledged_at": utcnow().isoformat(), "external_sending": not self.fixture}

    async def confirm(self, job, receipt):
        ident = receipt["provider_post_id"] if job["action"] == "photo" else receipt["provider_id"]
        value = await self.request("GET", ident, params={"fields": "id,from,message"})
        if (str(value.get("id")) != ident or str(value.get("from", {}).get("id")) != self.credential.page_id
                or value.get("message") != job["body"]):
            raise GraphFailure("facebook_graph_receipt_not_confirmed")
        if job["action"] in {"comment", "reply"}:
            parent = job["parent_comment_id"] if job["action"] == "reply" else job["parent_post_id"]
            if not await self.edge_contains(parent, receipt["provider_id"]):
                raise GraphFailure("facebook_graph_comment_parent_not_confirmed")
        return {**receipt, "confirmed_at": utcnow().isoformat()}
