"""Restricted SQL profile binding/fences, actual UI admission and provider-zero roles."""
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_team import runner, team_read
from test_customer_creations import creation as creation_fixture
from test_customer_creations import start
from test_customer_public import customers, verified  # noqa: F401
from test_site_build import build as build_fixture

from pinet_core.config import settings
from pinet_core.control.routes import scope
from pinet_core.creation import adapter, team, worker
from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation.execution_profile_models import PipelineModelProfile
from pinet_core.creation.models import Attempt, Creation, Job

creation = creation_fixture
build = build_fixture


async def test_new_pipeline_profile_binding_storage_is_available(creation):
    async with scope() as tx:
        assert await tx.scalar(text("SELECT to_regclass('control_pipeline_model_profiles') IS NOT NULL"))


async def test_schema_state_reads_one_fresh_catalog_statement_per_invocation(creation):
    async with scope() as tx:
        connection = await tx.connection()
        observed = []
        def statement(conn, cursor, sql, parameters, context, executemany):
            observed.append(sql)
        event.listen(connection.sync_connection, "before_cursor_execute", statement)
        try:
            assert await profiles.schema_state(tx) == "ready"
            assert len(observed) == 1
            observed.clear()
            assert await profiles.schema_state(tx) == "ready"
            assert len(observed) == 1, "A completed catalog result cannot authorize the next observation"
        finally:
            event.remove(connection.sync_connection, "before_cursor_execute", statement)


@pytest.mark.parametrize("failed_role", [None, "critic"])
async def test_local_profile_real_admission_reservation_and_receipts_match(creation, monkeypatch, failed_role):
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(settings(), "creation_language_review_enabled", False)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me, canonical_host=uuid4().hex+".example.test")
    cid = row["creation_id"]
    async with scope(user=me["user_id"]) as tx:
        bound = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.creation_job_id == row["active_job_id"]))
        assert bound and bound.profile == profiles.SOL_HIGH
        assert bound.source_revision == settings().control_source_revision
        privileges = (await tx.execute(text("SELECT has_table_privilege(current_user,'control_pipeline_model_profiles','SELECT'),"
            "has_table_privilege(current_user,'control_pipeline_model_profiles','INSERT'),"
            "has_table_privilege(current_user,'control_pipeline_model_profiles','UPDATE')"))).one()
        assert tuple(privileges) == (True, False, False)
    base = runner([])
    async def role(context, authorized, **kwargs):
        async with scope(user=me["user_id"]) as tx:
            reserved = await tx.scalar(select(Attempt).where(Attempt.creation_id == cid).order_by(Attempt.sequence.desc()))
            assert reserved.model == "gpt-6.1-sol"
            assert context["_expected_execution"] == {"model": reserved.model,
                "reasoning_effort": "high", "instruction_hash": reserved.instruction_hash}
        if kwargs["role"] == failed_role:
            raise adapter.RunnerError("provider_error", {"model": "gpt-6.1-sol", "reasoning_effort": "high",
                "usage": {"input_tokens": 1, "output_tokens": 1}})
        value, receipt = await base(context, authorized, **kwargs)
        return value, {**receipt, "model": "gpt-6.1-sol", "reasoning_effort": "high"}
    assert await worker.execute_once(role_runner=role, creation_id=cid)
    view = await team_read(c, auth, cid)
    assert [attempt["model"] for attempt in view["attempts"]] == ["gpt-6.1-sol"]*(2 if failed_role else 3)
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(Job, row["active_job_id"])
        assert job.model == job.usage["model"] == "gpt-6.1-sol"
        assert all(item["reasoning_effort"] == "high" for item in job.usage["attempts"])


@pytest.mark.parametrize("point", ["queued", "claimed"])
async def test_profile_config_drift_rejects_before_new_reservation(creation, monkeypatch, point):
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    claim = await worker.claim(creation_id=row["creation_id"]) if point == "claimed" else None
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    with pytest.raises(adapter.RunnerError, match="instructions_changed"):
        if claim:
            await team.reserve(claim, "creator", 1)
        else:
            await worker.claim(creation_id=row["creation_id"])
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Attempt).where(Attempt.creation_id == row["creation_id"])) == 0


