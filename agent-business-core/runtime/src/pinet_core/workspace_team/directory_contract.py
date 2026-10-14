"""Independent additive directory wire; S2 speaking roster is unchanged."""
import json
from pathlib import Path

from .directory_wire import DirectoryEnvelope
from .wire import Error


def document():
    definitions = {}
    for model in (DirectoryEnvelope, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    path = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/directory"
    params = [{"name": key, "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
        for key in ("portfolio_id", "topic_id")]
    params += [{"name": "limit", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}},
        {"name": "cursor", "in": "query", "schema": {"type": "string", "minLength": 1, "maxLength": 2048}}]
    responses = {str(code): {"description": "Scoped saved-agent directory" if code == 200 else "Invalid/denied/changed/unavailable",
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+("DirectoryEnvelope" if code == 200 else "Error")}}}}
        for code in (200, 400, 401, 403, 404, 409, 503)}
    return {"openapi": "3.1.0", "info": {"title": "Workspace saved-agent directory", "version": "workspace-directory.v1",
        "description": "Existing canonical draft metadata, never speaking/execution/calibration admission."},
        "paths": {path: {"get": {"parameters": params, "security": [{"CustomerSession": []}], "responses": responses}}},
        "components": {"schemas": definitions, "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
