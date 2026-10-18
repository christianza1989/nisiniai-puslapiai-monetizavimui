"""Bounded reviewed external source metadata, not arbitrary executable imports."""
import json
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..contracts import Strict

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Reference = Annotated[str, Field(min_length=1, max_length=1024)]


class Fact(Strict):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    text: str = Field(min_length=3, max_length=2000)
    source_ref: Reference


class SourcePayload(Strict):
    version: Literal["external-business-source.v1"]
    external_revision: str = Field(min_length=1, max_length=200)
    artifact_ref: Reference
    artifact_sha256: Digest
    knowledge_sha256: Digest
    profile_sha256: Digest | None = None
    review_evidence_refs: list[Reference] = Field(min_length=1, max_length=12)
    facts: list[Fact] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def bounded_material(self):
        value = self.model_dump(mode="json")

        def check(item):
            if isinstance(item, str):
                if not item.strip() or any((ord(c) < 32 and c not in "\n\t") or ord(c) == 127 for c in item):
                    raise ValueError("invalid_source_text")
            elif isinstance(item, dict):
                for child in item.values():
                    check(child)
            elif isinstance(item, list):
                for child in item:
                    check(child)

        check(value)
        if (len(json.dumps(value, ensure_ascii=False).encode()) > 32768
                or len({f.id for f in self.facts}) != len(self.facts)
                or len(set(self.review_evidence_refs)) != len(self.review_evidence_refs)):
            raise ValueError("invalid_source_payload")
        return self


class Approve(Strict):
    business_id: UUID
    authorizing_session_id: UUID
    request_id: UUID
    source_revision: Source
    duration_seconds: int = Field(strict=True, ge=30, le=2592000)
    payload: SourcePayload


class Inspect(Strict):
    business_id: UUID
    binding_id: UUID
    authorizing_session_id: UUID
    source_revision: Source


class Revoke(Inspect):
    expected_fingerprint: Digest
