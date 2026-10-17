"""Wire-only export; no route, worker, database, native preview or provider startup."""
import json
from pathlib import Path

from .direct_wire import (
    VERSION,
    DirectAcceptedEnvelope,
    DirectCancel,
    DirectChatEnvelope,
    DirectChatsEnvelope,
    DirectCreate,
    DirectError,
    DirectHistoryEnvelope,
    DirectRecipientsEnvelope,
    DirectSend,
    DirectTurnEnvelope,
)


def document():
    models = (DirectCreate, DirectSend, DirectCancel, DirectRecipientsEnvelope, DirectChatsEnvelope,
        DirectChatEnvelope, DirectHistoryEnvelope, DirectAcceptedEnvelope, DirectTurnEnvelope, DirectError)
    definitions = {}
    for model in models:
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        definitions.update(schema.pop("$defs", {}))
        definitions[model.__name__] = schema
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/direct"
    operations = (
        ("/recipients", "get", None, "DirectRecipientsEnvelope", True),
        ("/chats", "get", None, "DirectChatsEnvelope", True),
        ("/chats", "post", "DirectCreate", "DirectChatEnvelope", False),
        ("/chats/{chat_id}", "get", None, "DirectChatEnvelope", False),
        ("/chats/{chat_id}/events", "get", None, "DirectHistoryEnvelope", True),
        ("/chats/{chat_id}/turns", "post", "DirectSend", "DirectAcceptedEnvelope", False),
        ("/chats/{chat_id}/turns/{task_id}/cancel", "post", "DirectCancel", "DirectTurnEnvelope", False),
    )
    paths = {}
    for suffix, method, body, response, paginated in operations:
        keys = ("portfolio_id", "topic_id") + (("chat_id",) if "{chat_id}" in suffix else ()) + (("task_id",) if "{task_id}" in suffix else ())
        params = [{"name": key, "in": "path", "required": True,
            "schema": {"type": "string", "format": "uuid"}} for key in keys]
        if paginated:
            params += [{"name": "limit", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}},
                {"name": "cursor", "in": "query", "schema": {"type": "string", "minLength": 1, "maxLength": 2048}}]
        replies = {str(code): {"description": "Exact owner-bound direct chat" if code == 200 else "Invalid, denied, changed, limited or unavailable",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/" + (response if code == 200 else "DirectError")}}}}
            for code in (200, 400, 401, 403, 404, 409, 429, 503)}
        operation = {"parameters": params, "security": [{"CustomerSession": []}], "responses": replies}
        if body:
            operation["requestBody"] = {"required": True,
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/" + body}}}}
        paths.setdefault(base + suffix, {})[method] = operation
    return {"openapi": "3.1.0", "info": {"title": "Direct workspace messenger", "version": VERSION,
        "description": "Opaque persisted chat and immutable recipient; current owner/anchor/source admission is server-owned. Consultant turns are one tools-disabled call. Native preview is explicit and separately admitted, never module/channel activation. Legacy group and immutable Episode contracts remain unchanged."},
        "paths": paths, "components": {"schemas": definitions,
            "securitySchemes": {"CustomerSession": {"type": "http", "scheme": "bearer"}}}}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
