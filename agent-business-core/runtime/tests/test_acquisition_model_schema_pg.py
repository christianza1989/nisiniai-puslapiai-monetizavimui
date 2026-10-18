"""Opt-in NEW isolated PostgreSQL schema QA; no model/channel/operating IO."""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agents import draft
from test_private_preview_pg import accepted, path, preview  # noqa: F401
from test_registration_private_continuity_pg import provision, registration_request

from pinet_core.acquisition import model_schema as schema
from pinet_core.acquisition import module_admin
from pinet_core.acquisition.model_models import ModelAttempt, ModelAuthorization, ModelTaskBinding
from pinet_core.config import settings
from pinet_core.control.routes import scope
from pinet_core.creation.service import digest
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.models import Config
from pinet_core.models import utcnow
from pinet_core.tasks.models import Task, TaskEvent, TaskRun, Thread

pytestmark = pytest.mark.skipif(os.environ.get("PINET_ACQUISITION_MODEL_SCHEMA_QA") != "1",
    reason="Requires NEW explicitly owned isolated PostgreSQL QA; retains immutable synthetic history")


@pytest.fixture
async def seed(preview, monkeypatch):  # noqa: F811
    c = preview
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(agents, "source_current", lambda: True)
    monkeypatch.setattr(module_admin, "git_source_observation", lambda root: SimpleNamespace(
        head=settings().control_source_revision, porcelain=""))
    cid, auth, body, _ = await accepted(c)
    initial = await c["client"].post(path(cid), headers=auth, json=body)
    assert initial.status_code == 200 and initial.json()["data"]["state"] == "private_draft_imported", initial.text
    request = await registration_request(c, cid, auth)
    registered = await provision(c, request)
    response = await c["client"].post(f"/customer/v2/creations/{cid}/agents", headers=auth,
        json={"request_id": str(uuid4()), "purpose": "customer_research", "configuration": draft()})
    assert response.status_code == 201, response.text
    agent = response.json()["data"]
    value = {"registration_id": registered["registration_id"], "authorizing_session_id": request["authorizing_session_id"],
        "execution_source_revision": settings().control_source_revision, "adapter_id": "synthetic-model-schema",
        "permissions": ["acquisition.capture", "acquisition.read", "acquisition.correspondence", "acquisition.work"],
        "duration_seconds": 3600}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        module = await module_admin.operate(tx, "approve", value)
    return c | {"cid": cid, "registered": registered, "request": request, "agent": agent, "module": module}


async def native_parent(c, tx, *, kind=schema.KIND, business=True, session=True, running=True):
    # Canonical native Registration/Agent metadata is created by maintained
    # fixtures above; these are only synthetic common queue rows, no execution.
    binding = c["binding"]
    fields = {key: binding[key] for key in ("user_id", "organization_id", "environment_id")}
    fields["business_id"] = c["registered"]["business_id"] if business else None
    thread = Thread(id=str(uuid4()), **fields, last_sequence=1)
    task = Task(id=str(uuid4()), **fields, thread_id=thread.id,
        session_id=c["request"]["authorizing_session_id"] if session else None,
        sequence=1, kind=kind, status="queued", idempotency_key=str(uuid4()), fingerprint="1"*64,
        message="Synthetic model preparation schema QA", source_revision=settings().control_source_revision,
        event_sequence=0, result=None, failure_code=None, run_id=None, lease_until=None)
    tx.add(thread)
    await tx.flush()
    tx.add(task)
    await tx.flush()
    if not running:
        return task, None
    run = TaskRun(id=str(uuid4()), **fields, task_id=task.id, status="running", model=schema.MODEL,
        effort=schema.EFFORT, adapter_revision=schema.ADAPTER, usage=None, cost_microusd=None)
    task.status, task.run_id, task.lease_until = "running", run.id, utcnow()+timedelta(seconds=120)
    tx.add(run)
    await tx.flush()
    return task, run


