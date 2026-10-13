"""Dependency commit failures must finish the HTTP contract before response headers."""
import httpx
import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError

from pinet_core.control.routes import ControlError, SafeRoute


@pytest.mark.parametrize("error,status,code", [(SQLAlchemyError("Private database diagnostics"), 503, "source_unavailable"),
                                               (ControlError(401, "unauthenticated"), 401, "unauthenticated")])
async def test_function_dependency_failure_is_sanitized_before_headers(monkeypatch, error, status, code):
    from pinet_core.control import bridge
    async def guard(request):
        pass
    monkeypatch.setattr(bridge, "transport_guard", guard)
    app = FastAPI()
    router = APIRouter(route_class=SafeRoute)
    async def transaction():
        yield None
        raise error
    @router.get("/test")
    async def action(context=Depends(transaction, scope="function")):
        return {"accepted": True}
    app.include_router(router)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://127.0.0.1") as client:
        response = await client.get("/test")
    assert response.status_code == status
    assert response.json()["code"] == code and response.json()["request_id"]
    assert "Private database" not in response.text and "accepted" not in response.text
    assert response.headers["Cache-Control"] == "private, no-store"
    if status == 401:
        assert response.headers["WWW-Authenticate"] == "Bearer"


async def test_started_stream_is_not_replaced_with_a_second_response(monkeypatch):
    from pinet_core.control import bridge
    async def guard(request):
        pass
    monkeypatch.setattr(bridge, "transport_guard", guard)
    app = FastAPI()
    router = APIRouter(route_class=SafeRoute)
    async def stream():
        yield b"started"
        raise SQLAlchemyError("Stream failure")
    @router.get("/stream")
    async def action():
        return StreamingResponse(stream())
    app.include_router(router)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://127.0.0.1") as client:
        with pytest.raises(SQLAlchemyError, match="Stream failure"):
            await client.get("/stream")
