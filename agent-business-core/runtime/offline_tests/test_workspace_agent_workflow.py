"""Provider-zero workflow contracts, transition logic and failure protections."""
import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team.wire import PublicEvent
from pinet_core.workspace_team.workflow_contract import document
from pinet_core.workspace_team.workflow_wire import PrepareAndTest


def origin():
    content = "Automatinis vieno išsaugoto pavyzdžio bandymas."
    return {"event_id": str(uuid4()), "topic_id": str(uuid4()), "task_id": str(uuid4()),
        "sequence": 3, "author_type": "coordinator", "author_user_id": None,
        "participant_id": str(uuid4()), "attempt_id": None, "native_workflow_intent_id": str(uuid4()),
        "kind": "assignment", "reply_to_event_id": str(uuid4()), "content": content,
        "content_sha256": hashlib.sha256(content.encode()).hexdigest(), "source_revision": "a"*40,
        "created_at": "2026-10-17T20:00:00Z"}


def test_automatic_child_is_a_trusted_coordinator_assignment_without_a_fake_owner():
    event = PublicEvent.model_validate(origin())
    assert event.author_type == "coordinator" and event.attempt_id is None
    assert event.native_workflow_intent_id is not None
    assert "native_episode_task_id" not in event.model_dump(mode="json")


@pytest.mark.parametrize("changed", [
    {"author_type": "user", "author_user_id": str(uuid4()), "participant_id": None, "kind": "owner_message"},
    {"kind": "answer"}, {"author_type": "adviser"}, {"attempt_id": str(uuid4())},
    {"native_episode_task_id": str(uuid4())}, {"participant_id": None}, {"author_user_id": str(uuid4())}])
def test_workflow_marker_cannot_forge_human_phase_or_completed_native_receipts(changed):
    with pytest.raises(ValidationError):
        PublicEvent.model_validate(origin() | changed)


@pytest.mark.parametrize("purpose", ["custom", "customer_research", "email"])
def test_explicit_workflow_only_admits_the_existing_site_chat_native_adapter(purpose):
    with pytest.raises(ValidationError):
        PrepareAndTest.model_validate({"idempotency_key": str(uuid4()), "creation_id": str(uuid4()),
            "content": "Parenkite ir išbandykite.", "purpose": purpose})


def test_canonical_routes_are_additive_and_get_has_no_dispatch_body():
    contract = document()
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-workflows"
    assert set(contract["paths"]) == {base, base+"/{workflow_id}", base+"/{workflow_id}/cancel"}
    assert "requestBody" not in contract["paths"][base+"/{workflow_id}"]["get"]
    schemas = contract["components"]["schemas"]
    assert schemas["WorkflowView"]["properties"]["calibration_status"] == {
        "const": "UNVERIFIED", "title": "Calibration Status", "type": "string"}
    assert schemas["PrepareAndTest"]["additionalProperties"] is False


def test_checked_in_workflow_contract_matches_the_canonical_wire():
    root = Path(__file__).resolve().parents[3]
    assert json.loads((root/"docs/contracts/verslomatika-workspace-agent-workflow.openapi.json").read_text("utf-8")) == document()


def prepared(monkeypatch):
    from test_workspace_calibration_plan import data, parsed

    from pinet_core.config import settings
    from pinet_core.workspace_team import episode, workflow

    raw = data()
    raw["scenario"] = "saved_example"
    raw["messages"] = [raw["snapshot"]["specification"]["examples"][0]["input"]]
    plan = parsed(raw)
    monkeypatch.setattr(settings(), "control_source_revision", plan.scope.source_revision)
    now = datetime.now(UTC)
    owner = plan.scope.owner_binding()
    intent = SimpleNamespace(**owner, id=str(uuid4()), topic_id=str(uuid4()), team_thread_id=str(uuid4()),
        business_id=str(plan.scope.business_id), grant_id=str(plan.scope.grant_id),
        session_id=str(plan.scope.session_id), creation_id=str(plan.scope.creation_id), purpose="site_chat",
        source_revision=plan.scope.source_revision, parent_task_id=str(uuid4()),
        planned_child_task_id=str(uuid4()), child_key=str(uuid4()), origin_event_id=str(uuid4()),
        state="prepared", child_task_id=None, cancelled_at=None, failure_code=None, deadline=now+timedelta(minutes=3),
        agent_id=str(plan.snapshot.agent_id), config_revision_id=str(plan.snapshot.config_revision_id),
        config_revision=plan.snapshot.config_revision, config_sha256=plan.snapshot.config_sha256, saved_event_id=str(uuid4()))
    parent = SimpleNamespace(id=intent.parent_task_id, status="succeeded", session_id=intent.session_id,
        source_revision=intent.source_revision, failure_code=None, result={"agent_preparation": workflow.receipt_of(intent)})
    row = SimpleNamespace(**owner, id=intent.topic_id, business_id=intent.business_id, grant_id=intent.grant_id)
    session = SimpleNamespace(id=intent.session_id)
    capture = episode.Capture(plan.scope, plan.snapshot, plan.messages, "saved_example")
    return intent, parent, row, session, capture, now, plan