@pytest.mark.skipif(os.environ.get("PINET_MODEL_SCHEMA_PREFIX_BASELINE") != "1", reason="Explicit0045 predecessor reproduction only")
async def test_new_task_run_still_blocked_after_only_relaxing_checks_on0045(seed):
    c = seed
    async with AsyncSession(c["admin"]) as tx:
        row = (await tx.execute(text("SELECT user_id,organization_id,environment_id FROM control_creation_registrations WHERE id=:id"),
            {"id": c["registered"]["registration_id"]})).mappings().one()
        c["binding"] = dict(row)
    async with scope(user=c["binding"]["user_id"]) as tx:
        rows = (await tx.execute(text("SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND contype='c'"))).mappings().all()
    # Only a trusted isolated transaction may temporarily relax CHECKs. It is
    # deliberately rolled back when the unchanged0045 direct boundary refuses.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        for sql in schema.probe_sql():
            await tx.execute(text(sql))
        probes = {key: await tx.scalar(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid=to_regclass(:t) AND contype='c'"),
            {"t": "pinet_model_"+key+"_probe"}) for key in ("kind_old", "session_old", "business", "kind_new", "session_new")}
        for sql in schema.task_checks(rows, probes):
            await tx.execute(text(sql))
        await tx.execute(text("SELECT set_config('pinet.control_user',:u,true),set_config('pinet.environment',:e,true)"),
            {"u": c["binding"]["user_id"], "e": c["environment"]})
        await native_parent(c, tx)
        # This expected-success assertion is intentionally RED on the true0045
        # predecessor even after CHECK relaxation: exact typed boundary required.
        await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))


@pytest.fixture
async def model_case(seed):
    c = seed
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        registry = await tx.get(Registration, c["registered"]["registration_id"])
        config = await tx.scalar(select(Config).where(Config.agent_id == c["agent"]["agent"]["agent_id"]))
        c["binding"] = {k: getattr(registry, k) for k in ("business_id", "organization_id", "user_id", "environment_id")}
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        values = dict(c["binding"], id=str(uuid4()), portfolio_id=registry.portfolio_id,
            site_id=registry.site_id, adapter_id=c["module"]["after"]["adapter_id"], creation_id=registry.creation_id,
            registration_id=registry.id, registration_fingerprint=registry.fingerprint,
            agent_id=config.agent_id, config_id=config.id, config_revision=config.revision, config_sha256=config.config_sha256,
            purpose="customer_research", session_id=c["request"]["authorizing_session_id"],
            source_revision=settings().control_source_revision, module_snapshot=c["module"]["after"],
            module_fingerprint=c["module"]["fingerprint"], work_registration_sha256="3"*64,
            maximum_attempts=30, approved_at=now, expires_at=now+timedelta(seconds=3600),
            enabled=True, model=schema.MODEL, effort=schema.EFFORT)
        values["fingerprint"] = digest({k: str(v) for k, v in values.items() if k != "enabled"})
        tx.add(ModelAuthorization(**values))
        c["authorization"] = values
    return c


@asynccontextmanager
async def actor(c, *, source=None, user=None):
    async with scope(user=c["binding"]["user_id"] if user is None else user) as tx:
        await tx.execute(text("SELECT set_config('pinet.execution_source_revision',:s,true)"),
            {"s": settings().control_source_revision if source is None else source})
        yield tx


async def queued_run(c):
    async with actor(c) as tx:
        task, _ = await native_parent(c, tx, running=False)
        tx.add(ModelTaskBinding(**c["binding"], task_id=task.id, kind=schema.KIND,
            authorization_id=c["authorization"]["id"], input={"job": "synthetic"}, input_sha256="4"*64))
        await tx.flush()
        run = TaskRun(**c["binding"], id=str(uuid4()), task_id=task.id, status="running",
            model=schema.MODEL, effort=schema.EFFORT, adapter_revision=schema.ADAPTER, usage=None, cost_microusd=None)
        task.status, task.run_id, task.lease_until = "running", run.id, utcnow()+timedelta(seconds=120)
        tx.add(run)
        await tx.flush()
        return task.id, run.id


