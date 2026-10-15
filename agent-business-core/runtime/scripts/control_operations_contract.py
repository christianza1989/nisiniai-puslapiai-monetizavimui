"""Canonical operations.v1 dashboard contract; deterministic and database independent."""
import json
from pathlib import Path

from control_chat_contract import build as chat_contract
from control_chat_contract import nullable, obj, ref


def build():
    string = {"type": "string"}
    uid = {"type": "string", "format": "uuid"}
    timestamp = {"type": "string", "format": "date-time"}
    states = ["queued", "running", "succeeded", "failed", "cancelled"]
    chat = chat_contract()["components"]["schemas"]
    schemas = {key: chat[key] for key in ("Task", "Answer", "Error")}
    schemas.update({
        "Agent": obj({"agent_id": {"const": "business-planner"}, "display_name": string,
            "kind": {"const": "chat.consult"}, "description": string,
            "availability": {"enum": ["available", "unavailable"]},
            "unavailable_reason": nullable({"enum": ["chat_unavailable", "operator_required",
                                                      "runner_unavailable", "runner_not_configured"]}),
            "model": string, "effort": {"const": "medium"}, "tools": {"type": "array", "maxItems": 0},
            "system_writes": {"const": False}, "worker_health": {"const": "unknown"},
            "daily_task_limit": {"type": "integer"}}),
        "Agents": obj({"business_id": uid, "items": {"type": "array", "maxItems": 1, "items": ref("Agent")}}),
        "TaskInput": obj({"agent_id": {"const": "business-planner"},
            "message": {"type": "string", "minLength": 1, "maxLength": 1000}, "idempotency_key": uid}),
        "Accepted": obj({"business_id": uid, "agent_id": {"const": "business-planner"},
                         "thread_id": uid, "task": ref("Task")}),
        "History": obj({"business_id": uid, "items": {"type": "array", "maxItems": 50, "items": ref("Task")},
            "next_cursor": nullable(string), "snapshot_id": string}),
        "Overview": obj({"business_id": uid, "task_counts": obj({s: {"type": "integer", "minimum": 0}
                                                                for s in states}),
                         "last_task_at": nullable(timestamp), "agent": ref("Agent")}),
        "Execution": obj({"run_id": uid, "status": {"enum": ["running", "succeeded", "failed", "cancelled"]},
            "model": string, "effort": string, "adapter_revision": string, "started_at": timestamp,
            "finished_at": nullable(timestamp),
            "usage": nullable({"type": "object", "additionalProperties": {"type": "integer", "minimum": 0},
                               "propertyNames": {"pattern": "_tokens$"}}),
            "cost_microusd": nullable({"type": "integer", "minimum": 0})}),
        "Report": obj({"agent_id": {"const": "business-planner"}, "task": ref("Task"),
                       "execution": nullable(ref("Execution")), "source_revision": string}),
    })
    paths = {}
    for method, path, operation, data, code in [
        ("get", "/businesses/{business_id}/agents", "listBusinessAgents", "Agents", 200),
        ("post", "/businesses/{business_id}/tasks", "startBusinessTask", "Accepted", 202),
        ("get", "/businesses/{business_id}/tasks", "listBusinessTasks", "History", 200),
        ("get", "/businesses/{business_id}/overview", "getBusinessOverview", "Overview", 200),
        ("get", "/tasks/{task_id}/report", "getTaskReport", "Report", 200),
    ]:
        envelope = data + "Envelope"
        schemas[envelope] = obj({"contract_version": {"const": "operations.v1"},
            "environment": {"enum": ["local", "test", "production"]}, "source_revision": string,
            "observed_at": timestamp, "request_id": uid, "data": ref(data)})
        params = [{"in": "path", "name": p[1:-1], "required": True, "schema": uid}
                  for p in path.split("/") if p.startswith("{")]
        if data == "History":
            params += [{"in": "query", "name": "limit", "schema": {"type": "integer", "minimum": 1,
                                                                    "maximum": 50, "default": 20}},
                       {"in": "query", "name": "cursor", "schema": {"type": "string", "maxLength": 2048}},
                       {"in": "query", "name": "status", "schema": {"enum": states}}]
        entry = {"operationId": operation, "security": [{"OperatorSession": []}], "parameters": params,
            "responses": {str(code): {"description": "Current authorized persisted projection",
                "content": {"application/json": {"schema": ref(envelope)}}},
                **{str(c): {"description": reason, "content": {"application/json": {"schema": ref("Error")}}}
                   for c, reason in [(400, "Invalid request"), (401, "No current session"),
                       (403, "Control or executor disabled"), (404, "No scoped object"),
                       (409, "Cursor snapshot or idempotency conflict"), (429, "Daily task limit"),
                       (503, "Source unavailable")]}}}
        if method == "post":
            entry["requestBody"] = {"required": True,
                                   "content": {"application/json": {"schema": ref("TaskInput")}}}
        paths.setdefault("/operator/v2" + path, {})[method] = entry
    return {"openapi": "3.1.0", "info": {"title": "Verslomatika owner dashboard operations", "version": "0.1.0",
        "description": "operations.v1. Existing session/grant/RLS and task executor. Availability describes "
            "configuration, worker health remains unknown. No invented agents or business metrics. "
            "History cursors bind actor/session/business/filter/environment/source and the visible creation set; "
            "insertions or filtered membership changes require reload (409). Hosted mode is preparation only."},
        "paths": paths, "components": {"securitySchemes": {"OperatorSession": {"type": "http", "scheme": "bearer"}},
                                     "schemas": schemas}}


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-operations.openapi.json"
    target.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Generated operations.v1 canonical five-operation OpenAPI")