class ParentTx:
    def __init__(self, parent, now):
        self.parent, self.now = parent, now

    async def scalar(self, statement):
        assert str(statement) == "SELECT clock_timestamp()"
        return self.now

    async def get(self, model, key, **options):
        from pinet_core.tasks.models import Task
        assert model is Task and key == self.parent.id and options == {"populate_existing": True}
        return self.parent


@pytest.mark.asyncio
async def test_postcommit_continuation_requires_exact_parent_and_native_config(monkeypatch):
    from pinet_core.workspace_team import workflow
    intent, parent, row, session, capture, now, _ = prepared(monkeypatch)
    await workflow.assert_continuation(ParentTx(parent, now), intent, session, row, capture)
    request = workflow.scenario_request(intent)
    assert request.messages is None and str(request.idempotency_key) == intent.child_key
    assert request.content == workflow.CHILD_MESSAGE
    assert str(request.reply_to_event_id) == intent.saved_event_id


@pytest.mark.parametrize("change", [
    "cancel", "failed", "expired", "parent_running", "parent_failed", "parent_result",
    "parent_session", "parent_source", "session", "source", "owner", "topic", "state",
    "already_dispatched", "agent", "creation", "revision_id", "revision", "sha256", "grant"])
@pytest.mark.asyncio
async def test_stale_or_replayed_intent_cannot_authorize_a_child(monkeypatch, change):
    from pinet_core.control.routes import ControlError
    from pinet_core.workspace_team import workflow
    intent, parent, row, session, capture, now, _ = prepared(monkeypatch)
    if change == "cancel":
        intent.cancelled_at = now
    elif change == "failed":
        intent.failure_code = "authorization_revoked"
    elif change == "expired":
        intent.deadline = now
    elif change.startswith("parent_"):
        key = change.removeprefix("parent_")
        if key in {"running", "failed"}:
            parent.status = key
        elif key == "result":
            parent.result = {"agent_preparation": None}
        else:
            setattr(parent, "session_id" if key == "session" else "source_revision", str(uuid4()))
    elif change == "session":
        session.id = str(uuid4())
    elif change == "source":
        intent.source_revision = "b"*40
    elif change == "owner":
        row.user_id = str(uuid4())
    elif change == "topic":
        row.id = str(uuid4())
    elif change == "state":
        intent.state = "pending"
    elif change == "already_dispatched":
        intent.child_task_id = intent.planned_child_task_id
    elif change == "grant":
        row.grant_id = str(uuid4())
    else:
        field = {"agent": "agent_id", "creation": "creation_id", "revision_id": "config_revision_id",
            "revision": "config_revision", "sha256": "config_sha256"}[change]
        setattr(intent, field, 2 if change == "revision" else "e"*64 if change == "sha256" else str(uuid4()))
        # Even a same-shaped fabricated parent JSON does not replace the exact
        # independently frozen canonical native preflight snapshot.
        parent.result["agent_preparation"] = workflow.receipt_of(intent)
    with pytest.raises(ControlError):
        await workflow.assert_continuation(ParentTx(parent, now), intent, session, row, capture)


@pytest.mark.parametrize(("parent_state", "intent_state", "child_state", "expected"), [
    ("queued", "pending", None, "waiting_preparation"), ("running", "pending", None, "preparing"),
    ("failed", "pending", None, "failed"), ("cancelled", "pending", None, "cancelled"),
    ("succeeded", "pending", None, "clarification_required"), ("succeeded", "prepared", None, "waiting_test"),
    ("succeeded", "dispatched", "queued", "waiting_test"), ("succeeded", "dispatched", "running", "testing"),
    ("succeeded", "dispatched", "succeeded", "completed"), ("succeeded", "dispatched", "failed", "failed"),
    ("succeeded", "dispatched", "cancelled", "cancelled")])
