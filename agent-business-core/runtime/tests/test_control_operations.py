"""Dashboard paths against actual PostgreSQL/RLS; synthetic execution only."""
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from test_control_portfolio import login
from test_control_tasks import chat as task_chat
from test_control_tasks import pilot as task_pilot
from test_control_tasks import safe_adapter

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.db import db
from pinet_core.tasks import worker

chat = task_chat
pilot = task_pilot


async def launch(chat, key=None, message="Sintetinė dashboardo užduotis."):
    return await chat["client"].post(f"/operator/v2/businesses/{chat['business']}/tasks", headers=chat["headers"],
        json={"agent_id": "business-planner", "message": message, "idempotency_key": key or str(uuid4())})


async def test_catalogue_availability_and_empty_actual_overview(chat, monkeypatch):
    path = f"/operator/v2/businesses/{chat['business']}"
    result = await chat["client"].get(path + "/agents", headers=chat["headers"])
    assert result.status_code == 200
    agent = result.json()["data"]["items"][0]
    assert agent["agent_id"] == "business-planner" and agent["worker_health"] == "unknown"
    assert agent["tools"] == [] and not agent["system_writes"]
    monkeypatch.setattr(settings(), "chat_runner_enabled", False)
    result = await chat["client"].get(path + "/agents", headers=chat["headers"])
    assert result.json()["data"]["items"][0]["unavailable_reason"] == "runner_unavailable"
    assert (await launch(chat)).status_code == 403
    overview = (await chat["client"].get(path + "/overview", headers=chat["headers"])).json()["data"]
    assert all(v == 0 for v in overview["task_counts"].values()) and overview["last_task_at"] is None


async def test_launch_replay_and_report_persist_after_pool_restart(chat):
    key = str(uuid4())
    accepted = await launch(chat, key)
    assert accepted.status_code == 202
    task = accepted.json()["data"]["task"]
    assert (await launch(chat, key)).json()["data"]["task"]["task_id"] == task["task_id"]
    assert (await launch(chat, key, "Pakeistas tekstas")).status_code == 409
    path = f"/operator/v2/tasks/{task['task_id']}/report"
    assert (await chat["client"].get(path, headers=chat["headers"])).json()["data"]["execution"] is None
    assert await worker.execute_once(safe_adapter)
    await db.engine.dispose()
    result = await chat["client"].get(path, headers=chat["headers"])
    assert result.status_code == 200 and result.headers["cache-control"] == "private, no-store"
    report = result.json()["data"]
    assert report["task"]["status"] == "succeeded"
    assert report["execution"]["usage"] == {"input_tokens": 12}
    assert report["execution"]["cost_microusd"] is None
    assert report["source_revision"] == "a" * 40
    assert set(report["execution"]) == {"run_id", "status", "model", "effort", "adapter_revision", "started_at",
                                         "finished_at", "usage", "cost_microusd"}
    overview = (await chat["client"].get(f"/operator/v2/businesses/{chat['business']}/overview",
                                        headers=chat["headers"])).json()["data"]
    assert overview["task_counts"]["succeeded"] == 1 and overview["last_task_at"] is not None


async def test_history_cursor_binding_and_snapshot_refresh(chat):
    for _ in range(3):
        assert (await launch(chat)).status_code == 202
    path = f"/operator/v2/businesses/{chat['business']}/tasks"
    first = (await chat["client"].get(path, params={"limit": 2}, headers=chat["headers"])).json()["data"]
    cursor = first["next_cursor"]
    second = (await chat["client"].get(path, params={"limit": 2, "cursor": cursor},
                                       headers=chat["headers"])).json()["data"]
    assert len(first["items"]) == 2 and len(second["items"]) == 1 and second["next_cursor"] is None
    assert first["snapshot_id"] == second["snapshot_id"]
    assert len({t["task_id"] for t in first["items"] + second["items"]}) == 3
    fresh_session = await login(chat)
    assert (await chat["client"].get(path, params={"cursor": cursor}, headers=fresh_session)).status_code == 400
    assert (await chat["client"].get(path, params={"cursor": cursor, "status": "queued"},
                                     headers=chat["headers"])).status_code == 400
    assert (await launch(chat)).status_code == 202
    stale = await chat["client"].get(path, params={"cursor": cursor}, headers=chat["headers"])
    assert stale.status_code == 409 and stale.json()["code"] == "snapshot_expired"


async def test_foreign_and_revoked_grants_hide_every_operations_path(chat):
    task = (await launch(chat)).json()["data"]["task"]
    other = await login(chat, 1)
    paths = [f"/operator/v2/businesses/{chat['business']}/{suffix}"
             for suffix in ("agents", "tasks", "overview")]
    paths += [f"/operator/v2/tasks/{task['task_id']}/report"]
    for path in paths:
        assert (await chat["client"].get(path, headers=other)).status_code == 404
    async with AsyncSession(chat["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == chat["business"],
            BusinessGrant.environment_id == settings().environment).values(enabled=False))
    for path in paths:
        assert (await chat["client"].get(path, headers=chat["headers"])).status_code == 404
    assert (await launch(chat)).status_code == 404


async def test_invalid_agent_extra_fields_and_limits(chat):
    path = f"/operator/v2/businesses/{chat['business']}/tasks"
    payload = {"agent_id": "business-planner", "message": "Testas", "idempotency_key": str(uuid4())}
    for extra in ({"agent_id": "sales"}, {"message": " "}, {"workspace": "/"}, {"message": "x" * 1001}):
        assert (await chat["client"].post(path, json={**payload, **extra}, headers=chat["headers"])).status_code == 400
    for params in ({"limit": 51}, {"limit": 0}, {"status": "invented"}, {"cursor": "forged"}):
        assert (await chat["client"].get(path, params=params, headers=chat["headers"])).status_code == 400


def test_canonical_operations_schema_is_exact_generator():
    import importlib.util
    import sys
    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root / "scripts"))
    spec = importlib.util.spec_from_file_location("operations_contract", root / "scripts/control_operations_contract.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    saved = json.loads((root.parents[1] / "docs/contracts/verslomatika-operations.openapi.json").read_text("utf-8"))
    assert saved == module.build()
