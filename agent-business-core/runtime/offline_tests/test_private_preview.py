"""Synthetic offline recovery state-machine checks; no DB, customer files or providers."""
import copy
import importlib.util
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy.dialects.postgresql.asyncpg import dialect
from sqlalchemy.sql import visitors
from sqlalchemy.sql.elements import BinaryExpression, BindParameter

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import private_preview as service
from pinet_core.creation.models import Job, PrivateIntakeReceipt, PrivateIntakeRequest, Revision
from pinet_core.creation.private_preview_wire import PreparePrivateIntake
from pinet_core.creation.service import binding, digest
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError

REAL_CAPTURE = service.capture


async def yes(*args, **kwargs):
    return True


async def no(*args, **kwargs):
    return False


def test_failed_receipt_binds_sql_null_for_the_strict_postgresql_failure_check():
    # PostgreSQL's intake IS NULL check deliberately excludes JSON literal null.
    # Exercise the real dialect serializer rather than the fake transaction fixture.
    selected = dialect()
    processor = PrivateIntakeReceipt.__table__.c.intake.type.dialect_impl(selected).bind_processor(selected)
    assert processor(None) is None
    assert processor({"state": "private-draft-imported"}) == '{"state": "private-draft-imported"}'


@pytest.fixture
def recovery(monkeypatch):
    from pinet_core.creation import routes
    from pinet_core.creation_registration import service as registration
    cfg = settings()
    for key, value in {"environment": "test-private-preview", "control_mode": "local", "customer_enabled": True,
            "creation_enabled": True, "control_source_revision": "b"*40}.items():
        monkeypatch.setattr(cfg, key, value)
    owner = dict(user_id=str(uuid4()), organization_id=str(uuid4()), portfolio_id=str(uuid4()), environment_id=cfg.environment)
    creation = SimpleNamespace(id=str(uuid4()), current_revision=1, canonical_host=None, status="draft_ready",
        active_job_id=None, source_revision="a"*40, **owner)
    session = SimpleNamespace(id=str(uuid4()), user_id=owner["user_id"], environment_id=cfg.environment)
    revision = SimpleNamespace(id=str(uuid4()), job_id=str(uuid4()), sequence=1, payload={"exact": "accepted"},
        material_hash=digest({"exact": "accepted"}), source_revision="a"*40)
    job = SimpleNamespace(id=revision.job_id, usage={"content_intake": {"version": "customer-content-intake.v1",
        "state": "failed", "code": "studio_domain_required"}})
    original_usage = copy.deepcopy(job.usage)
    state = SimpleNamespace(creation=creation, session=session, revision=revision, job=job, requests=[], receipts=[],
        scopes=0, calls=0, revoked=False, changed=False, context_extra=None, original_usage=original_usage)

    def context():
        return {"version": "creation-private-intake-binding.v1", **owner, "creation_id": creation.id,
            "session_id": session.id, "creation_source_revision": creation.source_revision,
            "accepted": {"revision_id": revision.id, "accepted_revision": revision.sequence,
                "candidate_sha256": revision.material_hash, "accepted_source_revision": revision.source_revision,
                "coordinator_event_id": str(uuid4()) if state.changed else "immutable-event", "coordinator_sha256": "c"*64},
            "source_revision": cfg.control_source_revision, "native_host": service.private_host(creation.id),
            "source_context": state.context_extra,
            "native_sources": {"public_source_revision": "d"*40, "importer_sha256": "e"*64, "network_sha256": "f"*64}}

    class Tx:
        async def scalar(self, statement):
            params = statement.compile().params
            entity = statement.column_descriptions[0].get("entity")
            if entity is Revision:
                return revision
            if entity is service.Session:
                return None if state.revoked else session
            if entity is PrivateIntakeRequest:
                key = params.get("idempotency_key_1")
                if key:
                    return next((row for row in state.requests if row.idempotency_key == key), None)
                return next((row.id for row in state.requests if row.lease_until > utcnow()
                    and not any(receipt.recovery_id == row.id for receipt in state.receipts)), None)
            return None

        async def execute(self, statement, *args, **kwargs):
            columns = getattr(statement, "column_descriptions", ())
            if [column["entity"] for column in columns] == [PrivateIntakeRequest, PrivateIntakeReceipt]:
                bound = {(part.left.table.name, part.left.name): part.right.value
                    for part in visitors.iterate(statement) if isinstance(part, BinaryExpression)
                    and isinstance(part.right, BindParameter) and getattr(part.left, "table", None) is not None}
                table = PrivateIntakeRequest.__tablename__
                if (table, "id") in bound:
                    row = next((row for row in state.requests if row.id == bound[table, "id"]), None)
                else:
                    row = next((row for row in reversed(state.requests) if "continuity" not in row.context
                        and row.creation_id == bound[table, "creation_id"] and row.revision_id == bound[table, "revision_id"]
                        and any(item.recovery_id == row.id and item.state == "private_draft_imported"
                            for item in state.receipts)), None)
                receipt = next((item for item in state.receipts if row is not None and item.recovery_id == row.id), None)
                assert statement.get_execution_options()["populate_existing"] is True
                return SimpleNamespace(one_or_none=lambda: (row, receipt) if row is not None else None)
            return None

        async def get(self, model, identity, **kwargs):
            if model is Job:
                return job
            if model is service.Session:
                return None if state.revoked else session
            if model is PrivateIntakeRequest:
                return next((row for row in state.requests if row.id == identity), None)
            return None

        async def refresh(self, *args):
            pass

        def add(self, row):
            row.created_at = utcnow()
            (state.requests if isinstance(row, PrivateIntakeRequest) else state.receipts).append(row)

        async def flush(self):
            pass

    tx = Tx()
    @asynccontextmanager
    async def scope(**kwargs):
        state.scopes += 1
        try:
            yield tx
        finally:
            state.scopes -= 1

    async def actor(*args, **kwargs):
        if state.revoked:
            raise ControlError(401, "unauthenticated")

    async def owned(*args, **kwargs):
        await actor()
        return creation

    async def capture(*args, **kwargs):
        await actor()
        if creation.active_job_id or creation.status != "draft_ready" or creation.canonical_host:
            raise ControlError(409, "private_intake_revision_unavailable")
        return revision, context()

    async def latest(*args):
        return state.requests[-1] if state.requests else None

    async def terminal(_tx, row):
        return next((receipt for receipt in state.receipts if receipt.recovery_id == row.id), None)

    async def customer_session(*args):
        await actor()
        return session

    monkeypatch.setattr(service, "scope", scope)
    monkeypatch.setattr(service, "guard", yes)
    monkeypatch.setattr(service, "current_actor", actor)
    monkeypatch.setattr(service, "capture", capture)
    monkeypatch.setattr(service, "customer_session", customer_session)
    monkeypatch.setattr(service, "schema_ready", yes)
    monkeypatch.setattr(service, "source_current", lambda: True)
    monkeypatch.setattr(service, "latest", latest)
    monkeypatch.setattr(service, "terminal", terminal)
    monkeypatch.setattr(routes, "owned", owned)
    monkeypatch.setattr(registration, "accepted_proof", yes)
    state.tx, state.context = tx, context

    async def runner(payload, **kwargs):
        state.calls += 1
        assert state.scopes == 0, "Native execution must run outside the SQL transaction"
        assert payload == revision.payload and kwargs["canonical_host"] == service.private_host(creation.id)
        assert kwargs["revision"] == revision.sequence and kwargs["seconds"] == 20
        assert await kwargs["still_authorized"]()
        return {"version": "customer-content-intake.v1", "state": "private-draft-imported", "creationId": creation.id,
            "acceptedRevision": revision.sequence, "sourceHash": revision.material_hash,
            "canonicalHost": kwargs["canonical_host"], "importerHash": "e"*64}
    state.runner = runner
    return state


