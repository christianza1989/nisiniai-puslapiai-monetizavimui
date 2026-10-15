"""Explicit scenario on the maintained Task, lab and native Quality worker."""
import json
from pathlib import Path

from .episode_wire import VERSION, EpisodeEnvelope, TestAgent
from .wire import Error


def document():
    definitions = {}
    for model in (EpisodeEnvelope, TestAgent, Error):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    path = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-tests"
    operation = {
        "security": [{"CustomerSession": []}],
        "parameters": [{"name": key, "in": "path", "required": True,
            "schema": {"type": "string", "format": "uuid"}} for key in ("portfolio_id", "topic_id")],
        "requestBody": {"required": True, "content": {"application/json": {
            "schema": {"$ref": "#/components/schemas/TestAgent"}}}},
        "responses": {str(code): {"description": "Native owner receipt" if code == 200 else "Invalid/denied/conflicting/limited/unavailable",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/"+
                ("EpisodeEnvelope" if code == 200 else "Error")}}}}
            for code in (200, 400, 401, 403, 404, 409, 429, 503)},
    }
    return {"openapi": "3.1.0", "info": {"title": "Explicit native agent scenario", "version": VERSION,
        "description": "One explicit owner scenario on the maintained team Task worker and native lab/Quality. Frozen Foundation, agent revision and canonical High profile are required. One scenario is not full calibration, module admission or activation."},
        "paths": {path: {"post": operation}}, "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
