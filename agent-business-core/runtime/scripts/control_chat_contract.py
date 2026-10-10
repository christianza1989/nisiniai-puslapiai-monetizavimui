"""Canonical standalone chat.v1 wire contract; deterministic, no database access."""
import json
from pathlib import Path


def obj(properties, required=None):
    return {"type": "object", "additionalProperties": False, "properties": properties,
            "required": list(properties) if required is None else required}


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def nullable(schema):
    return {"anyOf": [schema, {"type": "null"}]}


def build():
    string = {"type": "string"}
    uid = {"type": "string", "format": "uuid"}
    timestamp = {"type": "string", "format": "date-time"}
    status = {"type": "string", "enum": ["queued", "running", "succeeded", "failed", "cancelled"]}
    failure = {"type": "string", "enum": ["runner_unavailable", "model_unavailable", "provider_error",
               "output_invalid", "run_timeout", "authorization_revoked", "worker_interrupted", "tool_attempted"]}
    schemas = {
        "MessageInput": obj({"message": {"type": "string", "minLength": 1, "maxLength": 1000},
                             "idempotency_key": uid}),
        "Answer": obj({"answer": {"type": "string", "minLength": 1, "maxLength": 8000},
                       "limitations": {"type": "array", "maxItems": 5,
                                       "items": {"type": "string", "maxLength": 300}}}),
        "Task": obj({"task_id": uid, "thread_id": uid, "business_id": uid, "sequence": {"type": "integer", "minimum": 1},
                     "kind": {"const": "chat.consult"}, "status": status, "message": string,
                     "created_at": timestamp, "updated_at": timestamp,
                     "result": nullable(ref("Answer")), "failure_code": nullable(failure)}),
        "Accepted": obj({"thread_id": uid, "business_id": uid, "task": ref("Task")}),
        "Thread": obj({"thread_id": uid, "business_id": uid, "created_at": timestamp,
                       "tasks": {"type": "array", "maxItems": 20, "items": ref("Task")}}),
        "Event": obj({"sequence": {"type": "integer", "minimum": 1}, "task_id": uid,
                      "status": status, "created_at": timestamp, "failure_code": nullable(failure)}),
        "Events": obj({"task_id": uid, "items": {"type": "array", "maxItems": 50, "items": ref("Event")},
                       "next_sequence": {"type": "integer", "minimum": 0}}),
        "Error": obj({"code": string, "message": string, "request_id": uid}),
    }
    paths = {}
    actions = [
        ("post", "/businesses/{business_id}/chat/threads", "startChat", "Accepted", 202),
        ("post", "/chat/threads/{thread_id}/messages", "sendChatMessage", "Accepted", 202),
        ("get", "/chat/threads/{thread_id}", "readChat", "Thread", 200),
        ("get", "/tasks/{task_id}", "readTask", "Task", 200),
        ("get", "/tasks/{task_id}/events", "readTaskEvents", "Events", 200),
        ("post", "/tasks/{task_id}/cancel", "cancelTask", "Task", 200),
    ]
    for method, path, operation, response, code in actions:
        envelope = response + "Envelope"
        schemas[envelope] = obj({"contract_version": {"const": "chat.v1"},
                                "environment": {"enum": ["local", "test", "production"]}, "source_revision": string,
                                "observed_at": timestamp, "request_id": uid, "data": ref(response)})
        params = [{"in": "path", "name": part[1:-1], "required": True, "schema": uid}
                  for part in path.split("/") if part.startswith("{")]
        if response == "Events":
            params.append({"in": "query", "name": "after_sequence", "required": False,
                           "schema": {"type": "integer", "minimum": 0, "default": 0}})
        entry = {"operationId": operation, "security": [{"OperatorSession": []}], "parameters": params,
                 "responses": {str(code): {"description": "Committed durable state",
                   "content": {"application/json": {"schema": ref(envelope)}}},
                   **{str(c): {"description": reason, "content": {"application/json": {"schema": ref("Error")}}}
                      for c, reason in [(400, "Invalid request"), (401, "No current session"),
                                        (403, "Local operator disabled"), (404, "No scoped object"),
                                        (409, "Idempotency conflict or thread busy/full"),
                                        (429, "Daily admission limit"), (503, "Source unavailable")]}}}
        if response == "Accepted":
            entry["requestBody"] = {"required": True, "content": {"application/json": {"schema": ref("MessageInput")}}}
        paths["/operator/v2" + path] = {method: entry}
    return {"openapi": "3.1.0", "info": {"title": "Verslomatika operator business chat", "version": "0.2.0",
             "description": "chat.v1. Operator-only; hosted bridge preparation is separate from actual deployment. Maximum request body4096bytes, 20turns/thread. "
                            "No customer CLI, arbitrary workspace/tools or HTML. Unknown costs stay unknown."},
            "paths": paths, "components": {"securitySchemes": {"OperatorSession": {"type": "http", "scheme": "bearer"}},
                                             "schemas": schemas}}


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-chat.openapi.json"
    target.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Generated chat.v1 canonical six-operation OpenAPI")
