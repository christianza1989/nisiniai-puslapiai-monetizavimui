from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModulePolicy(Strict):
    enabled: bool = False
    paused: bool = False
    daily_draft_limit: int = Field(default=20, ge=0, le=200)


class PolicyUpdate(Strict):
    base_revision: int = Field(ge=0)
    policy: ModulePolicy
    reason: str = Field(min_length=3, max_length=500)


class GroupInput(Strict):
    key: str = Field(min_length=2, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=2, max_length=200)
    url: str = Field(max_length=500)
    rules_url: str = Field(max_length=500)
    reuse: Literal["unknown", "restricted", "allowed"] = "unknown"
    notes: str = Field(default="", max_length=800)

    @field_validator("url", "rules_url")
    @classmethod
    def facebook_url(cls, value):
        parsed = urlparse(value)
        if (parsed.scheme != "https" or parsed.hostname not in {"www.facebook.com", "facebook.com"}
                or not parsed.path.startswith("/groups/") or parsed.username or parsed.password
                or parsed.query or parsed.fragment or parsed.port):
            raise ValueError("canonical Facebook group URL required")
        return value


class SignalInput(Strict):
    key: str = Field(min_length=2, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    group_key: str = Field(min_length=2, max_length=160)
    title: str = Field(min_length=2, max_length=200)
    summary: str = Field(min_length=3, max_length=1200)
    role: Literal["buyer", "supplier", "referral", "employment", "unknown"] = "unknown"
    scope_fit: Literal["yes", "no", "unknown"] = "unknown"
    location: str = Field(default="", max_length=120)
    published_at: datetime | None = None
    data_class: Literal["anonymous", "synthetic", "permitted"] = "anonymous"

    @field_validator("published_at")
    @classmethod
    def aware_time(cls, value):
        if value is not None and value.utcoffset() is None:
            raise ValueError("source timestamp requires timezone")
        return value


class ActionInput(Strict):
    key: str = Field(min_length=2, max_length=160, pattern=r"^[a-zA-Z0-9_-]+$")
    signal_id: str = Field(min_length=1, max_length=80)
    kind: Literal["comment_draft", "join_draft", "page_reply_draft"] = "comment_draft"


class LeaseInput(Strict):
    owner: str = Field(min_length=8, max_length=160)
    seconds: int = Field(default=60, ge=5, le=120)


class InboundFixture(Strict):
    page_id: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    sender_id: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    message_id: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    need: str = Field(min_length=3, max_length=1500)
    synthetic: Literal[True] = True