def attempt(c, task, run, *, ordinal=1, role="researcher", **changes):
    fields = dict(c["binding"], id=str(uuid4()), authorization_id=c["authorization"]["id"], task_id=task, run_id=run,
        ordinal=ordinal, role=role, packet={"synthetic": True}, packet_sha256="5"*64, instruction_sha256="6"*64,
        model=schema.MODEL, effort=schema.EFFORT, source_revision=settings().control_source_revision,
        state="reserved", usage=None, output=None, finished_at=None)
    return ModelAttempt(**(fields | changes))


async def reserve(c, task, run, **changes):
    row = attempt(c, task, run, **changes)
    async with actor(c) as tx:
        tx.add(row)
        await tx.flush()
    return row.id


async def settle(c, aid, run, *, state="succeeded", usage=None, output=None, **identity):
    async with actor(c) as tx:
        return await tx.scalar(text("SELECT acquisition_model_settle_attempt(:a,:r,:u,:e,:s,:st,CAST(:j AS jsonb),CAST(:o AS jsonb))"),
            dict(a=aid, r=run, u=c["binding"]["user_id"], e=c["environment"], s=settings().control_source_revision,
                st=state, j=json.dumps(usage) if usage is not None else None,
                o=json.dumps(output) if output is not None else None) | identity)


async def run_usage(c, task, run, **identity):
    async with actor(c) as tx:
        return await tx.scalar(text("SELECT acquisition_model_run_usage(:t,:r,:u,:e,:s)"),
            dict(t=task, r=run, u=c["binding"]["user_id"], e=c["environment"], s=settings().control_source_revision) | identity)


async def settle_task(c, task, run, tokens=None, **identity):
    async with actor(c) as tx:
        return await tx.scalar(text("SELECT acquisition_model_settle_task(:t,:r,:u,:e,:s,CAST(:j AS jsonb),:eid)"),
            dict(t=task, r=run, u=c["binding"]["user_id"], e=c["environment"], s=settings().control_source_revision,
                j=json.dumps(tokens) if tokens is not None else None, eid=str(uuid4())) | identity)


async def revoke(c, kind):
    statements = {
        "grant": "UPDATE control_business_grants SET enabled=false WHERE business_id=:b AND environment_id=:e",
        "membership": "UPDATE control_memberships SET enabled=false WHERE user_id=:u AND environment_id=:e",
        "session": "UPDATE control_sessions SET revoked_at=clock_timestamp() WHERE id=:s",
        "authorization": "UPDATE acquisition_model_authorizations SET enabled=false WHERE id=:a",
        "module": "UPDATE acquisition_modules SET enabled=false WHERE business_id=:b AND environment_id=:e",
    }
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text(statements[kind]), dict(b=c["binding"]["business_id"], e=c["environment"],
            u=c["binding"]["user_id"], s=c["request"]["authorizing_session_id"], a=c["authorization"]["id"]))


async def test_model_schema_columns_acl_and_privileged_helpers(model_case):
    c = model_case
    async with actor(c) as tx:
        for model in (ModelAuthorization, ModelTaskBinding, ModelAttempt):
            table = model.__tablename__
            columns = list(await tx.scalars(text("SELECT attname FROM pg_attribute WHERE attrelid=to_regclass(:t) AND attnum>0 AND NOT attisdropped"), {"t": table}))
            assert set(columns) == set(model.__table__.columns.keys())
            assert await tx.scalar(text("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=to_regclass(:t)"), {"t": table})
            privileges = (await tx.execute(text("SELECT has_table_privilege(current_user,:t,'SELECT'),has_table_privilege(current_user,:t,'INSERT'),has_table_privilege(current_user,:t,'UPDATE'),has_table_privilege(current_user,:t,'DELETE')"), {"t": table})).one()
            assert tuple(privileges) == (True, model is not ModelAuthorization, False, False)
        helpers = (await tx.execute(text("""SELECT p.proname,p.prosecdef,p.proconfig,
          has_function_privilege(current_user,p.oid,'EXECUTE') AS allowed,
          EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public
          FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname LIKE 'acquisition_model_%'"""))).mappings().all()
        assert len(helpers) == 7
        for row in helpers:
            assert row["proconfig"] == ["search_path=pg_catalog, public"] and not row["public"]
            assert row["allowed"] == (row["proname"] in {"acquisition_model_settle_attempt", "acquisition_model_run_usage", "acquisition_model_settle_task"})
            if row["allowed"]:
                assert row["prosecdef"]


