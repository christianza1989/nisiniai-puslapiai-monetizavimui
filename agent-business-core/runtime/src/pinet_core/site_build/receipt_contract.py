"""Generate strict Foundation observations separately from execution permission."""
import json
from pathlib import Path

from ..workspace_team.wire import Error
from .receipt_wire import VERSION, Check, Envelope, ReceiptEnvelope


def document():
    definitions = {}
    for model in (Check, Envelope, ReceiptEnvelope, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    paths = {}
    for suffix, method, result in (("", "get", "Envelope"), ("/checks", "post", "ReceiptEnvelope")):
        operation = {"security": [{"CustomerSession": []}], "parameters": [{"name": "creation_id", "in": "path",
            "required": True, "schema": {"type": "string", "format": "uuid"}}], "responses": {
            str(code): {"description": "Current owner observation" if code == 200 else "Invalid, denied, conflicting or unavailable",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+
                    (result if code == 200 else "Error")}}}} for code in (200, 400, 401, 403, 404, 409, 503)}}
        if method == "post":
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/Check"}}}}
        paths["/customer/v2/creations/{creation_id}/foundation"+suffix] = {method: operation}
    return {"openapi": "3.1.0", "info": {"title": "Native local website Foundation observations", "version": VERSION,
        "description": "Fixed canonical candidate/local verifier observations with immutable owner-bound receipts. Current accepted revision/source/evidence required for the private agent-draft precondition; no calibration, live channel, deployment or general runtime permission."},
        "paths": paths, "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
