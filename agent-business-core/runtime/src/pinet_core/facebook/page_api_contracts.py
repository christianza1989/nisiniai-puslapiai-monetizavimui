"""Owned Page API commands. Secrets are deliberately absent from HTTP contracts."""
from typing import Literal

from pydantic import Field, model_validator

from .contracts import Strict


class PageApiPolicy(Strict):
    enabled: bool = False
    paused: bool = False
    daily_write_limit: int = Field(default=5, ge=0, le=50)


class PageApiPolicyUpdate(Strict):
    base_revision: int = Field(ge=0)
    policy: PageApiPolicy
    reason: str = Field(min_length=3, max_length=500)


class VerifyPage(Strict):
    credential_key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")


class PageApiJob(Strict):
    key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    credential_key: str = Field(min_length=2, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    action: Literal["post", "photo", "comment", "reply"] = "post"
    body: str = Field(min_length=3, max_length=5000)
    review_note: str = Field(min_length=12, max_length=1200)
    purpose: Literal["business", "personal"] = "business"
    parent_post_id: str = Field(default="", max_length=100, pattern=r"^[0-9_]*$")
    parent_comment_id: str = Field(default="", max_length=100, pattern=r"^[0-9_]*$")
    media_key: str = Field(default="", max_length=100, pattern=r"^[a-zA-Z0-9_-]*$")

    @model_validator(mode="after")
    def target(self):
        if (self.action in {"comment", "reply"}) != bool(self.parent_post_id):
            raise ValueError("comments/replies require an owned Page post id")
        if (self.action == "reply") != bool(self.parent_comment_id):
            raise ValueError("reply requires its exact parent comment id")
        if (self.action == "photo") != bool(self.media_key):
            raise ValueError("photo requires one immutable private media asset")
        return self


class RunPageApi(Strict):
    owner: str = Field(min_length=8, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")


class ResolvePageApi(Strict):
    base_revision: int = Field(ge=1)
    outcome: Literal["not_published"]
    evidence: str = Field(min_length=30, max_length=1500)
