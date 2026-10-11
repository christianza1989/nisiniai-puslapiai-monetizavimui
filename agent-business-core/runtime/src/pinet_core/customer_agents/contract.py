"""Canonical draft configuration contract derives from maintained routes and strict DTOs."""
from fastapi import FastAPI

from .routes import router


def document():
    app = FastAPI(title="Owned customer agent task drafts", version="0.1.0")
    app.include_router(router)
    value = app.openapi()
    value["info"]["description"] = (
        "Local-only current verified customer owner/grant and exact registered business. Data-only purpose/task "
        "configuration, immutable versions, UUID idempotency, optimistic conflict and bounded signed history. "
        "Additive read-only test evidence reports retained exact Config/Profile/source and known usage, "
        "never private transcripts or prompts; a historical judgment is not current calibration. "
        "A saved specification is not runtime/module admission. Calibration remains UNVERIFIED; all provider, "
        "calibration and channel activation capabilities are false. No model, tools, connector, mail or live channel.")
    operations = {
        ("get", "/customer/v2/creations/{creation_id}/agents"): "listCustomerAgentDrafts",
        ("post", "/customer/v2/creations/{creation_id}/agents"): "createCustomerAgentDraft",
        ("get", "/customer/v2/creations/{creation_id}/agents/{agent_id}"): "getCustomerAgentDraft",
        ("post", "/customer/v2/creations/{creation_id}/agents/{agent_id}/revisions"): "reviseCustomerAgentDraft",
        ("get", "/customer/v2/creations/{creation_id}/agents/{agent_id}/revisions"): "listCustomerAgentDraftRevisions",
        ("get", "/customer/v2/creations/{creation_id}/agents/{agent_id}/revisions/{revision}"): "getCustomerAgentDraftRevision",
        ("get", "/customer/v2/creations/{creation_id}/agents/{agent_id}/test-runs"): "listCustomerAgentTestEvidence",
        ("get", "/customer/v2/creations/{creation_id}/agents/{agent_id}/score-evidence"): "listCustomerAgentScoreEvidence",
    }
    for path, methods in value["paths"].items():
        for method, operation in methods.items():
            operation["operationId"] = operations[(method, path)]
            operation["security"] = [{"CoreSession": []}]
            operation["responses"].pop("422", None)
            for parameter in operation.get("parameters", []):
                if parameter["in"] == "path" and parameter["name"] != "revision":
                    parameter["schema"]["format"] = "uuid"
    value["components"]["securitySchemes"] = {"CoreSession": {"type": "http", "scheme": "bearer"}}
    for name in ("HTTPValidationError", "ValidationError"):
        value["components"]["schemas"].pop(name, None)
    return value