@pytest.mark.parametrize("fault", ["missing", "capture_disabled", "fence_disabled"])
async def test_missing_or_malformed_profile_schema_refuses_admission(creation, monkeypatch, fault):
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    _, auth, me = await verified(c)
    change, restore = {
        "missing": ("ALTER TABLE control_pipeline_model_profiles RENAME TO qa_missing_pipeline_profiles",
            "ALTER TABLE qa_missing_pipeline_profiles RENAME TO control_pipeline_model_profiles"),
        "capture_disabled": ("ALTER TABLE control_creation_jobs DISABLE TRIGGER pipeline_model_profile_capture",
            "ALTER TABLE control_creation_jobs ENABLE TRIGGER pipeline_model_profile_capture"),
        "fence_disabled": ("ALTER TABLE control_creation_attempts DISABLE TRIGGER pipeline_model_attempt_fence",
            "ALTER TABLE control_creation_attempts ENABLE TRIGGER pipeline_model_attempt_fence")}[fault]
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text(change))
    try:
        response = await c["client"].post("/customer/v2/creations", headers=auth, json={
            "portfolio_id": me["portfolios"][0]["portfolio_id"], "display_name": "Bandomasis verslas",
            "idea": "Sukurkite bandomojo pasiūlymo svetainės juodraštį.",
            "canonical_host": None,
            "idempotency_key": str(uuid4())})
        assert response.status_code == 503, response.text
        async with AsyncSession(c["admin"]) as tx:
            assert await tx.scalar(select(func.count()).select_from(Job).where(Job.user_id == me["user_id"])) == 0
            assert await tx.scalar(select(func.count()).select_from(Creation).where(Creation.user_id == me["user_id"])) == 0
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(text(restore))


async def test_sparse_profile_is_immutable_and_cannot_be_added_to_old_default_job(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    old, _ = await start(c, auth, me)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    new, _ = await start(c, auth, me)
    async with scope(user=me["user_id"]) as tx:
        old_job, new_job = await tx.get(Job, old["active_job_id"]), await tx.get(Job, new["active_job_id"])
        assert await profiles.stored(tx, "creation", old_job) == profiles.DEFAULT
        assert await profiles.stored(tx, "creation", new_job) == profiles.SOL_HIGH
        record = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.creation_job_id == new_job.id))
        values = {column.name: getattr(record, column.name) for column in record.__table__.columns}
    with pytest.raises(DBAPIError):
        async with scope(user=me["user_id"]) as tx:
            tx.add(PipelineModelProfile(**{**values, "id": str(uuid4()), "creation_job_id": old_job.id}))
            await tx.flush()
    with pytest.raises(DBAPIError, match="immutable pipeline model profile"):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(PipelineModelProfile).where(PipelineModelProfile.id == record.id).values(source_revision="f"*40))
    claim = await worker.claim(creation_id=new["creation_id"])
    identifier = await team.reserve(claim, "creator", 1)
    async with scope(user=me["user_id"]) as tx:
        attempt = await tx.get(Attempt, identifier)
        copied = {column.name: getattr(attempt, column.name) for column in attempt.__table__.columns}
    for model in ("gpt-6-luna", "customer-selected"):
        with pytest.raises(DBAPIError):
            async with scope(user=me["user_id"]) as tx:
                tx.add(Attempt(**{**copied, "id": str(uuid4()), "sequence": 2, "role": "critic", "model": model}))
                await tx.flush()
    with pytest.raises(DBAPIError):
        async with scope(user=me["user_id"]) as tx:
            tx.add(Attempt(**{**copied, "id": str(uuid4()), "sequence": 2, "source_revision": "f"*40}))
            await tx.flush()
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    with pytest.raises(DBAPIError):
        async with scope(user=me["user_id"]) as tx:
            tx.add(Attempt(**{**copied, "id": str(uuid4()), "sequence": 1,
                "creation_id": old["creation_id"], "job_id": old["active_job_id"],
                "run_id": str(uuid4()), "model": "gpt-6.1-sol"}))
            await tx.flush()


async def test_old_default_history_keeps_exact_rows_when_local_test_profile_is_selected(creation, monkeypatch):
    import hashlib
    import json
    c = creation
    _, auth, me = await verified(c)
    old, _ = await start(c, auth, me)
    assert await worker.execute_once(role_runner=runner([]), creation_id=old["creation_id"])
    async def snapshot():
        async with AsyncSession(c["admin"]) as tx:
            data = []
            for table in ("control_creation_jobs", "control_creation_attempts", "control_creation_revisions", "control_creation_team_events"):
                data.append(list(await tx.scalars(text(f"SELECT to_jsonb(r)::text FROM {table} r WHERE environment_id=:e ORDER BY id"),
                    {"e": c["environment"]})))
            return hashlib.sha256(json.dumps(data).encode()).hexdigest()
    before, first = await snapshot(), await team_read(c, auth, old["creation_id"])
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    assert await team_read(c, auth, old["creation_id"]) == first
    assert await snapshot() == before
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(PipelineModelProfile)) == 0