async def test_valid_pre_io_receipts_role_orders_and_unknown_usage(model_case):
    c = model_case
    for roles in (("researcher", "reviewer"), ("researcher", "writer", "reviewer")):
        task, run = await queued_run(c)
        for ordinal, role in enumerate(roles, 1):
            aid = await reserve(c, task, run, ordinal=ordinal, role=role)
            projection = await run_usage(c, task, run)
            assert projection["model_calls"] == ordinal and projection["unknown_usage_calls"] == 1
            usage = {"known": True, "tokens": {"input_tokens": 10, "output_tokens": 3}}
            assert await settle(c, aid, run, usage=usage, output={"synthetic": role})
            assert await settle(c, aid, run, usage=usage, output={"synthetic": role})
            assert not await settle(c, aid, run, usage=usage, output={"conflict": True})
        assert await run_usage(c, task, run) == dict(usage={"input_tokens": 10*len(roles), "output_tokens": 3*len(roles)},
            model_calls=len(roles), settled_calls=len(roles), unknown_usage_calls=0, usage_complete=True)
    task, run = await queued_run(c)
    aid = await reserve(c, task, run)
    assert await settle(c, aid, run, state="failed")
    assert await run_usage(c, task, run) == dict(usage=None, model_calls=1, settled_calls=1, unknown_usage_calls=1, usage_complete=False)
    async with actor(c) as tx:
        assert (await tx.execute(text("SELECT usage IS NULL,output IS NULL FROM acquisition_model_attempts WHERE id=:id"), {"id": aid})).one() == (True, True)


async def test_wrong_role_exact_tuple_pending_failed_and_replay_never_reserve(model_case):
    c = model_case
    task, run = await queued_run(c)
    for changes in ({"role": "reviewer"}, {"ordinal": 2}, {"source_revision": "b"*40}, {"run_id": str(uuid4())},
            {"model": "other"}, {"packet": []}, {"packet": {"oversize": "x"*262144}}, {"packet_sha256": "x"*64},
            {"usage": {"known": True, "tokens": {"input_tokens": 0}}}):
        with pytest.raises(DBAPIError):
            async with actor(c) as tx:
                tx.add(attempt(c, task, run, **changes))
                await tx.flush()
    aid = await reserve(c, task, run)
    for changes in ({}, {"ordinal": 2, "role": "writer"}):
        with pytest.raises(DBAPIError):
            await reserve(c, task, run, **changes)
    assert await settle(c, aid, run, state="failed")
    with pytest.raises(DBAPIError):
        await reserve(c, task, run, ordinal=2, role="reviewer")
    assert (await run_usage(c, task, run))["model_calls"] == 1


async def test_malformed_usage_outputs_and_foreign_accounting_are_refused(model_case):
    c = model_case
    task, run = await queued_run(c)
    aid = await reserve(c, task, run)
    malformed = [[], {}, {"known": False, "tokens": {"input_tokens": 1}}, {"known": True, "tokens": {}},
        {"known": True, "tokens": {"input_tokens": True}}, {"known": True, "tokens": {"input_tokens": -1}},
        {"known": True, "tokens": {"input_tokens": 1.5}}, {"known": True, "tokens": {"input_tokens": 1000000001}},
        {"known": True, "tokens": {"private": 1}}, {"known": True, "tokens": {"input_tokens": 1}, "output": "leak"}]
    for usage in malformed:
        assert not await settle(c, aid, run, usage=usage, output={"safe": True})
    for output in ([], {"large": "x"*131072}):
        assert not await settle(c, aid, run, output=output)
    assert not await settle(c, aid, run, state="failed", output={"forbidden": True})
    for change in ({"a": str(uuid4())}, {"r": str(uuid4())}, {"u": str(uuid4())}, {"e": "test-foreign"}, {"s": "b"*40}):
        assert not await settle(c, aid, run, output={"safe": True}, **change)
    for change in ({"t": str(uuid4())}, {"r": str(uuid4())}, {"u": str(uuid4())}, {"e": "test-foreign"}, {"s": "b"*40}):
        assert await run_usage(c, task, run, **change) is None
    assert await settle(c, aid, run, usage={"known": True, "tokens": {"cached_input_tokens": 0}}, output={})


