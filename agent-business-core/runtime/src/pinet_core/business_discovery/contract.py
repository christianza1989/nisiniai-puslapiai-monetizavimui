"""Generate the exact additive discovery/BFF wire, without importing execution configuration."""
import json
from pathlib import Path

from pydantic import Field

from ..creation.wire import Strict
from .wire import (
    Approve,
    Archive,
    ArchivedDiscovery,
    ArchiveView,
    BuildResult,
    DiscoveryView,
    Execution,
    History,
    Message,
    ReportView,
    Start,
)


class Discoveries(Strict):
    items: list[DiscoveryView] = Field(max_length=100)


class Reports(Strict):
    items: list[ReportView] = Field(max_length=50)
    offset: int
    limit: int
    has_more: bool


def contract():
    schemas = {}
    for model in (Start, Message, Approve, Archive, DiscoveryView, ReportView, ArchiveView, Discoveries, Reports,
                  BuildResult, ArchivedDiscovery, History, Execution):
        value = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(value.pop("$defs", {}))
        schemas[model.__name__] = value
    schemas["CoreError"] = {"type": "object", "required": ["detail"],
        "properties": {"detail": {"type": "object", "properties": {"code": {"type": "string"}}}}}
    paths = {}
    actions = [
        ("post", "/customer/v2/discoveries", "Start", "DiscoveryView", 202),
        ("get", "/customer/v2/discoveries", None, "Discoveries", 200),
        ("get", "/customer/v2/discoveries/{discovery_id}", None, "DiscoveryView", 200),
        ("post", "/customer/v2/discoveries/{discovery_id}/messages", "Message", "DiscoveryView", 202),
        ("get", "/customer/v2/discoveries/{discovery_id}/reports", None, "Reports", 200),
        ("post", "/customer/v2/discoveries/{discovery_id}/build", "Approve", "BuildResult", 202),
        ("post", "/customer/v2/discoveries/{discovery_id}/archive", "Archive", "ArchivedDiscovery", 200),
        ("get", "/customer/v2/discoveries/{discovery_id}/messages", None, "History", 200),
        ("get", "/customer/v2/discoveries/{discovery_id}/execution", None, "Execution", 200),
        ("post", "/customer/v2/creations/{creation_id}/archive", "Archive", "ArchiveView", 200),
    ]
    for method, path, body, response, code in actions:
        data = {"$ref": "#/components/schemas/" + response} if response else {"type": "object"}
        envelope = {"type": "object", "required": ["contract_version", "data"],
                    "properties": {"contract_version": {"type": "string"}, "data": data}}
        operation = {"security": [{"CustomerSession": []}], "responses": {str(code):
            {"description": "Current own scoped result", "content": {"application/json": {"schema": envelope}}}}}
        parameters = []
        for key in ("discovery_id", "creation_id"):
            if "{" + key + "}" in path:
                parameters.append({"name": key, "in": "path", "required": True,
                                   "schema": {"type": "string", "format": "uuid"}})
        if method == "get" and path.endswith(("/messages", "/reports")):
            parameters.extend([{"name": key, "in": "query", "schema": {"type": "integer",
                "minimum": 0 if key == "offset" else 1, "default": 0 if key == "offset" else 20}}
                for key in ("offset", "limit")])
        if method == "get" and path == "/customer/v2/discoveries":
            parameters.append({"name": "include_archived", "in": "query", "schema": {"type": "boolean", "default": False}})
        if parameters:
            operation["parameters"] = parameters
        if body:
            operation["requestBody"] = {"required": True, "content": {"application/json":
                {"schema": {"$ref": "#/components/schemas/" + body}}}}
        for error in (400, 401, 404, 409, 429, 503):
            operation["responses"][str(error)] = {"description": "Current authority, stale state, conflict or unavailable dependency",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CoreError"}}}}
        paths.setdefault(path, {})[method] = operation
    return {"openapi": "3.1.0", "info": {"title": "Ordinary customer business discovery",
        "version": "business-discovery.v1", "description":
        "Short idea/no-idea conversation and versioned flexible business/acquisition/tools report. No creation or site before explicit exact-report approval. Uses existing verified customer session/own portfolio; strict body16KiB, durable idempotency and base revision CAS. A ready plan requires two independent role reviews; source/model/tool claims are not independently verified operations. Build approval creates exactly one existing shared creation job, with the full immutable approved report in server context. This first source adapter does not itself certify full website foundation, designer, agents, calibration or public launch. Archives remove test creations from active listing, cancel pending dispatch and retain all history/accounting; own detail/history remains accessible. Held live channels and costs remain separate."},
        "paths": paths, "components": {"schemas": schemas, "securitySchemes":
            {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[5] / "docs/contracts/verslomatika-business-discovery.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical discovery contract written")