def request(state, **changes):
    return PreparePrivateIntake.model_validate({"accepted_revision": state.revision.sequence,
        "candidate_sha256": state.revision.material_hash, "idempotency_key": str(uuid4()), **changes})


async def test_unbound_null_host_is_never_implicitly_importable(recovery):
    s = recovery
    assert await service.selected_intake(s.tx, s.creation, s.revision, s.job) == (None, s.original_usage["content_intake"])
    observed = await service.view(s.tx, s.session, s.creation)
    assert observed["state"] == "not_prepared" and observed["host_source"] == "not_bound"
    assert observed["native_host"] is None and observed["can_prepare"]
    assert not s.requests and not s.receipts and s.job.usage == s.original_usage


async def test_explicit_prepare_imports_exact_accepted_material_once_and_retains_original_failure(recovery):
    s = recovery
    value = request(s)
    observed = await service.prepare("token", s.creation.id, value, intake_runner=s.runner)
    assert observed["state"] == "private_draft_imported" and observed["latest"]["source_revision"] == "b"*40
    assert observed["latest"]["accepted_source_revision"] == "a"*40 and not observed["can_prepare"]
    assert observed["host_source"] == "explicit_private_preview" and observed["public_canonical_host"] is None
    assert s.creation.canonical_host is None and s.job.usage == s.original_usage
    assert len(s.requests) == len(s.receipts) == s.calls == 1
    assert await service.prepare("token", s.creation.id, value, intake_runner=s.runner) == observed
    assert s.calls == 1
    with pytest.raises(ControlError, match="private_intake_already_imported"):
        await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner)