def test_visible_progress_comes_from_native_task_states(monkeypatch, parent_state, intent_state, child_state, expected):
    from pinet_core.workspace_team import workflow
    intent, parent, _, _, _, now, _ = prepared(monkeypatch)
    intent.state, parent.status = intent_state, parent_state
    child = SimpleNamespace(status=child_state, failure_code=None) if child_state else None
    assert workflow.stage(intent, parent, child, now) == (expected, None)


@pytest.mark.parametrize("child_state", [None, "queued", "running"])
def test_deadline_and_source_are_not_renewed_by_reading_or_restart(monkeypatch, child_state):
    from pinet_core.workspace_team import workflow
    intent, parent, _, _, _, now, _ = prepared(monkeypatch)
    child = SimpleNamespace(status=child_state, failure_code=None) if child_state else None
    assert workflow.stage(intent, parent, child, intent.deadline) == ("failed", "authorization_revoked")
    intent.source_revision = "b"*40
    assert workflow.stage(intent, parent, child, now) == ("failed", "authorization_revoked")
    intent.cancelled_at = now
    assert workflow.stage(intent, parent, child, now) == ("cancelled", None)


def predecessor():
    from pinet_core.workspace_team import direct_preview_schema, direct_schema, episode_schema, schema
    original = next(s for s in schema.protections() if s.startswith("CREATE FUNCTION control_workspace_team_fence()"))
    original = original.replace("CREATE FUNCTION control_workspace_team_fence()", "CREATE OR REPLACE FUNCTION public.control_workspace_team_fence()")
    return direct_preview_schema.global_team_patch(direct_schema.patch_team_fence(episode_schema.patch_fence(original)))


def test_workflow_migration_wraps_only_exact_native_branch_preserving_direct_and_legacy_bytes():
    from pinet_core.workspace_team import workflow_schema as schema
    from pinet_core.workspace_team.episode_schema import NATIVE_BRANCH
    before = predecessor()
    after = schema.patch_fence(before)
    assert after.count(schema.BRANCH) == 1 and after.replace(schema.BRANCH, NATIVE_BRANCH) == before
    assert schema.patch_fence(after, downgrade=True) == before
    assert "workspace_direct_team_check" in after and "saved_agent" in after
    assert "SECURITY DEFINER" not in after


@pytest.mark.parametrize("change", ["unknown", "duplicate", "already", "no_direct", "no_saved"])
def test_unknown_predecessor_never_gets_a_permissive_migration(change):
    from pinet_core.workspace_team import workflow_schema as schema
    from pinet_core.workspace_team.episode_schema import NATIVE_BRANCH
    value = predecessor()
    value = {"unknown": lambda: value.replace("a.state<>'succeeded'", "a.state<>'failed'"),
        "duplicate": lambda: value+NATIVE_BRANCH, "already": lambda: schema.patch_fence(value),
        "no_direct": lambda: value.replace("workspace_direct_team_check", "changed"),
        "no_saved": lambda: value.replace("saved_agent", "changed")}[change]()
    with pytest.raises(RuntimeError, match="Unknown or ambiguous"):
        schema.patch_fence(value)


def test_exact_author_check_is_additive_fail_closed_and_reversible():
    from pinet_core.workspace_team import workflow_schema as schema
    from pinet_core.workspace_team.direct_preview_schema import AUTHOR_CHECK
    statement = schema.author_sql([{"name": 'safe"name', "expression": AUTHOR_CHECK}])
    assert statement[0].endswith('DROP CONSTRAINT "safe""name"')
    assert statement[1].endswith("CHECK("+schema.AUTHOR+")")
    assert schema.author_sql([{"name": "x", "expression": schema.AUTHOR}], downgrade=True)[1].endswith("CHECK("+AUTHOR_CHECK+")")
    for rows in ([], [{"name": "x", "expression": "author_type='coordinator'"}],
            [{"name": "x", "expression": AUTHOR_CHECK}]*2):
        with pytest.raises(RuntimeError):
            schema.author_sql(rows)


