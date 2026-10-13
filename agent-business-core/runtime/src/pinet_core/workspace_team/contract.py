"""One strict canonical contract, exported without API/worker initialization."""
import json
from pathlib import Path

from .wire import Cancel, Envelope, Error, Send


def document():
    definitions = {}
    for model in (Envelope, Send, Cancel, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team"
    paths = {}
    for suffix, method, body in (("/roster", "get", None), ("/events", "get", None),
                                ("/turns", "post", "Send"), ("/turns/{task_id}/cancel", "post", "Cancel")):
        params = [{"name": key, "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
            for key in ("portfolio_id", "topic_id")+( ("task_id",) if "{task_id}" in suffix else ())]
        if suffix == "/events":
            params += [{"name": "limit", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}},
                {"name": "cursor", "in": "query", "schema": {"type": "string", "minLength": 1, "maxLength": 2048}}]
        responses = {str(code): {"description": "Current scoped team data" if code == 200 else "Invalid/denied/conflicting/limited/unavailable",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+("Envelope" if code == 200 else "Error")}}}}
            for code in (200, 400, 401, 403, 404, 409, 429, 503)}
        operation = {"parameters": params, "security": [{"CustomerSession": []}], "responses": responses}
        if body:
            operation["requestBody"] = {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+body}}}}
        paths[base+suffix] = {method: operation}
    return {"openapi": "3.1.0", "info": {"title": "Scoped business workspace team", "version": "workspace-team.v1",
        "description": "Explicit admitted coordinator/adviser text turns on the maintained task worker. Phase observations are not final root acceptance. Old S1 notes never dispatch automatically."},
        "paths": paths, "components": {"schemas": definitions, "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
