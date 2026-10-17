"""Actual in-process SafeRoute refusals, no sockets, DB, auth or provider."""
from uuid import uuid4

import httpx
import pytest
from fastapi import APIRouter, FastAPI
from pydantic import ValidationError

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation.routes import CreationRoute
from pinet_core.workspace_team.wire import Error


@pytest.mark.parametrize(("status", "code"), [
    (400, "invalid_request"), (401, "unauthenticated"), (403, "authorization_revoked"),
    (404, "not_found"), (409, "website_foundation_not_ready"), (429, "task_rate_limited"),
    (503, "source_unavailable")])
@pytest.mark.asyncio
async def test_actual_safe_route_error_body_matches_canonical_workspace_dto(monkeypatch, status, code):
    cfg = settings()
    for key, value in {"control_enabled": True, "control_mode": "local", "environment": "test-error-envelope",
            "control_cursor_secret": "synthetic-offline-cursor-secret-0000", "control_source_revision": "a"*40,
            "control_session_seconds": 3600}.items():
        monkeypatch.setattr(cfg, key, value)
    app, router = FastAPI(), APIRouter(route_class=CreationRoute)
    @router.get("/refuse")
    async def refuse():
        raise ControlError(status, code)
    app.include_router(router)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 12345)),
            base_url="http://127.0.0.1") as client:
        response = await client.get("/refuse")
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"code", "message", "request_id"} and body["message"] == body["code"] == code
    assert response.headers["cache-control"] == "private, no-store"
    parsed = Error.model_validate(body)
    assert parsed.model_dump(mode="json") == body


def test_legacy_two_key_errors_keep_identical_serialized_bytes():
    body = {"code": "source_unavailable", "request_id": str(uuid4())}
    assert Error.model_validate(body).model_dump(mode="json") == body


@pytest.mark.parametrize("message", ["Different server prose", None, {}, [], 123, "x"*81])
def test_message_is_only_the_same_bounded_public_code_without_extra_prose(message):
    with pytest.raises(ValidationError):
        Error.model_validate({"code": "source_unavailable", "request_id": str(uuid4()), "message": message})


def test_unknown_error_fields_still_fail_closed():
    with pytest.raises(ValidationError):
        Error.model_validate({"code": "source_unavailable", "request_id": str(uuid4()),
            "message": "source_unavailable", "trace": "private"})
