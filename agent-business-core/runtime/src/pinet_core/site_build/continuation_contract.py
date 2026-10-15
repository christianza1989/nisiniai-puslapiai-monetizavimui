"""Canonical owner-facing continuation contract, no source/path override fields."""
import json
from pathlib import Path

from ..workspace_team.wire import Error
from .continuation_wire import VERSION, ContinuationEnvelope, Resume, StateEnvelope


def document():
    schemas = {}
    for model in (Resume, ContinuationEnvelope, StateEnvelope, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    operations = {}
    for method, result in (("get", "StateEnvelope"), ("post", "ContinuationEnvelope")):
        operation = {"security": [{"CustomerSession": []}], "parameters": [{"name": "creation_id", "in": "path",
            "required": True, "schema": {"type": "string", "format": "uuid"}}], "responses": {
            str(code): {"description": "Exact current-owner continuation" if code == 200 else "Denied, stale or unavailable",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+
                    (result if code == 200 else "Error")}}}} for code in (200, 400, 401, 403, 404, 409, 503)}}
        if method == "post":
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/Resume"}}}}
        operations[method] = operation
    return {"openapi": "3.1.0", "info": {"title": "Explicit native build continuation", "version": VERSION,
        "description": "Immutable current-owner/source continuation of unchanged accepted material. Uses maintained builder/quota/writer; no historical rewrite, Foundation certification, calibration or live channel activation."},
        "paths": {"/customer/v2/creations/{creation_id}/build-continuations": operations},
        "components": {"schemas": schemas, "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