async def test_all_three_pipeline_stages_reserve_bound_sol_high_and_project_native_output(build, monkeypatch):
    from test_site_build import approved, business_roles, roles

    from pinet_core.business_discovery.models import DiscoveryAttempt
    from pinet_core.content_work import worker as guides
    from pinet_core.content_work.models import GuideAttempt
    from pinet_core.creation import studio
    from pinet_core.site_build import worker as builds
    c = build
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    cid, auth = await approved(c)
    first = await builds.tick(cid, creation_role_runner=business_roles(), intake_runner=studio.import_draft)
    assert first["executed"] and first["state"] == "queued"
    assert await guides.execute_once(creation_id=cid, role_runner=roles())
    view = await c["client"].get(f"/customer/v2/creations/{cid}/content-work", headers=auth)
    assert view.status_code == 200, view.text
    job = view.json()["data"]["items"][0]
    assert job["status"] == "succeeded"
    assert [row["model"] for row in job["attempts"]] == ["gpt-6.1-sol"]*3
    assert job["page_observation"] and job["output_sha256"]
    async with AsyncSession(c["admin"]) as tx:
        for model in (DiscoveryAttempt, Attempt, GuideAttempt):
            rows = list(await tx.scalars(select(model.model).where(model.environment_id == c["environment"])))
            assert rows == ["gpt-6.1-sol"]*3
        bindings = list(await tx.scalars(select(PipelineModelProfile).where(PipelineModelProfile.environment_id == c["environment"])))
        assert len(bindings) == 3 and all(row.profile == profiles.SOL_HIGH for row in bindings)
    # Explicit body attempts to choose a model remain invalid ordinary API input.
    me = (await c["client"].get("/customer/v1/me", headers=auth)).json()["data"]
    denied = await c["client"].post("/customer/v2/discoveries", headers=auth, json={
        "portfolio_id": me["portfolios"][0]["portfolio_id"], "idempotency_key": str(uuid4()),
        "message": "Sukurkite bandomojo verslo planą.", "model": "gpt-6.1-sol"})
    assert denied.status_code == 400


async def test_missing_binding_source_or_parent_cannot_authorize_a_profile_attempt(creation, monkeypatch):
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    claim = await worker.claim(creation_id=row["creation_id"])
    async with AsyncSession(c["admin"]) as tx:
        bound = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.creation_job_id == claim["job_id"]))
        before = {column.name: getattr(bound, column.name) for column in bound.__table__.columns}
    # Even QA admin cannot mutate a binding. Use an explicitly restored owned
    # trigger fault only to prove the reader's source/parent revalidation.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text("ALTER TABLE control_pipeline_model_profiles DISABLE TRIGGER pipeline_model_profile_immutable"))
        await tx.execute(update(PipelineModelProfile).where(PipelineModelProfile.id == bound.id).values(source_revision="f"*40))
        await tx.execute(text("ALTER TABLE control_pipeline_model_profiles ENABLE TRIGGER pipeline_model_profile_immutable"))
    try:
        with pytest.raises(adapter.RunnerError, match="instructions_changed"):
            await team.reserve(claim, "creator", 1)
        async with AsyncSession(c["admin"]) as tx:
            assert await tx.scalar(select(func.count()).select_from(Attempt).where(Attempt.creation_id == row["creation_id"])) == 0
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(text("ALTER TABLE control_pipeline_model_profiles DISABLE TRIGGER pipeline_model_profile_immutable"))
            await tx.execute(update(PipelineModelProfile).where(PipelineModelProfile.id == bound.id).values(source_revision=before["source_revision"]))
            await tx.execute(text("ALTER TABLE control_pipeline_model_profiles ENABLE TRIGGER pipeline_model_profile_immutable"))


