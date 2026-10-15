"""Bounded pure reads and explainable suggestions from a verified snapshot."""

import hashlib
import json
from collections import Counter
from functools import lru_cache
from pathlib import Path

from .models import COLUMNS, DomainRecord, Metadata, normalized_host
from .taxonomy import CATEGORIES, folded, niche_categories, recommendation_terms, tokens

SORTS = ("source", "queue", "screening", "research_priority", "potential")
VERSION = "domains.v1"
MAX_BYTES = 32 * 1024 * 1024
RISK_LABELS = {
    "none": "Specifinė rizika nepastebėta; patikra neatlikta",
    "brand": "Galimas prekės ženklo sutapimas; būtina patikra",
    "regulated": "Reguliuojama niša arba ekspertinio turinio poreikis",
    "ambiguous": "Neaiški pavadinimo reikšmė",
    "adult": "Suaugusiųjų turinio ribojimai",
    "gambling": "Lošimų reguliavimas ir reklamos ribojimai",
    "unknown": "Rizika nevertinta",
}


class CatalogueError(ValueError):
    """Safe reason code only; caller maps malformed queries to400, corrupt source to503."""


def snapshot_hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, separators=(",", ":"),
                                     sort_keys=True).encode("utf-8")).hexdigest()


class DomainCatalogue:
    def __init__(self, snapshot: dict):
        try:
            if set(snapshot) != {"catalogue_version", "snapshot_id", "metadata", "columns", "rows"}:
                raise ValueError("snapshot_shape")
            if snapshot["catalogue_version"] != VERSION or snapshot["columns"] != COLUMNS:
                raise ValueError("snapshot_version")
            payload = {key: value for key, value in snapshot.items() if key != "snapshot_id"}
            if snapshot_hash(payload) != snapshot["snapshot_id"]:
                raise ValueError("snapshot_hash")
            rows = snapshot["rows"]
            if not isinstance(rows, list) or not 1 <= len(rows) <= 100_000:
                raise ValueError("snapshot_size")
            records = []
            for row in rows:
                if not isinstance(row, list) or len(row) != len(COLUMNS):
                    raise ValueError("row_shape")
                records.append(DomainRecord.model_validate(dict(zip(COLUMNS, row, strict=True))))
            domains = {row.domain for row in records}
            if len(domains) != len(records):
                raise ValueError("duplicate_domain")
            for field in ("source_index", "queue_rank"):
                if {getattr(row, field) for row in records} != set(range(1, len(records) + 1)):
                    raise ValueError("incomplete_source_ranks")
            selected = [row.top200 for row in records if row.top200]
            if len(selected) != 200:
                raise ValueError("incomplete_top200")
            for field in ("research_priority", "potential_priority", "initial_selection_rank"):
                if {getattr(row, field) for row in selected} != set(range(1, 201)):
                    raise ValueError("duplicate_top200_ranks")
            self._metadata = Metadata.model_validate(snapshot["metadata"]).model_dump(mode="json")
            if self._metadata["inventory_count"] != len(records):
                raise ValueError("metadata_count")
            count = sum(row.classification_source == "source_ai_screening" for row in records)
            if self._metadata["screening_count"] != count or self._metadata["top200_count"] != 200:
                raise ValueError("metadata_count")
            if {row.screening_rank for row in records if row.screening_rank} != set(range(1, count + 1)):
                raise ValueError("incomplete_screening_ranks")
            if self._metadata["classification_counts"] != dict(Counter(row.classification_source for row in records)):
                raise ValueError("metadata_classification_counts")
            completed = sum(row.top200 is not None and row.top200.research_score is not None for row in records)
            if (self._metadata["top200_research_complete_count"] != completed
                    or self._metadata["top200_research_pending_count"] != 200 - completed):
                raise ValueError("metadata_research_count")
        except (ValueError, TypeError, KeyError) as exc:
            raise CatalogueError("catalogue_invalid") from exc
        self.snapshot_id = snapshot["snapshot_id"]
        self._records = tuple(records)
        self._by_domain = {row.domain: row for row in records}
        self._search = {row.domain: folded(" ".join(filter(None, (
            row.domain, row.niche, row.keyword, CATEGORIES[row.category], row.category,
        )))) for row in records}
        self._orders = {sort: tuple(sorted(records, key=lambda row: self._sort_key(row, sort)))
                        for sort in SORTS}

    @classmethod
    @lru_cache(maxsize=1)
    def default(cls):
        path = Path(__file__).with_name("catalogue.json")
        try:
            if path.stat().st_size > MAX_BYTES:
                raise ValueError("snapshot_too_large")
            return cls(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, UnicodeError, ValueError) as exc:
            raise CatalogueError("catalogue_unavailable") from exc

    @staticmethod
    def _sort_key(row, sort):
        if sort == "source":
            return (row.source_index,)
        if sort == "queue":
            return (row.queue_rank,)
        if sort == "screening":
            return (row.screening_rank or 100_001, row.queue_rank)
        if sort == "potential":
            return (row.top200.potential_priority if row.top200 else 201,
                    row.screening_rank or 100_001, row.queue_rank)
        return (row.top200.research_priority if row.top200 else 201,
                row.screening_rank or 100_001, row.queue_rank)

    def _view(self, row):
        result = row.model_dump(mode="json")
        result.update(category_label=CATEGORIES[row.category], availability="unknown",
                      availability_checked_at=None, risk_label=RISK_LABELS[row.risk])
        return result

    @staticmethod
    def _bounds(value, low, high):
        if type(value) is not int or not low <= value <= high:
            raise CatalogueError("invalid_bounds")
        return value

    @staticmethod
    def _category(value):
        if value is not None and value not in CATEGORIES:
            raise CatalogueError("invalid_category")
        return value

    @staticmethod
    def _query(value):
        if not isinstance(value, str) or len(value) > 120 or any(ord(c) < 32 for c in value):
            raise CatalogueError("invalid_query")
        return value.strip()

    def metadata(self):
        return {"catalogue_version": VERSION, "snapshot_id": self.snapshot_id,
                **json.loads(json.dumps(self._metadata))}

    def facets(self):
        counts = Counter(row.category for row in self._records)
        top_counts = Counter(row.category for row in self._records if row.top200)
        return [{"id": key, "label": label, "count": counts[key], "top200_count": top_counts[key]}
                for key, label in CATEGORIES.items()]

    def get(self, domain):
        try:
            domain = normalized_host(domain)
        except (ValueError, UnicodeError) as exc:
            raise CatalogueError("invalid_domain") from exc
        row = self._by_domain.get(domain)
        return self._view(row) if row else None

    def search(self, query="", category=None, top200_only=False, offset=0, limit=50,
               sort="research_priority"):
        query = self._query(query)
        category = self._category(category)
        self._bounds(offset, 0, 100_000)
        self._bounds(limit, 1, 100)
        if type(top200_only) is not bool or sort not in SORTS:
            raise CatalogueError("invalid_filter")
        terms = tokens(query)
        matches = [row for row in self._orders[sort]
                   if (category is None or row.category == category)
                   and (not top200_only or row.top200 is not None)
                   and all(term in self._search[row.domain] for term in terms)]
        return {"catalogue_version": VERSION, "snapshot_id": self.snapshot_id,
                "query": query, "category": category, "top200_only": top200_only, "sort": sort,
                "offset": offset, "limit": limit, "total": len(matches),
                "items": [self._view(row) for row in matches[offset:offset + limit]]}

    def recommend(self, niche, category=None, limit=5):
        niche = self._query(niche)
        if not niche:
            raise CatalogueError("niche_required")
        category = self._category(category)
        self._bounds(limit, 1, 20)
        terms = recommendation_terms(niche)
        # "Paslaugos" must not infer business merely through the category's label.
        inferred = niche_categories(" ".join(terms))
        # The supplied category narrows candidates; it cannot make an unrelated niche relevant.
        categories = set(inferred) & {category} if category else set(inferred)
        candidates = []
        exact = folded(niche)
        for row in self._records:
            if category is not None and row.category != category:
                continue
            if row.category in ("adult", "gambling") and row.category not in categories:
                continue
            semantic_text = folded(" ".join(filter(None, (row.domain, row.niche, row.keyword))))
            hits = [word for word in terms if word in semantic_text]
            exact_match = exact == row.domain or exact == row.domain.rsplit(".", 1)[0]
            category_match = row.category in categories
            if not (exact_match or hits or category_match):
                continue
            kind = "exact_name" if exact_match else "keyword" if hits else "category"
            reason = {"exact_name": "Pavadinimas sutampa su jūsų užklausa.",
                      "keyword": "Pavadinimas arba ankstesnės atrankos niša atitinka užklausos žodžius.",
                      "category": "Domenas priskirtas jūsų pasirinktai arba pagal užklausą numanomai kategorijai."}[kind]
            # Relevance only; retain prior research order as a tie-break, never invent a market score.
            key = (-int(exact_match), -len(hits), -int(category_match),
                   *self._sort_key(row, "research_priority"))
            candidates.append((key, row, kind, hits or inferred.get(row.category, []), reason))
        candidates.sort(key=lambda item: item[0])
        return {"catalogue_version": VERSION, "snapshot_id": self.snapshot_id, "niche": niche,
                "category": category, "matched_categories": sorted(categories),
                "items": [{"domain": self._view(row), "match_kind": kind,
                           "matched_terms": hits[:8], "reason": reason}
                          for _, row, kind, hits, reason in candidates[:limit]]}
