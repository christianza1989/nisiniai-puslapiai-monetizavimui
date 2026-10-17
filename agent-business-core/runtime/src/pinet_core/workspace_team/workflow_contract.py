"""Canonical additive owner workflow API; generation never starts workers."""
import json
from pathlib import Path

from .wire import Cancel, Error
from .workflow_wire import VERSION, PrepareAndTest, WorkflowEnvelope


def document():
    definitions = {}
    for model in (WorkflowEnvelope, PrepareAndTest, Cancel, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-workflows"
    paths = {}
    for suffix, method, body in (("", "post", "PrepareAndTest"),
            ("/{workflow_id}", "get", None), ("/{workflow_id}/cancel", "post", "Cancel")):
        operation = {"security": [{"CustomerSession": []}],
            "parameters": [{"name": key, "in": "path", "required": True,
                "schema": {"type": "string", "format": "uuid"}}
                for key in ("portfolio_id", "topic_id") + (("workflow_id",) if suffix else ())],
            "responses": {str(code): {"description": "Scoped workflow observation" if code == 200
                else "Invalid/denied/conflicting/limited/unavailable",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/" +
                    ("WorkflowEnvelope" if code == 200 else "Error")}}}}
                for code in (200, 400, 401, 403, 404, 409, 429, 503)}}
        if body:
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/" + body}}}}
        paths[base + suffix] = {method: operation}
    return {"openapi": "3.1.0", "info": {"title": "Explicit native agent preparation and test",
        "version": VERSION, "description": "One owner intent durably joins a canonical draft to one saved-example native lab/Quality scenario on the same Tasks worker. GET is read-only. One scenario is not protected calibration, admission or activation."},
        "paths": paths, "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
