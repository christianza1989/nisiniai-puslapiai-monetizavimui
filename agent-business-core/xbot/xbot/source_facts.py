"""Lossless bounded source transport. Pieces are not independent confirmed claims."""

import hashlib
import json
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, StrictInt

CHUNK_SIZE, MAX_FACTS, MAX_CITATIONS = 1800, 35, 10


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceGroup(Strict):
    page_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=1, max_length=600)
    revision_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    projection_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    text_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    text_length: int = Field(gt=0, le=CHUNK_SIZE * MAX_CITATIONS, strict=True)
    fact_indices: list[StrictInt] = Field(min_length=1, max_length=MAX_CITATIONS)


class SourceFragment(Strict):
    fact_index: int = Field(ge=0, lt=MAX_FACTS, strict=True)
    page_id: str = Field(min_length=1, max_length=100)
    part: int = Field(ge=0, lt=MAX_CITATIONS, strict=True)
    parts: int = Field(ge=1, le=MAX_CITATIONS, strict=True)
    start: int = Field(ge=0, strict=True)
    end: int = Field(gt=0, strict=True)
    text_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class SourceFactManifest(Strict):
    schema_version: Literal["xbot.source-facts.v1"] = "xbot.source-facts.v1"
    span_unit: Literal["unicode-code-point"] = "unicode-code-point"
    groups: list[SourceGroup] = Field(min_length=1, max_length=MAX_FACTS)
    fragments: list[SourceFragment] = Field(min_length=1, max_length=MAX_FACTS)


def text_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def manifest_hash(manifest):
    """Compact versioned manifest digest; NOT store.fingerprint(facts) or text SHA."""
    if manifest is None:
        return None
    value = SourceFactManifest.model_validate(manifest).model_dump(mode="json")
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()


def source_url(url, canonical_host):
    value = urlsplit(url)
    if value.scheme != "https" or value.netloc != canonical_host or value.username or value.password:
        raise ValueError("source_fact_url_scope_conflict")


def validate_manifest(facts, manifest, *, canonical_host=None):
    """Return exact reconstructed source groups only after all ordered spans/hashes pass."""
    value = SourceFactManifest.model_validate(manifest)
    if not 1 <= len(facts) <= MAX_FACTS or any(type(f) is not str or not 1 <= len(f) <= CHUNK_SIZE for f in facts):
        raise ValueError("source_facts_capacity_exceeded")
    if len(value.fragments) != len(facts):
        raise ValueError("source_fact_manifest_incomplete")
    ids = [g.page_id for g in value.groups]
    if ids != sorted(set(ids)):
        raise ValueError("source_fact_page_order_conflict")
    texts, offset = [], 0
    for group in value.groups:
        if canonical_host:
            source_url(group.url, canonical_host)
        count = (group.text_length + CHUNK_SIZE - 1) // CHUNK_SIZE
        indices = list(range(offset, offset + count))
        if (
            any(type(i) is not int for i in group.fact_indices)
            or group.fact_indices != indices
            or indices[-1] >= len(facts)
        ):
            raise ValueError("source_fact_group_indices_conflict")
        pieces = []
        for part, index in enumerate(indices):
            fragment, piece = value.fragments[index], facts[index]
            if (
                (fragment.fact_index, fragment.page_id, fragment.part, fragment.parts, fragment.start, fragment.end)
                != (
                    index,
                    group.page_id,
                    part,
                    count,
                    part * CHUNK_SIZE,
                    min((part + 1) * CHUNK_SIZE, group.text_length),
                )
                or len(piece) != fragment.end - fragment.start
                or text_hash(piece) != fragment.text_sha256
            ):
                raise ValueError("source_fact_span_or_hash_conflict")
            pieces.append(piece)
        original = "".join(pieces)
        if len(original) != group.text_length or text_hash(original) != group.text_sha256:
            raise ValueError("source_fact_reconstruction_conflict")
        texts.append(original)
        offset += count
    if offset != len(facts):
        raise ValueError("source_fact_manifest_incomplete")
    return value, texts


def project(pages, *, canonical_host):
    """All complete current pages or an explicit blocker. No semantic summary/subset/trim."""
    if not pages or len(pages) > MAX_FACTS:
        raise ValueError("source_facts_capacity_exceeded")
    ordered = sorted(pages, key=lambda p: p["id"])
    if len({p["id"] for p in ordered}) != len(ordered):
        raise ValueError("source_fact_duplicate_page")
    facts, groups, fragments = [], [], []
    for page in ordered:
        original = page["text"]
        if type(original) is not str or not original:
            raise ValueError("source_fact_empty_or_invalid_page")
        count = (len(original) + CHUNK_SIZE - 1) // CHUNK_SIZE
        if count > MAX_CITATIONS or len(facts) + count > MAX_FACTS:
            raise ValueError("source_facts_capacity_exceeded")
        source_url(page["url"], canonical_host)
        offset = len(facts)
        groups.append(
            SourceGroup(
                page_id=page["id"],
                title=page["title"],
                url=page["url"],
                revision_hash=page["revision_hash"],
                projection_hash=page["projection_hash"],
                text_sha256=text_hash(original),
                text_length=len(original),
                fact_indices=list(range(offset, offset + count)),
            )
        )
        for part in range(count):
            start, end = part * CHUNK_SIZE, min((part + 1) * CHUNK_SIZE, len(original))
            piece = original[start:end]
            fragments.append(
                SourceFragment(
                    fact_index=len(facts),
                    page_id=page["id"],
                    part=part,
                    parts=count,
                    start=start,
                    end=end,
                    text_sha256=text_hash(piece),
                )
            )
            facts.append(piece)
    manifest = SourceFactManifest(groups=groups, fragments=fragments)
    validate_manifest(facts, manifest, canonical_host=canonical_host)
    return {
        "facts": facts,
        "source_fact_manifest": manifest.model_dump(mode="json"),
        "source_fact_manifest_sha256": manifest_hash(manifest),
    }


def validate_citations(facts, manifest, indices):
    if (
        not isinstance(indices, list)
        or len(indices) > MAX_CITATIONS
        or any(type(i) is not int or not 0 <= i < len(facts) for i in indices)
        or len(set(indices)) != len(indices)
    ):
        raise ValueError("source_fact_citation_indices_invalid")
    if manifest is None:  # Legacy standalone flat facts remain supported.
        return
    value, _ = validate_manifest(facts, manifest)
    selected = set(indices)
    for group in value.groups:
        required = set(group.fact_indices)
        if selected & required and not required <= selected:
            raise ValueError("source_fact_incomplete_citation_group")
