import re
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_serializer, model_validator

from .source_facts import SourceFactManifest, validate_manifest


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Profile(Strict):
    site_id: str = Field(pattern=r"^[a-z][a-z0-9-]{1,63}$")
    business_id: str = Field(default="", max_length=100)
    environment_id: str = Field(default="local", pattern=r"^[a-zA-Z0-9_-]{1,100}$")
    credential_ref: str = Field(default="local-x", pattern=r"^[a-zA-Z0-9_-]{1,100}$")
    treg_tool: str = Field(default="x", pattern=r"^[a-zA-Z0-9_-]{1,60}$")
    expected_actor_id: str = Field(default="", pattern=r"^\d*$")
    source_binding: dict = Field(default_factory=dict)
    canonical: str = Field(pattern=r"^https://[a-z0-9.-]+/?$")
    enabled: bool = False
    paused: bool = True
    live_read: bool = False
    live_write: bool = False
    actor_id: str = Field(default="", pattern=r"^\d*$")
    actor_handle: str = Field(default="", pattern=r"^\w{0,30}$")
    actor_verified_at: float = 0
    credential_hash: str = ""
    brand_mandate: str = Field(default="", max_length=500)
    language: str = "en"
    timezone: str = "Europe/Vilnius"
    start_hour: int = Field(default=8, ge=0, le=23)
    end_hour: int = Field(default=21, ge=1, le=24)
    daily_cap_micro: int = Field(default=0, ge=0, le=10_000_000)
    monthly_cap_micro: int = Field(default=0, ge=0, le=100_000_000)
    max_posts_per_day: int = Field(default=1, ge=0, le=4)
    max_reads_per_day: int = Field(default=4, ge=0, le=24)
    max_jobs_per_day: int = Field(default=20, ge=1, le=100)
    facts: list[str] = Field(default_factory=list, max_length=35)
    source_fact_manifest: SourceFactManifest | None = None
    facts_source: str = Field(default="", max_length=600)
    facts_verified_at: float = 0
    queries: list[str] = Field(default_factory=list, max_length=6)
    allowed_urls: list[str] = Field(default_factory=list, max_length=20)
    ai_reply_approval: str = Field(default="", max_length=500)
    reply_enabled: bool = False
    dm_enabled: bool = False
    media_enabled: bool = False
    auto_publish: bool = False
    experiment_id: str = ""

    @model_serializer(mode="wrap")
    def preserve_legacy_shape(self, handler):
        result = handler(self)
        if self.source_fact_manifest is None:
            result.pop("source_fact_manifest", None)
        return result

    @model_validator(mode="after")
    def coherent_policy(self):
        if self.source_fact_manifest is not None:
            from urllib.parse import urlsplit

            validate_manifest(self.facts, self.source_fact_manifest, canonical_host=urlsplit(self.canonical).netloc)
        if self.start_hour >= self.end_hour or self.daily_cap_micro > self.monthly_cap_micro:
            raise ValueError("invalid_hours_or_budget")
        if self.auto_publish and (not self.brand_mandate or not self.facts or not self.facts_source):
            raise ValueError("auto_publication_requires_facts_and_mandate")
        return self

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise ValueError("valid_iana_timezone_required") from None
        return value

    @field_validator("facts", "queries", "allowed_urls")
    @classmethod
    def bounded_strings(cls, value):
        if any(not item or len(item) > 1800 for item in value):
            raise ValueError("bounded_nonempty_strings_required")
        return value


Kind = Literal[
    "plan", "draft", "research", "mentions", "metrics", "post", "thread", "reply", "dm", "summary", "qualify"
]
WRITES = {"post", "thread", "reply", "dm"}
READS = {"research", "mentions", "metrics"}


class JobInput(Strict):
    key: str = Field(min_length=6, max_length=120)
    kind: Kind
    run_at: datetime
    payload: dict = Field(default_factory=dict)

    @field_validator("run_at")
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError("timezone_required")
        return value


class PolicyUpdate(Strict):
    base_revision: int = Field(ge=0)
    profile: Profile
    reason: str = Field(min_length=5, max_length=500)


def validate_text(text, allowed_urls):
    if not isinstance(text, str) or not 5 <= len(text) <= 280:
        raise ValueError("post_length_5_to_280_required")
    if any(ord(c) < 32 and c not in "\n\t" for c in text):
        raise ValueError("invalid_control")
    urls = re.findall(r"https?://[^\s<>]+", text)
    if any(url.rstrip(".,!?)") not in allowed_urls for url in urls):
        raise ValueError("unapproved_url")
    # Deliberately conservative, including CJK/emoji; X may count some accented letters as 1.
    remainder = re.sub(r"https?://[^\s<>]+", "", text)
    weight = sum(1 if ord(c) < 128 else 2 for c in remainder) + 23 * len(urls)
    if weight > 280:
        raise ValueError("weighted_post_length_exceeded")
    if re.search(r"(?:www\.|(?<![/\w])[a-z0-9-]+\.[a-z]{2,})", remainder, re.I):
        raise ValueError("bare_domain_requires_explicit_approved_https_url")
    return text


def validate_payload(kind, payload):
    """Kind-specific allowlist prevents a 'post' payload bypassing reply/thread admission."""
    allowed = {
        "post": {"text", "draft_id", "media_ids"},
        "thread": {"text", "draft_id", "media_ids", "parent_id"},
        "reply": {"text", "draft_id", "parent_id", "interaction_id", "recipient_id"},
        "dm": {"text", "draft_id", "interaction_id", "recipient_id"},
        "research": {"query", "next_token"},
        "mentions": {"since_id", "pagination_token"},
        "metrics": {"post_id"},
        "plan": set(),
        "summary": set(),
        "draft": {"title", "angle", "kind"},
        "qualify": {"signal_id"},
    }
    if kind not in allowed or not isinstance(payload, dict) or set(payload) - allowed[kind]:
        raise ValueError("invalid_job_payload")
    required = {
        "post": {"text"},
        "thread": {"text", "parent_id"},
        "reply": {"text", "parent_id", "interaction_id", "recipient_id"},
        "dm": {"text", "interaction_id", "recipient_id"},
        "research": {"query"},
        "metrics": {"post_id"},
        "draft": {"title"},
        "qualify": {"signal_id"},
    }
    if required.get(kind, set()) - set(payload):
        raise ValueError("missing_job_payload_field")
    for key, value in payload.items():
        if key == "media_ids":
            if (
                not isinstance(value, list)
                or not 1 <= len(value) <= 4
                or any(not isinstance(v, str) or not v.isdigit() for v in value)
            ):
                raise ValueError("invalid_media_ids")
        elif not isinstance(value, str) or not 1 <= len(value) <= (1800 if key in {"text", "query", "angle"} else 250):
            raise ValueError("bounded_payload_string_required")
        elif (
            key in {"post_id", "parent_id", "recipient_id", "interaction_id", "signal_id", "since_id"}
            and not value.isdigit()
        ):
            raise ValueError("numeric_provider_id_required")