def test_new_routes_execute_only_writes_and_get_never_drives_the_worker():
    import inspect

    from pinet_core.workspace_team import workflow, workflow_routes
    paths = {(r.path, tuple(sorted(r.methods))) for r in workflow_routes.router.routes}
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-workflows"
    assert paths == {(base, ("POST",)), (base+"/{workflow_id}", ("GET",)), (base+"/{workflow_id}/cancel", ("POST",))}
    read = inspect.getsource(workflow.read)
    assert "reconcile(" not in read and "admit(" not in read and "preflight(" not in read
    assert "workflow.read(" in inspect.getsource(workflow_routes.read)


def test_maintained_worker_reconciles_before_claim_locks_and_model_execution_stays_outside_transactions():
    import inspect

    from pinet_core.tasks import worker
    from pinet_core.workspace_team import workflow
    claim = inspect.getsource(worker.claim)
    assert claim.index("await handler.reconcile(user_id)") < claim.index("async with scope(user=user_id)")
    assert "handler.reconcile" not in inspect.getsource(worker.execute_once)
    reconcile = inspect.getsource(workflow.reconcile)
    assert reconcile.index("episode.preflight(") < reconcile.index("return await admit(")
    assert "episode.execute(" not in reconcile and "lab.episode_session(" not in reconcile
    for function in (workflow.accept, workflow.read, workflow.saved, workflow.admit):
        code = inspect.getsource(function)
        assert "episode.execute(" not in code and "episode.preflight(" not in code


@pytest.mark.parametrize("change,expected", [
    ({}, True), ({"state": "prepared"}, False), ({"agent_id": "a"}, False),
    ({"state": "prepared", "agent_id": "a", "config_revision_id": "c", "config_revision": 1,
        "config_sha256": "d"*64, "saved_event_id": "e"}, True),
    ({"state": "prepared", "agent_id": "a", "config_revision_id": "c",
        "config_sha256": "d"*64, "saved_event_id": "e"}, False),
    ({"state": "prepared", "agent_id": "a", "config_revision_id": "c", "config_revision": 1,
        "saved_event_id": "e"}, False),
    ({"state": "dispatched", "agent_id": "a", "config_revision_id": "c", "config_revision": 1,
        "config_sha256": "d"*64, "saved_event_id": "e", "child_task_id": "child"}, True),
    ({"state": "dispatched", "agent_id": "a", "config_revision_id": "c", "config_revision": 1,
        "config_sha256": "d"*64, "saved_event_id": "e", "child_task_id": "foreign"}, False)])
def test_canonical_state_check_rejects_sql_null_bypasses(change, expected):
    # Execute the actual scalar CHECK with SQL NULL/boolean semantics; only PG's
    # regex operator is translated for this offline SQLite expression check.
    import re
    import sqlite3

    from pinet_core.workspace_team import workflow_schema
    ddl = workflow_schema.statements()[0]
    start = ddl.index("CHECK(coalesce(")
    expression = ddl[start+len("CHECK("):ddl.index(",\n      UNIQUE(id", start)][:-1].replace("~", " REGEXP ")
    values = {key: None for key in ("agent_id", "config_revision_id", "config_revision",
        "config_sha256", "saved_event_id", "child_task_id")}
    values.update(state="pending", planned_child_task_id="child")
    values.update(change)
    with sqlite3.connect(":memory:") as tx:
        tx.create_function("regexp", 2, lambda pattern, value: None if value is None else bool(re.search(pattern, value)))
        source = ",".join(":"+key+" AS "+key for key in values)
        result = tx.execute("SELECT "+expression+" FROM(SELECT "+source+")", values).fetchone()[0]
    assert result is not None and bool(result) == expected


@pytest.mark.asyncio
async def test_saved_example_uses_native_strip_rules_without_changing_the_configuration(monkeypatch):
    from pinet_core.workspace_team import workflow
    intent, parent, row, session, capture, now, _ = prepared(monkeypatch)
    # Specification permits leading/trailing Unicode whitespace. The native
    # TextTurn strips it; no SQL raw-string comparison may reject that result.
    before = capture.snapshot.specification.examples[0].input
    capture.snapshot.specification.examples[0].input = "\u2003"+before+"\n"
    await workflow.assert_continuation(ParentTx(parent, now), intent, session, row, capture)
    assert capture.snapshot.specification.examples[0].input == "\u2003"+before+"\n"


