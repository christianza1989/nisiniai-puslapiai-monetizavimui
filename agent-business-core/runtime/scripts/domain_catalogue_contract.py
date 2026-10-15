"""Generate the exact bounded domains.v1 wire from the module's strict actual models."""

import json
import sys
from pathlib import Path

from pydantic.json_schema import models_json_schema

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pinet_core.domain_catalogue import DomainCatalogue  # noqa: E402
from pinet_core.domain_catalogue.models import (  # noqa: E402
    Envelope,
    Error,
    FacetData,
    RecommendationData,
    RecommendationInput,
    SearchData,
)
from pinet_core.domain_catalogue.taxonomy import CATEGORIES  # noqa: E402


def document():
    models = [Error, RecommendationInput, Envelope[SearchData], Envelope[FacetData], Envelope[RecommendationData]]
    mappings, schema = models_json_schema([(model, "validation") for model in models],
                                         ref_template="#/components/schemas/{model}")
    definitions = schema["$defs"]
    response_names = {"search": Envelope[SearchData], "facets": Envelope[FacetData],
                      "recommend": Envelope[RecommendationData]}
    params = [
        ("query", {"type": "string", "maxLength": 120, "default": ""}),
        ("category", {"type": "string", "enum": list(CATEGORIES)}),
        ("top200_only", {"type": "boolean", "default": False}),
        ("offset", {"type": "integer", "minimum": 0, "maximum": 100_000, "default": 0}),
        ("limit", {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}),
        ("sort", {"type": "string", "enum": ["source", "queue", "screening", "research_priority", "potential"],
                  "default": "research_priority"}),
    ]
    paths = {}
    for method, path, operation, name in [
        ("get", "/customer/v2/domains", "searchCustomerDomains", "search"),
        ("get", "/customer/v2/domains/facets", "getCustomerDomainFacets", "facets"),
        ("post", "/customer/v2/domains/recommendations", "recommendCustomerDomains", "recommend"),
    ]:
        response = mappings[(response_names[name], "validation")]
        error = mappings[(Error, "validation")]
        entry = {
            "operationId": operation, "security": [{"CoreSession": []}],
            "parameters": [{"in": "query", "name": key, "required": False, "schema": value}
                           for key, value in params] if name == "search" else [],
            "responses": {
                "200": {"description": "Historical catalogue projection; availability and ownership unverified",
                        "headers": {"Cache-Control": {"schema": {"type": "string", "const": "private, no-store"}}},
                        "content": {"application/json": {"schema": response}}},
                **{str(code): {"description": reason, "content": {"application/json": {"schema": error}}}
                   for code, reason in [(400, "Invalid bounded request"), (401, "No current core session"),
                                        (403, "Local feature disabled or account not verified"),
                                        (429, "Action limit"), (503, "Pinned catalogue source unavailable")]},
            },
        }
        if name == "recommend":
            entry["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": mappings[(RecommendationInput, "validation")]}}}
        paths.setdefault(path, {})[method] = entry
    return {
        "openapi": "3.1.0", "info": {"title": "Verslomatika historical domain catalogue",
        "version": "0.1.0", "description": "domains.v1 LOCAL/TEST only. Same opaque core bearer session; "
            "verified customer or original operator required by parent adapter. Full historical45324 inventory, "
            "preserved9200 screening rows and frozenTOP200. No live availability/ownership/registrar purchase/DNS. "
            "Source ranks and inference are explicit; recommendations never promise demand or economics."},
        "paths": paths, "components": {"securitySchemes": {"CoreSession": {"type": "http", "scheme": "bearer"}},
                                      "schemas": definitions},
        "x-catalogue-snapshot": DomainCatalogue.default().snapshot_id,
        "x-shared-session": {"login": "/customer/v1/auth/login", "logout": "/operator/v2/auth/logout"},
    }


def encoded():
    return (json.dumps(document(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-domain-catalogue.openapi.json"
    target.write_bytes(encoded())
    print("Generated domains.v1: three authenticated bounded operations; no API/runtime mount enabled.")
