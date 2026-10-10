"""Actual inventory integrity and bounded read-only customer catalogue behavior."""

import copy
import csv
import importlib.util
import io
import json
from pathlib import Path

import pytest

from pinet_core.domain_catalogue import CatalogueError, DomainCatalogue
from pinet_core.domain_catalogue.build import build, encode_snapshot
from pinet_core.domain_catalogue.models import (
    COLUMNS,
    Envelope,
    FacetData,
    RecommendationData,
    RecommendationInput,
    SearchData,
)
from pinet_core.domain_catalogue.service import snapshot_hash
from pinet_core.domain_catalogue.taxonomy import infer_category

PACKAGE = Path(__file__).parents[1] / "src/pinet_core/domain_catalogue/catalogue.json"


@pytest.fixture(scope="module")
def catalogue():
    return DomainCatalogue.default()


@pytest.fixture(scope="module")
def snapshot():
    return json.loads(PACKAGE.read_text(encoding="utf-8"))


def signed(snapshot):
    snapshot["snapshot_id"] = snapshot_hash({k: v for k, v in snapshot.items() if k != "snapshot_id"})
    return snapshot


def test_actual_full_inventory_counts_and_research_limits(catalogue):
    metadata = catalogue.metadata()
    assert metadata["inventory_count"] == 45324
    assert metadata["screening_count"] == 9200
    assert metadata["top200_count"] == 200
    assert metadata["top200_research_complete_count"] == 50
    assert metadata["top200_research_pending_count"] == 150
    assert metadata["classification_counts"] == {
        "source_ai_screening": 9200, "lexical_inference": 278, "unclassified": 35846,
    }
    assert sum(row["count"] for row in catalogue.facets()) == 45324
    assert sum(row["top200_count"] for row in catalogue.facets()) == 200
    assert metadata["availability"] == "unknown" and metadata["availability_checked_at"] is None


def test_packaged_snapshot_has_portable_identical_utf8_lf_bytes(snapshot, tmp_path):
    target = tmp_path / "snapshot.json"
    target.write_bytes(encode_snapshot(snapshot))
    assert target.read_bytes() == PACKAGE.read_bytes()
    assert target.read_bytes().endswith(b"\n") and not target.read_bytes().endswith(b"\r\n")


def test_no_missing_or_overlapping_top200_pages(catalogue):
    first = catalogue.search(top200_only=True, limit=100)
    second = catalogue.search(top200_only=True, offset=100, limit=100)
    assert first["total"] == second["total"] == 200
    rows = first["items"] + second["items"]
    assert len({row["domain"] for row in rows}) == 200
    assert [row["top200"]["research_priority"] for row in rows] == list(range(1, 201))
    assert catalogue.search(top200_only=True, offset=200)["items"] == []
    assert all(row["availability"] == "unknown" for row in rows)


def test_historical_rank_difference_is_preserved(catalogue):
    row = catalogue.get("autoelektrikaivilniuje.lt")
    assert row["top200"]["research_priority"] == 1
    assert row["top200"]["initial_selection_rank"] == 157
    assert row["top200"]["research_source_initial_rank"] == 37
    assert row["top200"]["potential_priority"] == 76
    assert row["top200"]["ahrefs_dr"] == 18
    assert row["top200"]["research_score"] == 60
    assert row["screening_score"] == 89
    assert row["risk_label"] == "Specifinė rizika nepastebėta; patikra neatlikta"


def test_accent_insensitive_search_and_category_intersection(catalogue):
    one = catalogue.search(query="anglų kalbos", category="education", top200_only=True)
    two = catalogue.search(query="anglu kalbos", category="education", top200_only=True)
    assert one["items"] == two["items"] and one["total"] > 0
    assert all(row["category"] == "education" and row["top200"] for row in one["items"])
    assert catalogue.search(query="missingdomainzzzz") == {
        "catalogue_version": "domains.v1", "snapshot_id": catalogue.snapshot_id,
        "query": "missingdomainzzzz", "category": None, "top200_only": False,
        "sort": "research_priority", "offset": 0, "limit": 50, "total": 0, "items": [],
    }


