"""Retained restricted PG: injected completion denial preserves known receipt."""

import hashlib
import json
import os
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from test_acquisition_agent_roles_pg import Roles, six  # noqa: F401
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_acquisition_model_prepare_pg import stored
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import agent_role_calibration as lab
from pinet_core.acquisition import agent_role_tasks, native_calibration
from pinet_core.acquisition.agent_role_contract import KIND, ROLES
from pinet_core.acquisition.agent_role_handler import AgentRoleHandler
from pinet_core.acquisition.contracts import Campaign
from pinet_core.acquisition.engine import fingerprint
from pinet_core.acquisition.model_models import ModelAuthorization
from pinet_core.config import settings
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit isolated retained0050 PG with inert provider only")


async def workflow(p, dispatch):
    cases = [{"id": "known-receipt-" + str(n), "split": "train" if n < 3 else "holdout",
              "prospect": p["request"]["prospect"], "recipient": p["request"]["recipient"],
              "persona": "You manage a cabin property and ask about requirements for option " + str(n),
              "expected_classifications": ["question"], "expected_initial": "draft_ready"} for n in range(6)]
    async with AsyncSession(p["admin"]) as tx:
        bindings = {}
        for role in ROLES:
            row = await tx.get(ModelAuthorization, p["team"][role]["authorization_id"])
            bindings[role] = {key: getattr(row, key) for key in ("id", "fingerprint", "agent_id", "config_id",
                                                               "config_revision", "config_sha256", "execution_role")}
    folder = native_calibration.ROOT / ("known-failed-receipts-" + uuid4().hex)
    folder.mkdir()
    source = folder / "known-source.json"
    source.write_text(json.dumps({"synthetic": True, "now": utcnow().isoformat(),
                                 "campaign": p["request"]["campaign"], "cases": cases}), encoding="utf-8")
    frozen = {"version": "acquisition-six-role-calibration.v1", "source_revision": settings().control_source_revision,
              "team": p["team"], "bindings": bindings, "campaign": p["request"]["campaign"], "cases": cases,
              "corpus_sha256": fingerprint(cases), "evaluator_hash": fingerprint(lab.GRADE), "max_turns": 1,
              "protected_source": {"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest()}}
    manifest = folder / "known-manifest.json"
    manifest.write_text(json.dumps(frozen), encoding="utf-8")
    reference = {"manifest_path": str(manifest), "manifest_sha256": hashlib.sha256(manifest.read_bytes()).hexdigest(),
                 "case_id": "known-receipt-0"}
    return lab.SixRoleWorkflow(token=p["token"], reference=reference, episode_id=uuid4(), dispatch=dispatch)


@pytest.mark.parametrize("path", ["dispatch_error", "failed_status", "reread_error"])
async def test_settled_model_then_injected_completion_denial_is_visible_without_promotion(six, monkeypatch, path):  # noqa: F811
    p, fake = six, Roles()
    original_locks = AgentRoleHandler.completion_locks
    original_error = RunnerError("known_dispatch_failed_after_completion")

    async def deny_completion(self, tx, claimed):
        await original_locks(self, tx, claimed)
        # Fault injection is explicit and does not claim the actual writer's
        # unknown cause. Settlement happened through the genuine common worker.
        raise RunnerError("authorization_revoked")

    monkeypatch.setattr(AgentRoleHandler, "completion_locks", deny_completion)

    async def dispatch(identity, kind):
        assert kind == KIND and await worker.execute_once(fake, kind=kind, task_id=identity)
        task, run, attempts = await stored(p, identity)
        assert task.status == run.status == "failed" and task.result is None
        assert len(attempts) == 1 and attempts[0].state == "succeeded" and attempts[0].output is not None
        assert run.usage["usage_complete"] and run.usage["unknown_usage_calls"] == 0
        if path == "reread_error":
            async def unavailable(*args):
                raise RunnerError("history_unavailable")

            monkeypatch.setattr(agent_role_tasks, "read", unavailable)
        if path != "failed_status":
            raise original_error

    current = await workflow(p, dispatch)
    with pytest.raises(RunnerError) as error:
        await current._submit("coordinator", Campaign.model_validate(p["request"]["campaign"]), current.case)
    if path != "failed_status":
        assert error.value is original_error
    else:
        assert error.value.code == "agent_role_calibration_task_incomplete"
    receipt = current.receipts[0]
    assert "result" not in receipt and fake.calls == ["coordinator"]
    if path != "reread_error":
        assert receipt["status"] == "failed" and receipt["failure_code"] == "authorization_revoked"
        assert receipt["execution"]["status"] == "failed"
        assert receipt["execution"]["usage"]["usage_complete"]
        assert receipt["execution"]["usage"]["input_tokens"] == 5
        assert receipt["execution"]["usage"]["output_tokens"] == 2
        assert len(receipt["input_sha256"]) == 64 and receipt["consumed_parents"] == []