async def test_failure_is_terminal_retained_and_explicit_new_key_may_replay(recovery):
    s = recovery
    value = request(s)
    async def failed(*args, **kwargs):
        s.calls += 1
        raise RunnerError("intake_revision_conflict")
    observed = await service.prepare("token", s.creation.id, value, intake_runner=failed)
    assert observed["state"] == "failed" and observed["latest"]["failure_code"] == "intake_revision_conflict"
    assert observed["can_prepare"] and s.receipts[0].intake is None
    assert (await service.prepare("token", s.creation.id, value, intake_runner=failed))["state"] == "failed"
    assert s.calls == 1
    assert (await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner))["state"] == "private_draft_imported"
    assert len(s.receipts) == 2 and s.receipts[0].state == "failed" and s.job.usage == s.original_usage


@pytest.mark.parametrize("change", ["revision", "candidate", "session", "source", "coordinator", "source_context"])
async def test_replay_fails_closed_on_changed_material_authority_or_source(recovery, change):
    s = recovery
    value = request(s)
    await service.prepare("token", s.creation.id, value, intake_runner=s.runner)
    if change == "revision":
        s.creation.current_revision = s.revision.sequence = 2
    elif change == "candidate":
        s.revision.material_hash = "0"*64
    elif change == "session":
        s.session.id = str(uuid4())
    elif change == "source":
        settings().control_source_revision = "0"*40
    elif change == "coordinator":
        s.changed = True
    else:
        s.context_extra = {"changed": "source"}
    with pytest.raises(ControlError):
        await service.prepare("token", s.creation.id, value, intake_runner=s.runner)
    assert s.calls == 1 and s.job.usage == s.original_usage
    native, _ = await service.selected_intake(s.tx, s.creation, s.revision, s.job)
    assert native is None


async def test_new_accepted_revision_reports_old_receipt_stale_and_no_host(recovery):
    s = recovery
    await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner)
    s.creation.current_revision = s.revision.sequence = 2
    observed = await service.view(s.tx, s.session, s.creation)
    assert observed["state"] == observed["latest"]["state"] == "stale"
    assert observed["current_revision"] == 2 and observed["latest"]["accepted_revision"] == 1
    assert observed["native_host"] is None and observed["host_source"] == "not_bound" and observed["can_prepare"]


async def test_pending_uuid_reconciliation_and_expired_explicit_same_key_reclaim(recovery):
    s = recovery
    value = request(s)
    async def interrupted(*args, **kwargs):
        raise __import__("asyncio").CancelledError()
    with pytest.raises(__import__("asyncio").CancelledError):
        await service.prepare("token", s.creation.id, value, intake_runner=interrupted)
    assert not s.receipts and len(s.requests) == 1
    old_run = s.requests[0].run_id
    assert (await service.prepare("token", s.creation.id, value, intake_runner=s.runner))["state"] == "preparing"
    assert s.calls == 0
    with pytest.raises(ControlError, match="private_intake_in_progress"):
        await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner)
    s.requests[0].lease_until = utcnow()-timedelta(seconds=1)
    assert (await service.view(s.tx, s.session, s.creation))["state"] == "stale"
    assert (await service.prepare("token", s.creation.id, value, intake_runner=s.runner))["state"] == "private_draft_imported"
    assert s.requests[0].run_id != old_run and s.calls == len(s.receipts) == len(s.requests) == 1


@pytest.mark.parametrize("change", ["revoked", "source", "active", "importer"])
async def test_awaited_native_result_cannot_commit_after_authority_or_source_change(recovery, change):
    s = recovery
    async def runner(*args, **kwargs):
        value = await s.runner(*args, **kwargs)
        if change == "revoked":
            s.revoked = True
        elif change == "source":
            settings().control_source_revision = "0"*40
        elif change == "active":
            s.creation.active_job_id = str(uuid4())
        else:
            value["importerHash"] = "0"*64
        return value
    if change == "importer":
        observed = await service.prepare("token", s.creation.id, request(s), intake_runner=runner)
        assert observed["state"] == "failed" and s.receipts[0].intake is None
    else:
        with pytest.raises(ControlError):
            await service.prepare("token", s.creation.id, request(s), intake_runner=runner)
        assert not s.receipts
    assert s.creation.canonical_host is None and s.job.usage == s.original_usage


