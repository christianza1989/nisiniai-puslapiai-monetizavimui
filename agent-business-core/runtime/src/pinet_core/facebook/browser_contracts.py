"""Private Codex desktop publishing commands; no credentials or executable selectors."""
import re
from datetime import datetime
from typing import Literal
from urllib.parse import parse_qs, urlparse

from pydantic import Field, field_validator, model_validator

from .contracts import GroupInput, Strict


def destination(value: str):
    parsed = urlparse(value)
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError("plain destination URL required")
    if parsed.scheme == "https" and parsed.hostname in {"facebook.com", "www.facebook.com"}:
        if parsed.port:
            raise ValueError("Facebook URL cannot override port")
        path = parsed.path.rstrip("/")
        if (not re.fullmatch(r"/[a-zA-Z0-9_.-]+", path)
                or path.lower() in {"/login", "/logout", "/settings", "/groups", "/messages",
                    "/marketplace", "/business", "/me", "/l.php", "/checkpoint", "/help"}):
            raise ValueError("specific Facebook destination required")
        query = parse_qs(parsed.query, keep_blank_values=True)
        if ((path == "/profile.php" and (set(query) != {"id"} or len(query["id"]) != 1
                                         or not query["id"][0].isdigit()))
                or (path != "/profile.php" and parsed.query)):
            raise ValueError("only canonical profile id query allowed")
        return value.rstrip("/")
    if (parsed.scheme == "http" and parsed.hostname == "127.0.0.1" and parsed.port
            and not parsed.query
            and parsed.path.startswith("/operator/facebook-browser-fixture/")):
        # Port required for the explicitly isolated local fixture.
        return value.rstrip("/")
    raise ValueError("Facebook or isolated fixture destination required")


def thread_destination(value: str):
    parsed = urlparse(value)
    if (parsed.scheme != "https" or parsed.hostname not in {"facebook.com", "www.facebook.com"}
            or parsed.username or parsed.password or parsed.port or parsed.query or parsed.fragment
            or not re.fullmatch(r"/(?:groups/[a-zA-Z0-9_.-]+|[a-zA-Z0-9_.-]+)/posts/[a-zA-Z0-9_-]+/?", parsed.path)):
        raise ValueError("canonical Facebook parent post URL required")
    return value.rstrip("/")


class BrowserPolicy(Strict):
    enabled: bool = False
    paused: bool = False
    daily_post_limit: int = Field(default=10, ge=0, le=50)


class BrowserPolicyUpdate(Strict):
    base_revision: int = Field(ge=0)
    policy: BrowserPolicy
    reason: str = Field(min_length=3, max_length=500)


