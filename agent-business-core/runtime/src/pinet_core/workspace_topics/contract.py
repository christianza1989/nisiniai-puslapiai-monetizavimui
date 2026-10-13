"""One maintained strict topics contract, generated without app/worker imports."""
import json
from pathlib import Path

from .wire import AppendMessage, Create, Envelope, Error, SetMetadata


def document():
    definitions = {}
    for model in (Envelope, Create, SetMetadata, AppendMessage, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics"
    portfolio = {"name": "portfolio_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
    topic = {"name": "topic_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
    paging = [{"name": "limit", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}},
              {"name": "cursor", "in": "query", "schema": {"type": "string", "minLength": 1, "maxLength": 2048}}]
    paths = {}
    for path, methods in ((base, {"get": None, "post": "Create"}),
                          (base+"/{topic_id}", {"get": None}),
                          (base+"/{topic_id}/controls", {"post": "SetMetadata"}),
                          (base+"/{topic_id}/messages", {"get": None, "post": "AppendMessage"})):
        paths[path] = {}
        for method, body in methods.items():
            params = [portfolio] + ([topic] if "{topic_id}" in path else [])
            if method == "get" and (path == base or path.endswith("/messages")):
                params += paging
            if method == "get" and path == base:
                params += [{"name": name, "in": "query", "schema": spec} for name, spec in [
                    ("kind", {"type": "string", "enum": ["portfolio", "discovery", "creation", "business"]}),
                    ("selection_id", {"type": "string", "format": "uuid"}),
                    ("state", {"type": "string", "enum": ["active", "archived"], "default": "active"}),
                    ("q", {"type": "string", "maxLength": 100, "default": ""})]]
            responses = {"200": {"description": "Currently authorized persisted private data; no dispatch",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Envelope"}}}}}
            for status in (400, 401, 403, 404, 409, 503):
                responses[str(status)] = {"description": "Invalid/current-denied/conflicting/unavailable; never empty success",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
            operation = {"parameters": params, "security": [{"CustomerSession": []}], "responses": responses}
            if body:
                operation["requestBody"] = {"required": True, "content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/" + body}}}}
            paths[path][method] = operation
    return {"openapi": "3.1.0", "info": {"title": "Private customer workspace topics",
        "version": "workspace-topics.v1", "description": "Immutable anchored topics, metadata receipts and owner text stored without dispatch. "
        "No fake Case, participant, agent runtime or provider permission."}, "paths": paths,
        "components": {"schemas": definitions, "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
