"""Original dispatch errors/cancellation survive best-effort historical reads."""

import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_acquisition_agent_roles import role_request

from pinet_core.acquisition import agent_role_calibration as lab
from pinet_core.acquisition.agent_role_contract import RoleCalibration, RoleRequest
from pinet_core.creation.service import digest
from pinet_core.tasks.codex import RunnerError


@pytest.mark.parametrize("cancel,read_fails,status", [(False, False, "failed"), (True, False, "failed"),
                         (False, True, "failed"), (True, True, "failed"), (False, False, "succeeded")])
async def test_dispatch_original_survives_failed_receipt_history(monkeypatch, cancel, read_fails, status):
    value = RoleRequest.model_validate(role_request())
    wf = lab.SixRoleWorkflow.__new__(lab.SixRoleWorkflow)
    wf.episode, wf.sequence, wf.receipts, wf.token = uuid4(), 0, [], "ordinary-owner"
    wf.reference = RoleCalibration(manifest_path="not-read-local-fixture", manifest_sha256="a" * 64,
                                   case_id="local-inert")
    wf.frozen = {"team": value.team.model_dump(mode="json")}
    original = asyncio.CancelledError("cancelled") if cancel else RunnerError("original_dispatch_error")
    held = {}

    @asynccontextmanager
    async def scope(**kwargs):
        yield object()

    async def actor(*args):
        return object()

    async def submit(tx, actor, request):
        held["value"] = RoleRequest.model_validate(request)
        return SimpleNamespace(id="retained-task", status="queued")

    async def dispatch(*args):
        raise original

    async def read(*args):
        if read_fails:
            raise RunnerError("history_unavailable")
        return {"task": {"status": status, "failure_code": "authorization_revoked", "result": {"not": "promoted"}},
                "execution": {"run_id": "retained-run", "status": "failed", "usage": {"usage_complete": True}}}

    async def read_request(*args):
        return held["value"]

    monkeypatch.setattr(lab, "scope", scope)
    monkeypatch.setattr(lab, "customer_session", actor)
    monkeypatch.setattr(lab.agent_role_tasks, "submit", submit)
    monkeypatch.setattr(lab.agent_role_tasks, "read", read)
    monkeypatch.setattr(lab.agent_role_tasks, "read_request", read_request)
    wf.dispatch = dispatch
    with pytest.raises(type(original)) as error:
        await wf._submit("coordinator", value.campaign, SimpleNamespace(prospect=value.prospect, recipient=value.recipient))
    assert error.value is original
    receipt = wf.receipts[0]
    assert "result" not in receipt
    if not read_fails:
        assert receipt["status"] == status and receipt["failure_code"] == "authorization_revoked"
        assert receipt["execution"]["usage"]["usage_complete"]
        assert receipt["input_sha256"] == digest(held["value"].model_dump(mode="json"))
        assert receipt["consumed_parents"] == []