async def migrate(c, direction, target):
    import asyncio
    import sys
    from pathlib import Path
    assert c["admin"].url.database.startswith("pinet_pipeline_profile_qa_")
    process = await asyncio.create_subprocess_exec(sys.executable, "-m", "alembic", direction, target,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    output, _ = await process.communicate()
    Path("artifacts/s8-profile/migration-test-"+uuid4().hex+".log").write_bytes(output)
    return process.returncode, output


async def test_retained_selected_profile_blocks_downgrade_without_history_change(creation, monkeypatch):
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    async with scope(user=me["user_id"]) as tx:
        before = list(await tx.scalars(text("SELECT to_jsonb(p)::text FROM control_pipeline_model_profiles p ORDER BY id")))
    code, output = await migrate(c, "downgrade", "0037_selected_work_candidates")
    assert code != 0 and b"Retained pipeline model profiles cannot be downgraded" in output
    async with scope(user=me["user_id"]) as tx:
        assert list(await tx.scalars(text("SELECT to_jsonb(p)::text FROM control_pipeline_model_profiles p ORDER BY id"))) == before
        assert await profiles.stored(tx, "creation", await tx.get(Job, row["active_job_id"])) == profiles.SOL_HIGH


async def test_additive_schema_and_rollback_preserve_physical_default_rows(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    assert await worker.execute_once(role_runner=runner([]), creation_id=row["creation_id"])
    async def snapshot():
        async with AsyncSession(c["admin"]) as tx:
            result = []
            for table in ("control_creation_jobs", "control_creation_attempts", "control_creation_revisions", "control_creation_team_events"):
                result.append(list(await tx.scalars(text(f"SELECT to_jsonb(r)::text FROM {table} r WHERE environment_id=:e ORDER BY id"),
                    {"e": c["environment"]})))
            return result
    before = await snapshot()
    try:
        code, _ = await migrate(c, "downgrade", "0037_selected_work_candidates")
        assert code == 0 and await snapshot() == before
        async with scope(user=me["user_id"]) as tx:
            assert await profiles.schema_state(tx) == "absent"
            assert await profiles.stored(tx, "creation", await tx.get(Job, row["active_job_id"])) == profiles.DEFAULT
        assert [item["model"] for item in (await team_read(c, auth, row["creation_id"]))["attempts"]] == [
            "gpt-6-luna", "gpt-6.1-sol", "gpt-6.1-sol"]
    finally:
        code, _ = await migrate(c, "upgrade", "head")
        assert code == 0
    assert await snapshot() == before


@pytest.mark.parametrize("change", ["source", "session"])
@pytest.mark.parametrize("attempt_model", ["gpt-6-luna", "gpt-6.1-sol"])
async def test_retained_binding_never_falls_back_after_parent_source_or_session_drift(creation, monkeypatch, change, attempt_model):
    from datetime import timedelta

    from pinet_core.control.models import Session
    from pinet_core.control.routes import token_hash
    from pinet_core.creation.service import binding
    from pinet_core.models import utcnow
    c = creation
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(Job, row["active_job_id"])
        fields = binding(job)
        original_session = job.session_id
    source = settings().control_source_revision
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "source":
            source = "f"*40
            await tx.execute(update(Job).where(Job.id == row["active_job_id"]).values(source_revision=source))
        else:
            identity = str(uuid4())
            tx.add(Session(id=identity, user_id=me["user_id"], environment_id=c["environment"],
                token_hash=token_hash(uuid4().hex+uuid4().hex), expires_at=utcnow()+timedelta(hours=1)))
            await tx.flush()
            await tx.execute(update(Job).where(Job.id == row["active_job_id"]).values(session_id=identity))
    with pytest.raises(DBAPIError, match="bound pipeline role model required"):
        async with scope(user=me["user_id"]) as tx:
            tx.add(Attempt(id=str(uuid4()), creation_id=row["creation_id"], job_id=row["active_job_id"],
                run_id=str(uuid4()), sequence=1, role="critic", round_number=1, stage="private_draft",
                source_revision=source, instruction_hash="b"*64, model=attempt_model, **fields))
            await tx.flush()
    async with AsyncSession(c["admin"]) as tx:
        stored = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.creation_job_id == row["active_job_id"]))
        assert stored.source_revision == settings().control_source_revision and stored.session_id == original_session


@pytest.mark.parametrize("choice", ["local_sol61_high_v1", "customer-selected"])
async def test_invalid_deployment_profile_does_not_leave_an_admitted_parent(creation, monkeypatch, choice):
    c = creation
    _, auth, me = await verified(c)
    monkeypatch.setattr(settings(), "creation_execution_profile", choice)
    if choice == profiles.SOL_HIGH:
        monkeypatch.setattr(settings(), "control_mode", "hosted")
    async with scope(user=me["user_id"]) as tx:
        from pinet_core.control.models import Session
        from pinet_core.control.routes import ControlError, token_hash
        from pinet_core.creation.service import create_own
        from pinet_core.creation.wire import Start
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        with pytest.raises(ControlError) as error:
            await create_own(tx, session, Start(portfolio_id=me["portfolios"][0]["portfolio_id"],
                display_name="Bandomasis verslas", idea="Sukurkite bandomojo pasiūlymo svetainės juodraštį.",
                canonical_host=None, idempotency_key=uuid4()))
        assert error.value.code == "creation_unavailable"
        assert await tx.scalar(select(func.count()).select_from(Creation).where(Creation.user_id == me["user_id"])) == 0
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Job).where(Job.user_id == me["user_id"])) == 0