class PublisherBinding(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    account_key: str = Field(min_length=8, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    actor_kind: Literal["page", "profile"]
    actor_id: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    actor_name: str = Field(min_length=2, max_length=160)
    target_url: str = Field(max_length=500)
    verification_scope: Literal["fixture", "live"] = "live"
    access: Literal["unknown", "verified"] = "unknown"
    evidence: str = Field(default="", max_length=1500)
    valid_until: datetime

    @field_validator("target_url")
    @classmethod
    def target(cls, value):
        return destination(value)

    @field_validator("valid_until")
    @classmethod
    def aware(cls, value):
        if value.utcoffset() is None:
            raise ValueError("timezone required")
        return value

    @model_validator(mode="after")
    def proof(self):
        fixture = self.target_url.startswith("http://127.0.0.1")
        if fixture != (self.verification_scope == "fixture"):
            raise ValueError("fixture/live scope mismatch")
        if self.access == "verified" and len(self.evidence.strip()) < 12:
            raise ValueError("specific access evidence required")
        query = parse_qs(urlparse(self.target_url).query)
        if query.get("id") and query["id"] != [self.actor_id]:
            raise ValueError("browser actor id must match canonical target id")
        return self


class PostInput(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    binding_key: str = Field(min_length=2, max_length=100)
    body: str = Field(min_length=3, max_length=5000)
    purpose: Literal["business", "personal"] = "business"
    audience: Literal["public", "friends", "only_me"]
    review_note: str = Field(min_length=12, max_length=1200)
    action: Literal["post", "comment", "discover_groups"] = "post"
    target_url: str = Field(default="", max_length=500)
    group_access_key: str = Field(default="", max_length=100)
    attachment_key: str = Field(default="", max_length=100)
    query: str = Field(default="", max_length=120)

    @model_validator(mode="after")
    def scope(self):
        if self.action == "comment":
            self.target_url = thread_destination(self.target_url)
            if self.target_url.split("/")[3] == "groups" and not self.group_access_key:
                raise ValueError("group comments require actor-specific group access")
        elif self.target_url or self.group_access_key:
            raise ValueError("post/search destination is derived from the publisher/query")
        if self.action == "discover_groups" and len(self.query.strip()) < 3:
            raise ValueError("specific bounded group query required")
        if self.action != "discover_groups" and self.query:
            raise ValueError("query belongs only to discovery")
        if self.attachment_key and self.action != "post":
            raise ValueError("media is supported only for timeline posts")
        return self


class ClaimInput(Strict):
    owner: str = Field(min_length=8, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    seconds: int = Field(default=120, ge=30, le=240)


class TaskInput(Strict):
    owner: str = Field(min_length=8, max_length=160)
    task_token: str = Field(min_length=20, max_length=100)
    epoch: int = Field(ge=1)


class Observation(Strict):
    actor_kind: Literal["page", "profile"]
    actor_id: str = Field(min_length=2, max_length=100)
    actor_name: str = Field(min_length=2, max_length=160)
    target_url: str = Field(max_length=500)
    body_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    audience: Literal["public", "friends", "only_me"]
    tab_id: str = Field(min_length=1, max_length=160)
    observed_at: datetime
    media_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")

    @field_validator("target_url")
    @classmethod
    def target(cls, value):
        return thread_destination(value) if "/posts/" in value and "facebook.com" in value else destination(value)

    @field_validator("observed_at")
    @classmethod
    def aware(cls, value):
        if value.utcoffset() is None:
            raise ValueError("timezone required")
        return value


class SubmitInput(TaskInput):
    observation: Observation


class ReceiptInput(TaskInput):
    status: Literal["visible", "pending_moderation", "uncertain"]
    observation: Observation
    provider_post_id: str = Field(default="", max_length=160)
    permalink: str = Field(default="", max_length=600)
    evidence: str = Field(min_length=10, max_length=1500)
    provider_comment_id: str = Field(default="", max_length=160, pattern=r"^[a-zA-Z0-9_-]*$")


class BlockInput(TaskInput):
    reason: Literal["login_required", "account_challenge", "wrong_actor", "wrong_target",
                    "composer_unavailable", "user_takeover", "submit_uncertain", "cancelled"]


class ReconcileInput(Strict):
    base_revision: int = Field(ge=1)
    outcome: Literal["not_published"]
    evidence: str = Field(min_length=30, max_length=1500)


class MediaInput(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    path: str = Field(max_length=600)
    alt: str = Field(min_length=8, max_length=500)
    provenance: str = Field(min_length=12, max_length=1000)


class GroupAccessInput(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    binding_key: str = Field(min_length=2, max_length=100)
    group_key: str = Field(min_length=2, max_length=160)
    comments_allowed: bool
    evidence: str = Field(min_length=30, max_length=1000)
    valid_until: datetime

    @field_validator("valid_until")
    @classmethod
    def aware(cls, value):
        if value.utcoffset() is None:
            raise ValueError("timezone required")
        return value


class DiscoveryResult(TaskInput):
    actor_id: str = Field(min_length=2, max_length=100)
    actor_name: str = Field(min_length=2, max_length=160)
    search_url: str = Field(max_length=500)
    groups: list[GroupInput] = Field(max_length=3)
    evidence: str = Field(min_length=20, max_length=1000)