def test_full_source_tail_is_reachable(catalogue):
    tail = catalogue.search(sort="source", offset=45300, limit=100)
    assert tail["total"] == 45324 and len(tail["items"]) == 24
    assert [row["source_index"] for row in tail["items"]] == list(range(45301, 45325))
    for row in tail["items"]:
        if row["classification_source"] != "source_ai_screening":
            assert row["screening_score"] is None and row["niche"] is None


def test_recommendation_has_actual_members_and_explainable_relevance(catalogue):
    result = catalogue.recommend("mokytojas ir kalbos", category="education", limit=5)
    assert len(result["items"]) == 5
    assert result["matched_categories"] == ["education"]
    for item in result["items"]:
        assert item["domain"] == catalogue.get(item["domain"]["domain"])
        assert item["domain"]["category"] == "education"
        assert item["match_kind"] in {"keyword", "category"} and item["reason"]
        assert item["domain"]["availability"] == "unknown"
    exact = catalogue.recommend("autoelektrikaivilniuje.lt", limit=1)["items"][0]
    assert exact["domain"]["domain"] == "autoelektrikaivilniuje.lt"
    assert exact["match_kind"] == "exact_name"
    assert catalogue.recommend("zzzznonexistentzzzz")["items"] == []


def test_inferred_category_never_invents_source_scores():
    assert infer_category("rekuperacija-specialistai.lt") == ("energy", ["rekuperacija"])
    assert infer_category("rekuperacija-kirpykla.lt") == ("unclassified", [])
    assert infer_category("xyzabc.lt") == ("unclassified", [])


@pytest.mark.parametrize("kwargs", [
    {"query": "x" * 121}, {"query": "\n"}, {"limit": 0}, {"limit": 101},
    {"limit": True}, {"offset": -1}, {"offset": 100001}, {"category": "not-a-category"},
    {"sort": "random"}, {"top200_only": 1},
])
def test_unbounded_or_malformed_reads_rejected(catalogue, kwargs):
    with pytest.raises(CatalogueError):
        catalogue.search(**kwargs)


@pytest.mark.parametrize("domain", ["../../.env", "a@example.org", "127.0.0.1", "https://example.org", "x..lt"])
def test_domain_input_cannot_be_a_path_contact_ip_or_url(catalogue, domain):
    with pytest.raises(CatalogueError, match="invalid_domain"):
        catalogue.get(domain)


def test_mutating_response_cannot_change_cached_catalogue(catalogue):
    response = catalogue.get("autoelektrikaivilniuje.lt")
    response["top200"]["ahrefs_dr"] = 100
    response["category"] = "gambling"
    metadata = catalogue.metadata()
    metadata["source_documents"][0]["name"] = "secret"
    assert catalogue.get("autoelektrikaivilniuje.lt")["top200"]["ahrefs_dr"] == 18
    assert catalogue.get("autoelektrikaivilniuje.lt")["category"] == "auto"
    assert catalogue.metadata()["source_documents"][0]["name"] == "domenai_clean.txt"


@pytest.mark.parametrize("fault", ["hash", "duplicate", "rank", "category", "extra", "availability"])
def test_corrupt_or_invented_source_rejected(snapshot, fault):
    candidate = copy.deepcopy(snapshot)
    if fault == "hash":
        candidate["rows"][0][0] = "changed.example.org"
    elif fault == "duplicate":
        candidate["rows"][1][0] = candidate["rows"][0][0]
    elif fault == "rank":
        candidate["rows"][1][COLUMNS.index("queue_rank")] = candidate["rows"][0][COLUMNS.index("queue_rank")]
    elif fault == "category":
        candidate["rows"][0][COLUMNS.index("category")] = "invented"
    elif fault == "extra":
        candidate["metadata"]["contact_email"] = "synthetic@example.org"
    else:
        candidate["metadata"]["availability"] = "available"
    if fault != "hash":
        signed(candidate)
    with pytest.raises(CatalogueError, match="catalogue_invalid"):
        DomainCatalogue(candidate)


