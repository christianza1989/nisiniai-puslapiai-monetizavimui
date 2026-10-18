"""Held paid workers do not remove explicit owner inspection authority."""
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, Request
from test_candidate_preview_preparation import proof
from test_foundation_bridge import scope

from pinet_core.config import settings
from pinet_core.control.routes import ControlError, authenticated
from pinet_core.customer.service import customer_guard
from pinet_core.site_build import continuation, foundation, lifecycle, routes, service, worker

RUNNERS = ("workspace_team_runner_enabled", "customer_text_runner_enabled", "business_discovery_runner_enabled",
    "site_build_api_runner_enabled", "creation_runner_enabled", "chat_runner_enabled")


@pytest.fixture
def inspection(monkeypatch):
    cfg = settings()
    for key, value in {"control_enabled": True, "site_build_enabled": True, "business_discovery_enabled": True,
            "customer_enabled": True, "creation_enabled": True, "control_mode": "local",
            "environment": "test-inspection-guard", "control_source_revision": "a" * 40,
            "control_cursor_secret": "c" * 40}.items():
        monkeypatch.setattr(cfg, key, value)
    for key in RUNNERS:
        monkeypatch.setattr(cfg, key, False)
    return cfg


def test_feature_guard_allows_owner_inspection_with_all_runners_held(inspection):
    service.enabled()
    assert all(getattr(inspection, key) is False for key in RUNNERS)


@pytest.mark.parametrize("key,value", [("site_build_enabled", False), ("business_discovery_enabled", False),
    ("customer_enabled", False), ("creation_enabled", False), ("control_mode", "remote"), ("environment", "production")])
def test_feature_guards_stay_required_for_inspection(inspection, monkeypatch, key, value):
    monkeypatch.setattr(inspection, key, value)
    with pytest.raises(ControlError, match="site_build_unavailable"):
        service.enabled()
    with pytest.raises(ControlError, match="site_build_unavailable"):
        service.generation_enabled()


async def test_held_generation_never_reaches_sql_source_or_provider(inspection, monkeypatch):
    def prohibited(*args, **kwargs):
        pytest.fail("Held generation must stop before source/SQL/provider access")
    monkeypatch.setattr(service, "source_current", prohibited)
    monkeypatch.setattr(service, "scope", prohibited)
    monkeypatch.setattr(worker.creations, "execute_once", prohibited)
    monkeypatch.setattr(worker.guides, "execute_once", prohibited)
    for action in (service.advance, worker.tick):
        with pytest.raises(ControlError, match="site_build_unavailable"):
            await action(str(uuid4()))


@pytest.mark.parametrize("key", ["creation_runner_enabled", "site_build_api_runner_enabled", "business_discovery_runner_enabled", "control_enabled"])
def test_lifecycle_keeps_each_existing_worker_gate(inspection, monkeypatch, key):
    for field in ("creation_runner_enabled", "site_build_api_runner_enabled", "business_discovery_runner_enabled", "control_enabled"):
        monkeypatch.setattr(inspection, field, True)
    monkeypatch.setattr(inspection, "site_build_actor_ids", [str(uuid4())])
    assert len(lifecycle.actors()) == 1
    monkeypatch.setattr(inspection, key, False)
    with pytest.raises((ControlError, RuntimeError)):
        lifecycle.actors()


async def test_foundation_inspection_still_requires_current_source(inspection, monkeypatch):
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    await foundation.guard()
    monkeypatch.setattr(foundation, "source_current", lambda: False)
    with pytest.raises(ControlError, match="source_unavailable"):
        await foundation.guard()


async def test_preview_preparation_uses_real_feature_guard_with_held_runners(inspection, monkeypatch):
    pin, calls = scope(), []
    monkeypatch.setattr(inspection, "environment", pin.environment_id)
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    monkeypatch.setattr(foundation, "source_pins", lambda: pin.sources)
    monkeypatch.setattr(foundation.language_mode, "mode", lambda: pin.language_review_mode)
    monkeypatch.setattr(foundation.studio, "configuration", lambda: (Path("inert-node"), None, Path("/runtime/artifacts"), {}))
    async def authorized():
        return True  # explicit unit seam; actual owner/SQL/native checks stay in PG cases
    async def execute(args, payload, environment, callback, seconds):
        assert all(getattr(inspection, key) is False for key in RUNNERS)
        assert args[1] == foundation.SCRIPT and payload["command"] == "prepare-preview"
        assert payload["scope"] == pin.model_dump(mode="json") and await callback()
        calls.append(payload)
        return proof(pin)
    monkeypatch.setattr(foundation.studio, "_execute", execute)
    prepared = await foundation.prepare_preview(pin, still_authorized=authorized)
    assert len(calls) == 1 and prepared.full_site_status == prepared.launch_status == "UNVERIFIED"
    assert prepared.server == "not_started"


async def test_actual_router_uses_feature_guard_for_s6_and_foundation(inspection, monkeypatch):
    cid, called = str(uuid4()), []
    app = FastAPI()
    app.include_router(routes.router)
    async def authenticated_fixture():
        yield object(), SimpleNamespace(id=str(uuid4()))
    app.dependency_overrides[authenticated] = authenticated_fixture
    app.dependency_overrides[customer_guard] = lambda: None
    async def owned(*args, **kwargs):
        return SimpleNamespace(id=cid)
    async def state(*args, **kwargs):
        called.append("read-s6")
        return {"creation_id": cid, "latest": None}
    async def resume(*args, **kwargs):
        called.append("resume")
        return {"creation_id": cid, "fixture_only": True}
    async def view(*args, **kwargs):
        called.append("foundation")
        return {"creation_id": cid, "fixture_only": True}
    monkeypatch.setattr(routes, "owned", owned)
    monkeypatch.setattr(continuation, "state", state)
    monkeypatch.setattr(continuation, "resume", resume)
    monkeypatch.setattr(routes.receipts, "view", view)
    @app.middleware("http")
    async def identity(request: Request, call_next):
        request.state.control_request_id = str(uuid4())
        return await call_next(request)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 1234)), base_url="http://127.0.0.1") as client:
        base = "/customer/v2/creations/" + cid
        assert (await client.get(base + "/build-continuations")).status_code == 200
        assert (await client.post(base + "/build-continuations", json={"accepted_revision": 1, "idempotency_key": str(uuid4())})).status_code == 200
        assert (await client.get(base + "/foundation")).status_code == 200
    assert called == ["read-s6", "resume", "foundation"]
    assert all(getattr(inspection, key) is False for key in RUNNERS)