@pytest.mark.parametrize("change", ["cancel", "failed", "dispatched", "missing"])
@pytest.mark.asyncio
async def test_repeated_child_admission_is_a_noop_before_any_native_or_queue_write(monkeypatch, change):
    from pinet_core.workspace_team import workflow
    intent, _, _, _, capture, _, _ = prepared(monkeypatch)
    if change == "cancel":
        intent.cancelled_at = datetime.now(UTC)
    elif change == "failed":
        intent.failure_code = "authorization_revoked"
    elif change == "dispatched":
        intent.state, intent.child_task_id = "dispatched", intent.planned_child_task_id
    class Tx:
        async def execute(self, statement, params):
            assert "pg_advisory_xact_lock" in str(statement)
            assert params["k"].endswith(":"+intent.user_id)
        async def scalar(self, statement):
            assert "FOR UPDATE" in str(statement)
            return None if change == "missing" else intent
    assert await workflow.admit(Tx(), intent.id, capture) is False


@pytest.mark.parametrize("change", [
    None, "cancel", "failed", "deadline", "task_session", "task_source", "message", "origin_id",
    "origin_author", "origin_attempt", "origin_native", "reply", "turn_topic", "turn_thread", "turn_owner",
    "turn_deadline", "child_id", "config_revision", "config_sha256", "agent_id", "creation_id", "grant_id"])
@pytest.mark.asyncio
async def test_running_child_rechecks_exact_durable_intent_and_native_plan_on_every_authority_use(monkeypatch, change):
    from pinet_core.control.routes import ControlError
    from pinet_core.creation.service import binding, digest
    from pinet_core.workspace_team import workflow
    intent, _, _, _, _, now, plan = prepared(monkeypatch)
    intent.state, intent.child_task_id = "dispatched", intent.planned_child_task_id
    task = SimpleNamespace(id=intent.child_task_id, session_id=intent.session_id,
        source_revision=intent.source_revision, message=workflow.CHILD_MESSAGE)
    turn = SimpleNamespace(**binding(intent), owner_event_id=intent.origin_event_id, topic_id=intent.topic_id,
        team_thread_id=intent.team_thread_id, deadline=intent.deadline)
    event = SimpleNamespace(id=intent.origin_event_id, native_workflow_intent_id=intent.id,
        author_type="coordinator", kind="assignment", attempt_id=None, native_episode_task_id=None,
        reply_to_event_id=intent.saved_event_id)
    if change == "cancel":
        intent.cancelled_at = now
    elif change == "failed":
        intent.failure_code = "authorization_revoked"
    elif change == "deadline":
        intent.deadline = now
    elif change in {"task_session", "task_source", "message"}:
        setattr(task, {"task_session": "session_id", "task_source": "source_revision", "message": "message"}[change], "changed")
    elif change in {"origin_id", "origin_author", "origin_attempt", "origin_native", "reply"}:
        field = {"origin_id": "id", "origin_author": "author_type", "origin_attempt": "attempt_id",
            "origin_native": "native_episode_task_id", "reply": "reply_to_event_id"}[change]
        setattr(event, field, "user" if change == "origin_author" else str(uuid4()))
    elif change in {"turn_topic", "turn_thread", "turn_owner", "turn_deadline"}:
        field = {"turn_topic": "topic_id", "turn_thread": "team_thread_id", "turn_owner": "user_id", "turn_deadline": "deadline"}[change]
        setattr(turn, field, intent.deadline+timedelta(seconds=1) if change == "turn_deadline" else str(uuid4()))
    elif change == "child_id":
        intent.child_task_id = str(uuid4())
    elif change is not None:
        setattr(intent, change, 2 if change == "config_revision" else "f"*64 if change == "config_sha256" else str(uuid4()))
    class Tx:
        async def scalar(self, statement, params=None):
            return now if str(statement) == "SELECT clock_timestamp()" else True
        async def get(self, model, key, **options):
            assert key == intent.id and options == {"populate_existing": True}
            return intent
    async def allocation(tx, task_id):
        assert task_id == task.id
        material = plan.model_dump(mode="json")
        return {"plan": material, "plan_sha256": digest(material), "call_limit": plan.call_limit}
    monkeypatch.setattr(workflow.episode, "optional_allocation", allocation)
    if change is None:
        await workflow.verify_child(Tx(), task, turn, event)
    else:
        with pytest.raises(ControlError):
            await workflow.verify_child(Tx(), task, turn, event)
