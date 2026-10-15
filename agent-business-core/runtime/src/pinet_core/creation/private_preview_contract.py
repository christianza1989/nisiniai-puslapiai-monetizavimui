"""Canonical local-only explicit private native intake contract."""
import json
from pathlib import Path

from ..workspace_team.wire import Error
from .private_preview_wire import VERSION, PreparePrivateIntake, PrivateIntakeEnvelope


def document():
    definitions = {}
    for model in (PreparePrivateIntake, PrivateIntakeEnvelope, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    operations = {}
    for method in ("get", "post"):
        operation = {"security": [{"CustomerSession": []}], "parameters": [{"name": "creation_id", "in": "path",
            "required": True, "schema": {"type": "string", "format": "uuid"}}], "responses": {
            str(code): {"description": "Current owner observation, including retained failure" if code == 200 else
                "Invalid, denied, conflicting or unavailable", "content": {"application/json": {"schema": {
                    "$ref": "#/components/schemas/" + ("PrivateIntakeEnvelope" if code == 200 else "Error")}}}}
            for code in (200, 400, 401, 403, 404, 409, 503)}}
        if method == "post":
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/PreparePrivateIntake"}}}}
        operations[method] = operation
    return {"openapi": "3.1.0", "info": {"title": "Explicit private preview intake", "version": VERSION,
        "description": "Local authenticated owner binding and accepted-revision native import recovery. Public canonical host remains unknown. No provider, approval, public domain, launch, deployment or channel activation authority."},
        "paths": {"/customer/v2/creations/{creation_id}/private-preview-intake": operations},
        "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
