"""Strict portable catalogue schema; generated source prose is deliberately excluded."""

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .taxonomy import CATEGORIES

Score = Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]
Rank = Annotated[int, Field(ge=1, le=100_000, strict=True)]
Short = Annotated[str, Field(max_length=180)]


def normalized_host(value: str) -> str:
    if not isinstance(value, str) or len(value) > 253:
        raise ValueError("invalid_domain")
    host = value.strip().rstrip(".").lower().encode("idna").decode("ascii")
    labels = host.split(".")
    if len(labels) < 2 or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", p)
                              for p in labels):
        raise ValueError("invalid_domain")
    if not re.fullmatch(r"[a-z]{2,63}|xn--[a-z0-9-]{2,59}", labels[-1]):
        raise ValueError("invalid_domain")
    return host


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SourceDocument(StrictModel):
    name: Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")]
    sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class RankComparison(StrictModel):
    research_priority_differences: Annotated[int, Field(ge=0, le=200, strict=True)]
    initial_rank_differences: Annotated[int, Field(ge=0, le=200, strict=True)]


class Metadata(StrictModel):
    snapshot_date: date
    inventory_count: Rank
    screening_count: Annotated[int, Field(ge=0, le=100_000, strict=True)]
    top200_count: Literal[200]
    top200_research_complete_count: Annotated[int, Field(ge=0, le=200, strict=True)]
    top200_research_pending_count: Annotated[int, Field(ge=0, le=200, strict=True)]
    source_documents: Annotated[list[SourceDocument], Field(min_length=5, max_length=5)]
    original_inventory_sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    classification_counts: dict[Literal["source_ai_screening", "lexical_inference", "unclassified"], int]
    screening_models: Annotated[list[Short], Field(max_length=10)]
    screening_versions: Annotated[list[Short], Field(max_length=10)]
    taxonomy_version: Literal["lexical-v1"]
    selection_created_at: datetime
    selection_priority_updated_at: datetime
    rank_comparison: RankComparison
    availability: Literal["unknown"]
    availability_checked_at: None
    notice: Annotated[str, Field(max_length=300)]
    score_notice: Annotated[str, Field(max_length=300)]


class TopSelection(StrictModel):
    research_priority: Annotated[int, Field(ge=1, le=200, strict=True)]
    potential_priority: Annotated[int, Field(ge=1, le=200, strict=True)]
    initial_selection_rank: Annotated[int, Field(ge=1, le=200, strict=True)]
    selection_value_heuristic: Annotated[float, Field(ge=0, le=150, allow_inf_nan=False)]
    source_niche_key: Short
    potential_tier: Short
    research_source_priority: Annotated[int, Field(ge=1, le=200, strict=True)]
    research_source_initial_rank: Annotated[int, Field(ge=1, le=200, strict=True)]
    ahrefs_dr: Score | None
    ahrefs_dr_checked_at: datetime | None
    ahrefs_dr_source: Literal["https://api.ahrefs.com/v3/public/domain-rating-free"] | None
    research_score: Score | None
    research_evaluated_at: datetime | None

    @field_validator("ahrefs_dr_checked_at", "research_evaluated_at")
    @classmethod
    def aware_dates(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("timezone_required")
        return value


class DomainRecord(StrictModel):
    domain: Annotated[str, Field(max_length=253)]
    category: str
    classification_source: Literal["source_ai_screening", "lexical_inference", "unclassified"]
    category_evidence: Annotated[list[Short], Field(max_length=8)]
    niche: Short | None
    keyword: Short | None
    risk: Literal["none", "brand", "regulated", "ambiguous", "adult", "gambling", "unknown"]
    source_index: Rank
    queue_rank: Rank
    queue_score: Score
    screening_rank: Rank | None
    screening_score: Score | None
    screening_evaluated_at: datetime | None
    top200: TopSelection | None

    @field_validator("domain")
    @classmethod
    def strict_host(cls, value):
        if normalized_host(value) != value:
            raise ValueError("canonical_domain_required")
        return value

    @field_validator("category")
    @classmethod
    def category_id(cls, value):
        if value not in CATEGORIES:
            raise ValueError("unknown_category")
        return value

    @field_validator("screening_evaluated_at")
    @classmethod
    def aware_date(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("timezone_required")
        return value

    @model_validator(mode="after")
    def classification_consistent(self):
        fields = (self.screening_rank, self.screening_score, self.screening_evaluated_at)
        if self.classification_source == "source_ai_screening":
            if any(value is None for value in fields) or self.category == "unclassified":
                raise ValueError("missing_screening_evidence")
        elif any(value is not None for value in fields) or self.niche is not None or self.keyword is not None:
            raise ValueError("inference_cannot_invent_screening")
        if self.classification_source == "lexical_inference" and not self.category_evidence:
            raise ValueError("missing_lexical_evidence")
        if self.classification_source == "unclassified" and self.category != "unclassified":
            raise ValueError("invalid_unclassified_category")
        if self.top200 is not None and self.classification_source != "source_ai_screening":
            raise ValueError("selected_domain_missing_screening")
        return self


COLUMNS = list(DomainRecord.model_fields)
