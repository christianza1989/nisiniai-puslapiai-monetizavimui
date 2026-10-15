"""Generate the maintained strict read-only OpenAPI without importing an app/worker."""
import json
from pathlib import Path

from .wire import DocumentEnvelope, Envelope, Error


def document():
    schema = Envelope.model_json_schema(ref_template="#/components/schemas/{model}")
    definitions = schema.pop("$defs", {})
    definitions["Envelope"] = schema
    doc_schema = DocumentEnvelope.model_json_schema(ref_template="#/components/schemas/{model}")
    definitions.update(doc_schema.pop("$defs", {}))
    definitions["DocumentEnvelope"] = doc_schema
    definitions["Error"] = Error.model_json_schema()
    path = "/customer/v2/portfolios/{portfolio_id}/workspace/{kind}/{selection_id}/{collection}"
    parameters = [{"name": name, "in": "path", "required": True, "schema": spec} for name, spec in
        [("portfolio_id", {"type": "string", "format": "uuid"}),
         ("kind", {"type": "string", "enum": ["portfolio", "discovery", "creation", "business"]}),
         ("selection_id", {"type": "string", "format": "uuid"}),
         ("collection", {"type": "string", "enum": ["topics", "tasks", "results"]})]]
    parameters += [{"name": name, "in": "query", "schema": spec} for name, spec in
        [("limit", {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}),
         ("cursor", {"type": "string", "minLength": 1, "maxLength": 2048}),
         ("q", {"type": "string", "maxLength": 100, "default": ""})]]
    response = {"description": "Current authorized safe legacy index",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Envelope"}}}}
    doc_path = "/customer/v2/portfolios/{portfolio_id}/workspace/{kind}/{selection_id}/results/{result_kind}/{result_id}"
    doc_parameters = [p for p in parameters if p["in"] == "path" and p["name"] != "collection"]
    doc_parameters += [{"name": name, "in": "path", "required": True, "schema": spec} for name, spec in
        [("result_kind", {"type": "string", "enum": ["discovery_report", "creation_artifact"]}),
         ("result_id", {"type": "string", "format": "uuid"})]]
    doc_parameters += [{"name": name, "in": "query", "required": True, "schema": spec} for name, spec in
        [("revision", {"type": "integer", "minimum": 1, "maximum": 2147483647}),
         ("sha256", {"type": "string", "pattern": "^[a-f0-9]{64}$"})]]
    paths = {path: {"get": {"parameters": parameters, "security": [{"CustomerSession": []}],
                           "responses": {"200": response}}}, doc_path: {"get": {
        "parameters": doc_parameters, "security": [{"CustomerSession": []}], "responses": {"200": {
            "description": "Exact currently authorized saved result; may be an older explicit revision",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/DocumentEnvelope"}}}}}}}}
    for methods in paths.values():
        for code in (400, 401, 403, 404, 409, 503):
            methods["get"]["responses"][str(code)] = {"description": "Invalid scope/query, current authority, changed reference or unavailable source",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
    return {"openapi": "3.1.0", "info": {"title": "Customer workspace read projection",
        "version": "workspace-read.v1", "description": "Read-only legacy topics, saved jobs and exact result metadata. "
        "No general team membership, invented author, persistence write, provider or execution admission."},
        "paths": paths,
        "components": {"schemas": definitions, "securitySchemes": {
            "CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