@pytest.mark.parametrize("change", ["grant", "membership", "session", "authorization", "module", "source"])
async def test_revocation_hides_outputs_but_exact_failed_usage_settles(model_case, change):
    c = model_case
    task, run = await queued_run(c)
    aid = await reserve(c, task, run)
    if change != "source":
        await revoke(c, change)
    else:
        # Current-source signal comes from Root's clean-source observation.
        settings().control_source_revision = "b"*40
    usage = {"known": True, "tokens": {"input_tokens": 27, "output_tokens": 4}}
    identity = {"s": "a"*40}
    assert not await settle(c, aid, run, usage=usage, output={"stale": True}, **identity)
    assert await settle(c, aid, run, state="failed", usage=usage, **identity)
    assert await settle(c, aid, run, state="failed", usage=usage, **identity)
    projection = await run_usage(c, task, run, **identity)
    assert projection == dict(usage=usage["tokens"], model_calls=1, settled_calls=1, unknown_usage_calls=0, usage_complete=True)
    async with actor(c) as tx:
        visible = await tx.scalar(select(func.count()).select_from(ModelAttempt).where(ModelAttempt.id == aid))
        assert visible == (0 if change in {"grant", "membership"} else 1)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(ModelAttempt, aid)
        assert row.state == "failed" and row.output is None and row.usage == usage


async def test_authorization_binding_and_parent_metadata_are_immutable(model_case):
    c = model_case
    task, run = await queued_run(c)
    statements = [
        ("UPDATE acquisition_model_authorizations SET maximum_attempts=1 WHERE id=:id", c["authorization"]["id"]),
        ("UPDATE acquisition_model_task_bindings SET input='{}'::jsonb WHERE task_id=:id", task),
        ("UPDATE control_tasks SET source_revision=:v WHERE id=:id", task),
        ("UPDATE control_tasks SET session_id=:v WHERE id=:id", task),
        ("UPDATE control_tasks SET run_id=NULL WHERE id=:id", task),
        ("UPDATE control_task_runs SET model=:v WHERE id=:id", run),
        ("DELETE FROM acquisition_model_authorizations WHERE id=:id", c["authorization"]["id"]),
    ]
    for statement, identifier in statements:
        with pytest.raises(DBAPIError):
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(text(statement), {"id": identifier, "v": "b"*40})
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id == task).values(event_sequence=2, updated_at=utcnow()))
        await tx.execute(update(TaskRun).where(TaskRun.id == run).values(usage={"input_tokens": 3}))
    await revoke(c, "authorization")
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(text("UPDATE acquisition_model_authorizations SET enabled=true WHERE id=:id"), {"id": c["authorization"]["id"]})