def test_build_rejects_source_membership_before_output(tmp_path):
    inventory = tmp_path / "inventory.txt"
    inventory.write_text("one.example.org\n", encoding="utf-8")
    queue = tmp_path / "queue.csv"
    queue.write_text("Domenas;Vieta eilėje;Eilės balas (heuristinis)\ntwo.example.org;1;10\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unknown_or_duplicate_source_domain"):
        build(inventory, queue, "unused", "unused", "unused", "2026-10-10")


def test_tracked_top200_membership_and_research_scores_match(catalogue):
    source = Path(__file__).parents[3] / "inputs/domain-research-20261001/top200_su_dr.csv"
    rows = list(csv.DictReader(io.StringIO(source.read_text(encoding="utf-8-sig")), delimiter=";"))
    selected = set()
    for row in rows:
        item = catalogue.get(row["Domenas"])
        selected.add(item["domain"])
        assert item["top200"] is not None
        score = float(row["Tyrimo balas"].replace(",", ".")) if row["Tyrimo balas"] else None
        assert item["top200"]["research_score"] == score
        assert item["top200"]["research_source_priority"] == int(row["Tyrimo prioritetas 1–200"])
    assert len(selected) == 200


def test_exact_http_models_validate_actual_module_outputs(catalogue):
    search = SearchData.model_validate(catalogue.search(limit=100))
    facets = FacetData.model_validate({"items": catalogue.facets(), "metadata": catalogue.metadata()})
    recommendations = RecommendationData.model_validate(catalogue.recommend("mokytojas", limit=10))
    assert search.total == 45324 and len(search.items) == 100
    assert facets.metadata.top200_count == 200 and len(facets.items) == 37
    assert 1 <= len(recommendations.items) <= 10
    request = RecommendationInput.model_validate({"niche": "mokytojas", "category": None, "limit": 5})
    assert request.niche == "mokytojas"
    receipt = {"contract_version": "domains.v1", "environment": "test", "source_revision": "a" * 40,
               "observed_at": "2026-10-10T09:00:00Z", "request_id": "00000000-0000-0000-0000-000000000001",
               "data": catalogue.search(limit=1)}
    assert Envelope[SearchData].model_validate(receipt).data.items[0].availability == "unknown"
    receipt["environment"] = "production"
    with pytest.raises(ValueError):
        Envelope[SearchData].model_validate(receipt)


@pytest.mark.parametrize("payload", [
    {"niche": " ", "category": None, "limit": 1},
    {"niche": "mokytojas", "category": None, "limit": 11},
    {"niche": "mokytojas", "category": "invented", "limit": 1},
    {"niche": "mokytojas", "category": None, "limit": True},
    {"niche": "mokytojas", "category": None, "limit": 1, "tool_path": "anything"},
])
def test_http_request_model_rejects_unbounded_or_extra_input(payload):
    with pytest.raises(ValueError):
        RecommendationInput.model_validate(payload)


def test_canonical_http_document_bytes_and_all_refs():
    runtime = Path(__file__).parents[1]
    spec = importlib.util.spec_from_file_location("domain_catalogue_contract", runtime / "scripts/domain_catalogue_contract.py")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    contract = runtime.parents[1] / "docs/contracts/verslomatika-domain-catalogue.openapi.json"
    assert generator.encoded() == contract.read_bytes()
    doc = generator.document()
    assert set(doc["paths"]) == {"/customer/v2/domains", "/customer/v2/domains/facets",
                                 "/customer/v2/domains/recommendations"}
    schemas = doc["components"]["schemas"]
    refs = []

    def walk(value):
        if isinstance(value, dict):
            if "$ref" in value:
                refs.append(value["$ref"])
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(doc)
    assert refs and all(ref.startswith("#/components/schemas/") and ref.rsplit("/", 1)[1] in schemas for ref in refs)
    for methods in doc["paths"].values():
        for operation in methods.values():
            assert operation["security"] == [{"CoreSession": []}]
    assert schemas["RecommendationInput"]["properties"]["limit"]["maximum"] == 10
    assert schemas["DomainView"]["properties"]["availability"]["const"] == "unknown"