async def test_non_null_legacy_selection_is_byte_exact_and_performs_no_binding_queries(recovery, monkeypatch):
    s = recovery
    s.creation.canonical_host = "legacy.example"
    s.job.usage = {"content_intake": {"opaque": "retained historical native snapshot"}}
    async def forbidden(*args):
        pytest.fail("Legacy known-host selection must not acquire private preview semantics")
    monkeypatch.setattr(service, "schema_ready", forbidden)
    assert await service.selected_intake(s.tx, s.creation, s.revision, s.job) == ("legacy.example", s.job.usage["content_intake"])


@pytest.mark.parametrize("field", ["creation_id", "session_id", "revision_id", "accepted_revision", "context_sha256", "request_fingerprint"])
async def test_immutable_request_identity_corruption_is_rejected(recovery, field):
    s = recovery
    await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner)
    setattr(s.requests[0], field, 2 if field == "accepted_revision" else "changed")
    with pytest.raises(ControlError, match="invalid_private_intake_source"):
        service.stored(s.requests[0])


@pytest.mark.parametrize("field", ["run_id", "recovery_id", "intake_sha256", "user_id", "state", "failure_code"])
async def test_receipt_corruption_or_cross_owner_result_never_resolves(recovery, field):
    s = recovery
    await service.prepare("token", s.creation.id, request(s), intake_runner=s.runner)
    setattr(s.receipts[0], field, "changed")
    if field == "recovery_id":
        assert (await service.selected_intake(s.tx, s.creation, s.revision, s.job))[0] is None
        return
    with pytest.raises(ControlError, match="invalid_private_intake_source"):
        await service.selected_intake(s.tx, s.creation, s.revision, s.job)