async def test_runtime_cannot_mint_mutate_or_read_foreign_model_records(model_case):
    c = model_case
    task,run = await queued_run(c)
    aid = await reserve(c,task,run)
    with pytest.raises(DBAPIError, match="permission denied"):
        async with actor(c) as tx:
            tx.add(ModelAuthorization(**(c["authorization"] | {"id":str(uuid4())})))
            await tx.flush()
    for table,key,value in ((schema.TABLE_TASK,"task_id",task),(schema.TABLE_ATTEMPT,"id",aid)):
        for operation in (f"DELETE FROM {table} WHERE {key}=:id", f"UPDATE {table} SET authorization_id=authorization_id WHERE {key}=:id"):
            with pytest.raises(DBAPIError, match="permission denied"):
                async with actor(c) as tx:
                    await tx.execute(text(operation),{"id":value})
    for user in ("",str(uuid4())):
        async with actor(c,user=user) as tx:
            for model in (ModelAuthorization,ModelTaskBinding,ModelAttempt):
                assert await tx.scalar(select(func.count()).select_from(model)) == 0
            assert await tx.scalar(text("SELECT acquisition_model_run_usage(:t,:r,:u,:e,:s)"),
                dict(t=task,r=run,u=c["binding"]["user_id"],e=c["environment"],s=settings().control_source_revision)) is None
    with pytest.raises(DBAPIError,match="one-shot bound model Run required"):
        async with actor(c) as tx:
            tx.add(TaskRun(**c["binding"],id=str(uuid4()),task_id=task,status="running",
                model=schema.MODEL,effort=schema.EFFORT,adapter_revision=schema.ADAPTER))
            await tx.flush()


async def test_new_kind_requires_business_and_session_old_capture_still_null(model_case):
    c = model_case
    for change in ({"business": False}, {"session": False}):
        with pytest.raises(DBAPIError):
            async with actor(c) as tx:
                await native_parent(c, tx, **change)
                await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    async with actor(c) as tx:
        await native_parent(c, tx, kind="acquisition.reviewed_capture", session=False)
        await native_parent(c, tx, kind="chat.consult")
        await native_parent(c, tx, kind="workspace.team_turn")
        await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    for change in ({"kind": "acquisition.reviewed_capture", "session": True},
            {"kind": "chat.consult", "session": False}, {"kind": "workspace.team_turn", "business": False},
            {"kind": "workspace.direct_turn", "business": False}):
        with pytest.raises(DBAPIError):
            async with actor(c) as tx:
                await native_parent(c, tx, **change)
                await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))


async def test_global_authorization_cap_serializes_across_tasks(model_case):
    c = model_case
    # New explicit immutable authorization, no budget mutation of existing row.
    values = c["authorization"] | {"id": str(uuid4()), "maximum_attempts": 1}
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        tx.add(ModelAuthorization(**values))
    c["authorization"] = values
    one, two = await queued_run(c), await queued_run(c)
    async def reserve_one(parent):
        try:
            return await reserve(c, *parent)
        except DBAPIError as error:
            assert "model authorization exhausted" in str(error)
            return None
    outcomes = await asyncio.gather(reserve_one(one), reserve_one(two))
    assert sum(value is not None for value in outcomes) == 1
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(ModelAttempt).where(ModelAttempt.authorization_id == values["id"])) == 1


async def test_reservation_rechecks_db_clock_after_wait_for_authorization(model_case):
    c = model_case
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        values = c["authorization"] | {"id": str(uuid4()), "approved_at": now, "expires_at": now+timedelta(seconds=2)}
        tx.add(ModelAuthorization(**values))
    c["authorization"] = values
    parent = await queued_run(c)
    async with AsyncSession(c["admin"]) as held, held.begin():
        await held.execute(text("SELECT 1 FROM acquisition_model_authorizations WHERE id=:id FOR UPDATE"), {"id": values["id"]})
        pending = asyncio.create_task(reserve(c, *parent))
        await asyncio.sleep(.2)
        assert not pending.done()
        # Server clock/lock wait is the behavior under test; no model IO.
        await held.execute(text("SELECT pg_sleep(2)"))
    with pytest.raises(DBAPIError, match="current exact model authority required"):
        await pending
    assert (await run_usage(c, *parent))["model_calls"] == 0


