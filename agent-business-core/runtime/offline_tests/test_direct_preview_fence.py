"""Fresh Task checks and required Session fence semantics, no database/provider."""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_direct_preview_plan import native_call, parsed

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import preview
from pinet_core.customer_agents.session import TaskFence
from pinet_core.workspace_team import direct
from pinet_core.workspace_team import direct_preview_budget as budget


@pytest.mark.parametrize("mutation", [None, "session", "lease", "context", "run", "native_snapshot", "archived"])
async def test_fresh_native_task_fence_returns_none_only_for_exact_current_claim(monkeypatch, mutation):
    plan, run = parsed(), str(uuid4())
    now = datetime.now(UTC)
    monkeypatch.setattr(settings(), "environment", plan.scope.environment_id)
    monkeypatch.setattr(settings(), "control_source_revision", plan.scope.source_revision)
    async def ready(tx):
        pass
    monkeypatch.setattr(budget, "schema_ready", ready)
    context = {budget.CONTEXT_KEY: digest(plan.model_dump(mode="json")), "native_base_revision": 0,
        "native_base_sha256": digest([]), "quality_request_sha256": "3" * 64}
    sha = digest(context)
    row = {key: str(getattr(plan.scope, key)) for key in ("user_id", "organization_id", "business_id", "environment_id", "session_id", "source_revision")}
    row.update(kind="workspace.direct_turn", status="running", run_id=run, allocated_run=run,
        archived_at=None, child_archived=None, chat_id=str(plan.chat_id), conversation_id=str(plan.conversation_id),
        snapshot=plan.snapshot.model_dump(mode="json"), snapshot_sha256=digest(plan.snapshot.model_dump(mode="json")),
        plan_sha256=digest(plan.model_dump(mode="json")), context_sha256=sha, allocated_context=sha, context=context,
        lease_until=now + timedelta(seconds=10), deadline=now + timedelta(seconds=30), expires_at=now + timedelta(seconds=30))
    if mutation == "session":
        row["session_id"] = str(uuid4())
    elif mutation == "lease":
        row["lease_until"] = now - timedelta(seconds=1)
    elif mutation == "context":
        row["context"] = {**context, "native_base_revision": 1}
    elif mutation == "run":
        row["allocated_run"] = str(uuid4())
    elif mutation == "native_snapshot":
        row["snapshot"] = {**row["snapshot"], "config_sha256": "f" * 64}
    elif mutation == "archived":
        row["child_archived"] = now
    class Reads:
        async def execute(self, statement, params):
            assert params == {"t": str(plan.task_id)}
            return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: row))
        async def scalar(self, statement):
            return now
    fence = budget.task_fence(str(plan.task_id), run, plan, sha)
    if mutation:
        with pytest.raises(ControlError, match="native_preview_task_not_current"):
            await fence.check(Reads())
    else:
        assert await fence.check(Reads()) is None  # required by the maintained SessionPrincipal contract


async def test_metadata_principal_cannot_dispatch_any_model_without_a_claimed_turn():
    plan = parsed()
    class Metadata(TaskFence):
        async def check(self, tx):
            pass
        async def reserve(self, tx, call):
            pytest.fail("Metadata must never reach a call reservation")
    principal = preview.principal(plan.scope, Metadata(), plan.snapshot.model_dump(mode="json"))
    with pytest.raises(ControlError, match="preview_task_required"):
        await principal.reserve(object(), {}, **native_call(plan).model_dump(mode="json"))


@pytest.mark.parametrize("native", [True, False])
async def test_retained_usage_never_needs_rls_visible_task_or_allocation(native):
    calls = []
    observed = {"input_tokens": 9, "output_tokens": 5}
    class HiddenOwner:
        async def scalar(self, statement, params):
            calls.append(str(statement))
            if "workspace_calibration_run_usage" in str(statement):
                return {"usage": observed} if native else None
            assert not native and "workspace_direct_run_usage" in str(statement)
            return observed
    assert await direct.saved_usage(HiddenOwner(), "task", "run", "owner", "env", "b" * 40) == observed
    assert len(calls) == (1 if native else 2)
