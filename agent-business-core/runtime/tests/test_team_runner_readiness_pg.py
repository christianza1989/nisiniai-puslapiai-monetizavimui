"""Actual roster/admission/worker refuse incapable config without an Attempt."""
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers  # noqa: F401 - maintained fixture chain
from test_workspace_team_pg import page, send, setup, team  # noqa: F401

from pinet_core.config import settings
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task
from pinet_core.workspace_team.models import Attempt, TeamEvent, TeamThread, TeamTurn
from pinet_core.workspace_team.policy import KIND


@pytest.mark.parametrize("change", ["workspace", "checksum"])
async def test_roster_and_send_refuse_before_any_new_native_work(team, monkeypatch, change):  # noqa: F811
    c = team
    auth, _, base, _, _ = await setup(c)
    monkeypatch.setattr(settings(), "chat_workspace" if change == "workspace" else "chat_codex_sha256",
        "" if change == "workspace" else "0" * 64)
    roster = await c["client"].get(base + "/team/roster", headers=auth)
    assert roster.status_code == 200 and roster.json()["data"]["can_send"] is False
    assert roster.json()["data"]["blockers"] == ["team_execution_disabled"]
    refused = await c["client"].post(base + "/team/turns", headers=auth, json={
        "idempotency_key": str(uuid4()), "content": "Known-incapable runner", "reply_to_event_id": None})
    assert refused.status_code == 403
    async with AsyncSession(c["admin"]) as tx:
        for model in (Task, TeamTurn, TeamThread, TeamEvent, Attempt):
            assert not list(await tx.scalars(select(model.id).where(model.environment_id == c["environment"])))


async def test_config_loss_after_acceptance_preserves_replay_but_reserves_no_attempt(team, monkeypatch):  # noqa: F811
    c = team
    auth, _, base, _, _ = await setup(c)
    accepted, body = await send(c, auth, base)
    monkeypatch.setattr(settings(), "chat_workspace", "")
    replay = await c["client"].post(base + "/team/turns", headers=auth, json=body)
    assert replay.status_code == 200 and replay.json()["data"] == accepted

    async def forbidden(*_, **__):
        pytest.fail("Incapable runner reached injected provider")

    assert await worker.execute_once(adapter=forbidden, kind=KIND)
    result = (await page(c, auth, base))["turns"][0]
    assert result["status"] == "failed" and result["failure_code"] == "runner_unavailable"
    assert result["reserved_calls"] == result["settled_calls"] == 0
    assert result["usage_complete"] is False
    async with AsyncSession(c["admin"]) as tx:
        assert not list(await tx.scalars(select(Attempt.id).where(Attempt.environment_id == c["environment"])))