async def test_old_director_refuses_new_kind_and_typed_task_settlement_is_required(model_case):
    c = model_case
    task, run = await queued_run(c)
    aid = await reserve(c, task, run)
    await revoke(c, "grant")
    async with actor(c) as tx:
        assert not await tx.scalar(text("SELECT director_settle_revoked_task(:t,:r,:u,:e,:s,:k,NULL,:eid)"),
            dict(t=task,r=run,u=c["binding"]["user_id"],e=c["environment"],s=settings().control_source_revision,
                k=schema.KIND,eid=str(uuid4())))
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task,task)).status == (await tx.get(TaskRun,run)).status == "running"
    assert await settle(c, aid, run, state="failed", usage={"known": True, "tokens": {"input_tokens": 7}})
    assert await settle_task(c,task,run,{"input_tokens": 8})
    assert await settle_task(c,task,run,{"input_tokens": 8})
    async with AsyncSession(c["admin"]) as tx:
        t,r = await tx.get(Task,task),await tx.get(TaskRun,run)
        assert t.status == r.status == "failed" and t.failure_code == "authorization_revoked"
        assert t.result is None and t.lease_until is None and r.cost_microusd is None
        assert r.usage == dict(input_tokens=8,model_calls=1,settled_calls=1,unknown_usage_calls=0,usage_complete=True)
        assert await tx.scalar(text("SELECT count(*) FROM control_task_events WHERE task_id=:t"), {"t":task}) == 1


async def test_typed_task_settlement_rejects_foreign_counts_and_success_history(model_case):
    c = model_case
    task,run = await queued_run(c)
    await reserve(c,task,run)
    for tokens in ([], {"model_calls":0}, {"input_tokens":-1}, {"input_tokens":True}, {"input_tokens":1.5}, {"input_tokens":30000000001}):
        assert not await settle_task(c,task,run,tokens)
    for identity in ({"t":str(uuid4())},{"r":str(uuid4())},{"u":str(uuid4())},{"e":"foreign"},{"s":"b"*40},{"eid":"bad"}):
        assert not await settle_task(c,task,run,**identity)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status="succeeded",result={"keep":True},lease_until=None))
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status="succeeded",finished_at=utcnow()))
    assert not await settle_task(c,task,run)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task,task)).result == {"keep":True}


@pytest.mark.parametrize("terminal",["failed","cancelled"])
async def test_terminal_task_reconciliation_keeps_state_event_and_known_usage(model_case, terminal):
    c = model_case
    task,run = await queued_run(c)
    aid = await reserve(c,task,run)
    assert await settle(c,aid,run,state="failed",usage={"known":True,"tokens":{"input_tokens":7}})
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status=terminal,failure_code="existing_terminal",
            event_sequence=1,lease_until=None))
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status=terminal,finished_at=utcnow(),
            usage={"input_tokens":9,"model_calls":999}))
        tx.add(TaskEvent(**c["binding"],id=str(uuid4()),task_id=task,sequence=1,status=terminal,failure_code="existing_terminal"))
    await revoke(c,"membership")
    settings().control_source_revision="b"*40
    assert await settle_task(c,task,run,{"input_tokens":8},s="a"*40)
    async with AsyncSession(c["admin"]) as tx:
        before=(await tx.execute(text("SELECT xmin::text,finished_at FROM control_task_runs WHERE id=:r"),{"r":run})).one()
    assert await settle_task(c,task,run,s="a"*40)
    async with AsyncSession(c["admin"]) as tx:
        t,r=await tx.get(Task,task),await tx.get(TaskRun,run)
        assert t.status==r.status==terminal and t.failure_code=="existing_terminal"
        assert r.usage==dict(input_tokens=9,model_calls=1,settled_calls=1,unknown_usage_calls=0,usage_complete=True)
        assert await tx.scalar(select(func.count()).select_from(TaskEvent).where(TaskEvent.task_id==task))==1
        assert (await tx.execute(text("SELECT xmin::text,finished_at FROM control_task_runs WHERE id=:r"),{"r":run})).one()==before


async def test_unknown_interrupted_task_usage_keeps_reservation_counts(model_case):
    c=model_case
    task,run=await queued_run(c)
    await reserve(c,task,run)
    await revoke(c,"session")
    assert await settle_task(c,task,run)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(TaskRun,run)).usage==dict(model_calls=1,settled_calls=0,unknown_usage_calls=1,usage_complete=False)
