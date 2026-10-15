"""Canonical portable contract derived from the actual maintained route/DTO definitions."""
from fastapi import FastAPI

from .routes import router


def document():
    app = FastAPI(title="Owned local customer text", version="0.1.0")
    app.include_router(router)
    value = app.openapi()
    value["info"]["description"] = (
        "Local authenticated testing only. Current Registration/Profile/V2 receipt/TTL, actor grants, "
        "source and policy are checked before/after default fixed Luna execution. Retained Session-task High "
        "history can identify its frozen Sol model; public requests cannot select a model or profile. Explicit consent starts a session; "
        "each durable UUID turn is dispatched once, with no tools except server knowledge.resolve and typed "
        "need.patch. Revocation denies late output and preserves observed token usage. Read does not renew TTL. "
        "Need values remain proposed, with actual client-event provenance. No live channel, contact, email, "
        "voice, acquisition, postcall, learning or deployment activation; calibration remains UNVERIFIED.")
    operations = {
        ("get", "/customer/v2/creations/{creation_id}/text-capability"): "getCustomerTextCapability",
        ("post", "/customer/v2/creations/{creation_id}/text-sessions"): "startCustomerText",
        ("get", "/customer/v2/creations/{creation_id}/text-sessions"): "listCustomerTextSessions",
        ("get", "/customer/v2/creations/{creation_id}/text-sessions/{conversation_id}/events"): "listCustomerTextEvents",
        ("get", "/customer/v2/creations/{creation_id}/text-sessions/{conversation_id}"): "getCustomerText",
        ("post", "/customer/v2/creations/{creation_id}/text-sessions/{conversation_id}/turns"): "postCustomerTextTurn",
        ("post", "/customer/v2/creations/{creation_id}/text-sessions/{conversation_id}/end"): "endCustomerText",
    }
    for path, methods in value["paths"].items():
        for method, operation in methods.items():
            operation["operationId"] = operations[(method, path)]
            operation["security"] = [{"CoreSession": []}]
            operation["responses"].pop("422", None)
            for parameter in operation.get("parameters", []):
                if parameter["in"] == "path":
                    parameter["schema"]["format"] = "uuid"
    value["components"]["securitySchemes"] = {"CoreSession": {"type": "http", "scheme": "bearer"}}
    for name in ("HTTPValidationError", "ValidationError"):
        value["components"]["schemas"].pop(name, None)
    return value
