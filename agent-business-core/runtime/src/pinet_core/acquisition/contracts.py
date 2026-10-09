from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import Field, HttpUrl, field_validator

from ..contracts import Strict


class Evidence(Strict):
    id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,80}$')
    url: HttpUrl
    checked_at: datetime
    expires_at: datetime
    fact: str = Field(min_length=3, max_length=2000)
    use_allowed: bool = False

    @field_validator('checked_at', 'expires_at')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('timezone_required')
        return value


class Prospect(Strict):
    site_id: str
    organization_key: str = Field(min_length=3, max_length=120)
    name: str = Field(min_length=2, max_length=200)
    role: Literal['buyer', 'provider', 'supplier', 'referral']
    segment: str
    country: str
    evidence: list[Evidence] = Field(min_length=1, max_length=12)
    contact_source_id: str | None = None
    contact_verified: bool = False
    contact_basis_verified: bool = False
    provider_allowed: bool = False
    suppressed: bool = False
    status: Literal['new', 'replied', 'refused', 'bounce', 'complaint', 'ooo', 'uncertain'] = 'new'


class OfferFact(Strict):
    id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,80}$')
    text: str = Field(min_length=3, max_length=2000)
    source: str = Field(min_length=3, max_length=500)
    expires_at: datetime

    @field_validator('expires_at')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('timezone_required')
        return value


class Campaign(Strict):
    site_id: str = Field(pattern=r'^[a-z0-9-]{1,64}$')
    campaign_id: str = Field(pattern=r'^[a-z0-9-]{1,64}$')
    sector: Literal['general', 'medical_equipment'] = 'general'
    objective: Literal['product_sale', 'provider_signup'] = 'product_sale'
    mode: Literal['research_only', 'draft_only'] = 'research_only'
    timezone: str = 'Europe/Vilnius'
    segments: list[str] = Field(min_length=1, max_length=20)
    countries: list[str] = Field(min_length=1, max_length=20)
    facts: list[OfferFact] = Field(min_length=1, max_length=40)
    enabled: bool = False
    paused: bool = False
    max_prospects: int = Field(default=10, ge=1, le=100)
    max_model_calls: int = Field(default=20, ge=0, le=200)
    expires_at: datetime

    @field_validator('timezone')
    @classmethod
    def zone(cls, value):
        ZoneInfo(value)
        return value

    @field_validator('expires_at')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('timezone_required')
        return value

    @field_validator('facts')
    @classmethod
    def unique(cls, value):
        if len({f.id for f in value}) != len(value):
            raise ValueError('duplicate_fact_id')
        return value


class Assessment(Strict):
    fit: Literal['yes', 'no', 'unknown']
    intent: Literal['explicit', 'possible', 'none', 'unknown']
    reasons: str = Field(min_length=3, max_length=1500)
    evidence_ids: list[str]
    next_action: Literal['draft', 'research', 'exclude', 'stop']
    subject: str = Field(max_length=160)
    body: str = Field(max_length=3000)
    offer_fact_ids: list[str]


class Review(Strict):
    factual: bool
    relevant: bool
    one_clear_next_step: bool
    no_unverified_promises: bool
    no_source_instructions: bool
    reason: str = Field(min_length=3, max_length=1200)
