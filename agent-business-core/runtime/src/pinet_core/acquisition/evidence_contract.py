"""Recipient-less public evidence work; never a contact or draft admission."""

from datetime import timedelta
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator

from ..contracts import Strict
from .agent_role_contract import NativeTeam, ParentReceipt
from .contracts import Campaign
from .discovery_urls import review_discovery_urls

VERSION = "acquisition-evidence-role.v1"


class Excerpt(Strict):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    source_id: str = Field(min_length=1, max_length=80)
    url: str = Field(min_length=8, max_length=2000)
    checked_at: AwareDatetime
    expires_at: AwareDatetime
    visible_text_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    start: int = Field(strict=True, ge=0)
    end: int = Field(strict=True, ge=1)
    text: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def bounded_public_excerpt(self):
        review = review_discovery_urls([self.url], excluded_hosts=[])[0]
        if (
            review.state != "primary_read_required"
            or review.url != self.url
            or not self.url.startswith("https://")
            or self.end - self.start != len(self.text)
            or self.expires_at <= self.checked_at
        ):
            raise ValueError("exact_public_excerpt_required")
        return self


class ResearchSubject(Strict):
    organization_key: str = Field(min_length=3, max_length=120)
    name: str = Field(min_length=2, max_length=200)
    requested_country: str = Field(pattern=r"^[A-Z]{2}$")
    evidence: list[Excerpt] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def unique(self):
        if len({item.id for item in self.evidence}) != len(self.evidence):
            raise ValueError("distinct_evidence_required")
        return self


class EvidenceAdmission(Strict):
    directory: str = Field(min_length=1, max_length=1024)
    plan_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    receipt_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    packet_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    approved_at: AwareDatetime
    expires_at: AwareDatetime

    @model_validator(mode="after")
    def finite_research_use(self):
        if not self.approved_at < self.expires_at <= self.approved_at + timedelta(days=1):
            raise ValueError("finite_research_use_required")
        return self


class EvidenceRequest(Strict):
    version: Literal["acquisition-evidence-role.v1"] = VERSION
    request_id: UUID
    authorization_id: UUID
    role: Literal["research", "qualification"]
    team: NativeTeam
    campaign: Campaign
    prospect: ResearchSubject
    evidence: EvidenceAdmission
    job_text: str = Field(min_length=1, max_length=3000)
    parents: tuple[ParentReceipt, ...] = Field(default=(), max_length=1)

    @model_validator(mode="after")
    def research_only(self):
        if (
            self.authorization_id != getattr(self.team, self.role).authorization_id
            or self.campaign.mode != "research_only"
            or self.campaign.max_model_calls < 1
            or self.prospect.requested_country not in self.campaign.countries
            or (self.role == "research" and self.parents)
            or (
                self.role == "qualification"
                and (len(self.parents) != 1 or self.parents[0].role != "research")
            )
            or len(self.model_dump_json().encode()) > 65536
        ):
            raise ValueError("recipientless_research_only_required")
        return self

    @property
    def calibration(self):
        return None

    @property
    def mail(self):
        return None

    @property
    def native(self):
        return None


def evidence_work(value):
    return isinstance(value, EvidenceRequest)
