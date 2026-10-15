"""Strict explicit preparation input, reused native team turn/owner receipt."""
import json
from pathlib import Path

from .preparation_wire import VERSION, PreparationEnvelope, PrepareAgent
from .wire import Error


def document():
    definitions = {}
    for model in (PreparationEnvelope, PrepareAgent, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    path = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-preparations"
    operation = {
        "security": [{"CustomerSession": []}],
        "parameters": [{"name": key, "in": "path", "required": True,
            "schema": {"type": "string", "format": "uuid"}} for key in ("portfolio_id", "topic_id")],
        "requestBody": {"required": True, "content": {"application/json": {
            "schema": {"$ref": "#/components/schemas/PrepareAgent"}}}},
        "responses": {str(code): {"description": "Native owner receipt" if code == 200 else "Invalid/denied/conflicting/limited/unavailable",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+
                ("PreparationEnvelope" if code == 200 else "Error")}}}}
            for code in (200, 400, 401, 403, 404, 409, 429, 503)},
    }
    return {"openapi": "3.1.0", "info": {"title": "Explicit canonical agent draft preparation", "version": VERSION,
        "description": "One explicit owner preparation intent on the maintained team Task worker. Native Foundation and current authority required. Saving a description is not calibration, execution or activation."},
        "paths": {path: {"post": operation}}, "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