def test_additive_schema_preserves_history_and_restricts_native_writes(monkeypatch):
    path = Path(__file__).resolve().parents[1]/"migrations/versions/0042_creation_private_preview.py"
    spec = importlib.util.spec_from_file_location("private_preview_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    statements = []
    monkeypatch.setattr(module.op, "execute", statements.append)
    module.upgrade()
    sql = "\n".join(statements)
    assert module.down_revision == "0041_workspace_agent_episode"
    assert sql.count("FORCE ROW LEVEL SECURITY") == 2 and "SECURITY DEFINER" not in sql
    assert "ON DELETE CASCADE" not in sql and "ON DELETE RESTRICT" in sql
    assert "GRANT UPDATE(run_id,lease_until)" in sql and "BEFORE UPDATE OR DELETE" in sql
    assert sql.count("DEFERRABLE INITIALLY DEFERRED") == 2
    assert not any(value.lstrip().startswith(("UPDATE ", "DELETE ", "INSERT INTO ")) for value in statements)
    assert "verified_at IS NOT NULL" in sql and "m.role='owner'" in sql and "s.revoked_at IS NULL" in sql
    # Canonical0012 grants runtime INSERT/SELECT, not UPDATE, on owner graph tables.
    # PostgreSQL row locking would require UPDATE and break every ordinary admission.
    assert "FOR SHARE OF m,p" not in sql
    assert "BEFORE UPDATE OR DELETE ON control_memberships" in sql
    assert "ORDER BY u.environment_id,u.id FOR UPDATE" in sql
    assert "u.id=OLD.user_id" in sql and "u.id=NEW.user_id" in sql
    assert "c.canonical_host IS NOT NULL" in sql and "c.active_job_id IS NOT NULL" in sql
    assert "candidate_sha256" in sql and "coordinator_event_id" in sql and "NEW.run_id<>b.run_id" in sql
    # A retained binding blocks destructive rollback.
    monkeypatch.setattr(module.op, "get_bind", lambda: SimpleNamespace(exec_driver_sql=lambda _: SimpleNamespace(scalar=lambda: True)))
    with pytest.raises(RuntimeError, match="preservation"):
        module.downgrade()


@pytest.mark.parametrize("field,value", [("control_mode", "hosted"), ("environment", "production"),
    ("customer_enabled", False), ("creation_enabled", False), ("control_source_revision", "unknown")])
def test_endpoint_is_local_authenticated_feature_scope_only(monkeypatch, field, value):
    monkeypatch.setattr(settings(), field, value)
    with pytest.raises(ControlError):
        service.enabled()


@pytest.mark.parametrize("blocker", ["none", "active", "status", "public_host", "archived", "guide"])
async def test_real_capture_requires_idle_owned_private_revision(recovery, monkeypatch, blocker):
    from pinet_core.content_work import service as guides
    from pinet_core.content_work.models import GuideJob
    s = recovery
    async def material(*args):
        return s.revision, s.job, s.context()["accepted"]
    monkeypatch.setattr(service, "accepted_material", material)
    monkeypatch.setattr(service, "native_sources", lambda: s.context()["native_sources"])
    monkeypatch.setattr(guides, "archived", yes if blocker == "archived" else no)
    scalar = s.tx.scalar
    async def active_guide(statement):
        if statement.column_descriptions[0].get("entity") is GuideJob:
            return "active-guide" if blocker == "guide" else None
        return await scalar(statement)
    monkeypatch.setattr(s.tx, "scalar", active_guide)
    if blocker == "active":
        s.creation.active_job_id = "active"
    elif blocker == "status":
        s.creation.status = "queued"
    elif blocker == "public_host":
        s.creation.canonical_host = "legacy.example"
    if blocker == "none":
        revision, context = await REAL_CAPTURE(s.tx, s.session, s.creation, admission=True)
        assert revision is s.revision and context == s.context()
    else:
        with pytest.raises(ControlError, match="private_intake_revision_unavailable"):
            await REAL_CAPTURE(s.tx, s.session, s.creation, admission=True)
    if blocker == "guide":
        # Existing private binding remains readable while a later authorized GUIDE runs.
        assert (await REAL_CAPTURE(s.tx, s.session, s.creation))[0] is s.revision


@pytest.mark.parametrize("context_match", [True, False])
async def test_recovery_preserves_exact_original_optional_discovery_context(recovery, monkeypatch, context_match):
    from pinet_core.business_discovery import service as discovery
    from pinet_core.content_work import service as guides
    s = recovery
    original = {"contextSha256": "1"*64, "claims": ["captured source only"]}
    s.job.usage["source_context_sha256"] = original["contextSha256"]
    async def material(*args):
        return s.revision, s.job, s.context()["accepted"]
    async def approved(*args):
        return {"sourceContext": original if context_match else {**original, "contextSha256": "2"*64}}
    monkeypatch.setattr(service, "accepted_material", material)
    monkeypatch.setattr(service, "native_sources", lambda: s.context()["native_sources"])
    monkeypatch.setattr(guides, "archived", no)
    monkeypatch.setattr(discovery, "approved_build_context", approved)
    if context_match:
        assert (await REAL_CAPTURE(s.tx, s.session, s.creation))[1]["source_context"] == original
    else:
        with pytest.raises(ControlError, match="source_context_changed"):
            await REAL_CAPTURE(s.tx, s.session, s.creation)


@pytest.mark.parametrize("change", [None, "owner", "job_status", "revision_source", "payload", "team_hash", "language", "coordinator"])
async def test_accepted_material_extraction_keeps_original_hash_and_review_fences(recovery, monkeypatch, change):
    from pinet_core.creation import accepted_material as module
    s = recovery
    for row in (s.job, s.revision):
        for key, value in binding(s.creation).items():
            setattr(row, key, value)
    s.job.creation_id, s.job.status, s.job.source_revision = s.creation.id, "succeeded", s.revision.source_revision
    check = {"kind": "language_quality", "draft_sha256": s.revision.material_hash, "status": "PASS", "observed": True}
    data = {"decision": "accept_draft", "candidate_sha256": s.revision.material_hash, "checks": [check], "language_review_mode": "required"}
    event = {"event_id": "coordinator", "job_id": s.job.id, "role": "coordinator", "state": "succeeded", "data": data}
    reviewed = {"accepted_candidate_sha256": s.revision.material_hash, "events": [event]}
    original = SimpleNamespace(job_id=s.job.id, payload={key: value for key, value in data.items() if key != "language_review_mode"})
    class Tx:
        async def scalar(self, _):
            return s.revision
        async def get(self, model, _):
            return s.job if model is Job else original
    async def team(*args):
        return reviewed
    monkeypatch.setattr(module.team, "projection", team)
    if change == "owner":
        s.revision.user_id = "foreign"
    elif change == "job_status":
        s.job.status = "running"
    elif change == "revision_source":
        s.revision.source_revision = "0"*40
    elif change == "payload":
        s.revision.payload = {"changed": "candidate"}
    elif change == "team_hash":
        reviewed["accepted_candidate_sha256"] = "0"*64
    elif change == "language":
        check["observed"] = False
    elif change == "coordinator":
        original.job_id = "foreign"
    if change:
        with pytest.raises(ControlError):
            await module.accepted_material(Tx(), s.creation)
    else:
        _, _, proof = await module.accepted_material(Tx(), s.creation)
        assert proof == {"revision_id": s.revision.id, "accepted_revision": 1,
            "candidate_sha256": s.revision.material_hash, "accepted_source_revision": "a"*40,
            "coordinator_event_id": "coordinator", "coordinator_sha256": digest(original.payload)}
