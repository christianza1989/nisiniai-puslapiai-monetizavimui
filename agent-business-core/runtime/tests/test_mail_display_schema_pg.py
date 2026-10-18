"""Opt-in own isolated PG: native verified owner, synthetic Mail, zero providers."""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import verified
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Portfolio, Session
from pinet_core.control.routes import scope, token_hash
from pinet_core.mail_view import task_schema as s
from pinet_core.mail_view.task_models import DisplayJob, DisplayPolicy
from pinet_core.mail_view.translations import POLICY_SHA, source_digest
from pinet_core.models import Business, Case, MailMessage, utcnow
from pinet_core.tasks.models import Task, TaskEvent, TaskRun, Thread

pytestmark=pytest.mark.skipif(os.environ.get("PINET_MAIL_DISPLAY_SCHEMA_QA")!="1",
    reason="Requires NEW labelled own isolated PG QA; retains immutable synthetic history")


@pytest.fixture
async def actor_case(preview):  # noqa: F811
    c=preview
    _,headers,me=await verified(c)
    async with AsyncSession(c["admin"],expire_on_commit=False) as tx,tx.begin():
        p=await tx.get(Portfolio,me["portfolios"][0]["portfolio_id"])
        session=await tx.scalar(select(Session).where(Session.token_hash==token_hash(headers["Authorization"].split()[1])))
        business=Business(id=str(uuid4()),site_id="display-qa-"+uuid4().hex,canonical_host=uuid4().hex+".invalid")
        tx.add(business)
        await tx.flush()
        grant=BusinessGrant(id=str(uuid4()),environment_id=c["environment"],business_id=business.id,
            organization_id=p.organization_id,portfolio_id=p.id,display_name="Synthetic display QA",evidence_revision="synthetic",enabled=True)
        tx.add(grant)
        case=Case(id=str(uuid4()),business_id=business.id,environment_id=c["environment"],payload={"synthetic":True})
        tx.add(case)
        await tx.flush()
        mail=MailMessage(id=str(uuid4()),business_id=business.id,environment_id=c["environment"],case_id=case.id,
            message_id="<"+uuid4().hex+"@example.com>",direction="outbound",state="captured",
            payload={"subject":"Synthetic display","body":"Synthetic body 10 EUR.","sender":"owner@example.com","recipient":"client@example.com","synthetic":True})
        tx.add(mail)
        await tx.flush()
        fields=dict(business_id=business.id,environment_id=c["environment"],organization_id=p.organization_id,user_id=session.user_id)
        original=dict(mail_id=mail.id,case_id=case.id,message_id=mail.message_id,direction=mail.direction,**{k:mail.payload[k] for k in ("sender","recipient","subject","body")})
        return c|dict(binding=fields,session_id=session.id,session_expiry=session.expires_at,portfolio_id=p.id,grant_id=grant.id,
            mail_id=mail.id,case_id=case.id,original=original,source_sha=source_digest(business.id,c["environment"],original))


async def policy(c,**changes):
    async with AsyncSession(c["admin"],expire_on_commit=False) as tx,tx.begin():
        now=await tx.scalar(text("SELECT clock_timestamp()"))
        fields=dict(c["binding"],id=str(uuid4()),portfolio_id=c["portfolio_id"],grant_id=c["grant_id"],session_id=c["session_id"],
            source_revision=settings().control_source_revision,instruction_sha256=POLICY_SHA,target_language="lt",model=s.MODEL,effort=s.EFFORT,
            maximum_calls=30,mail_created_after=now-timedelta(days=1),approved_at=now,
            expires_at=min(now+timedelta(seconds=3600),c["session_expiry"]),enabled=True,fingerprint="1"*64)|changes
        tx.add(DisplayPolicy(**fields))
        await tx.flush()
    return fields


@pytest.fixture
async def display_case(actor_case):
    c=actor_case
    c["policy"]=await policy(c)
    return c


@asynccontextmanager
async def actor(c,*,user=None,source=None):
    async with scope(user=c["binding"]["user_id"] if user is None else user) as tx:
        await tx.execute(text("SELECT set_config('pinet.execution_source_revision',:s,true)"),
            {"s":settings().control_source_revision if source is None else source})
        yield tx


async def parent(c,tx,*,kind=s.KIND,business=True,session=True):
    fields=c["binding"]|({} if business else {"business_id":None})
    thread=Thread(**fields,id=str(uuid4()),last_sequence=1)
    tx.add(thread)
    await tx.flush()
    task=Task(**fields,id=str(uuid4()),thread_id=thread.id,sequence=1,kind=kind,status="queued",idempotency_key=str(uuid4()),
        fingerprint="2"*64,message="Synthetic display schema QA",source_revision=settings().control_source_revision,
        session_id=c["session_id"] if session else None,event_sequence=0,result=None,failure_code=None,run_id=None,lease_until=None)
    tx.add(task)
    await tx.flush()
    return task


async def queue(c,*,digest=None,**changes):
    async with actor(c) as tx:
        task=await parent(c,tx)
        job=DisplayJob(**(dict(c["binding"],task_id=task.id,policy_id=c["policy"]["id"],kind=s.KIND,mail_id=c["mail_id"],case_id=c["case_id"],
            source_sha256=digest or c["source_sha"],instruction_sha256=POLICY_SHA,target_language="lt",run_id=None,reserved_at=None,record=None)|changes))
        tx.add(job)
        await tx.flush()
        return task.id


async def running(c,task):
    async with actor(c) as tx:
        t=await tx.get(Task,task)
        run=str(uuid4())
        t.status,t.run_id,t.lease_until="running",run,utcnow()+timedelta(seconds=120)
        await tx.flush()
        tx.add(TaskRun(**c["binding"],id=run,task_id=task,status="running",model=s.MODEL,effort=s.EFFORT,adapter_revision=s.ADAPTER,usage=None,cost_microusd=None))
        await tx.flush()
    return run


async def call(c,name,task,run,**values):
    tail={"reserve":"","run_usage":"","settle_task":",CAST(:j AS jsonb),:reason,:event","store_record":",CAST(:v AS jsonb),CAST(:j AS jsonb)"}[name]
    async with actor(c) as tx:
        return await tx.scalar(text(f"SELECT mail_display_{name}(:t,:r,:u,:e,:s{tail})"),
            dict(t=task,r=run,u=c["binding"]["user_id"],e=c["environment"],s="a"*40,event=str(uuid4()),reason="authorization_revoked",j=None,v=None)|values)


def record(c,usage=None):
    return dict(version="mail-display-translation.v1",business_id=c["binding"]["business_id"],environment=c["environment"],mail_id=c["mail_id"],
        source_sha256=c["source_sha"],target_language="lt",translated_at=utcnow().isoformat(),model=s.MODEL,reasoning_effort=s.EFFORT,
        instruction_sha256=POLICY_SHA,text={"subject":"Sintetinis vertimas","body":"Sintetinis tekstas 10 EUR."},usage=usage)


async def revoke(c,kind):
    statements={"grant":"UPDATE control_business_grants SET enabled=false WHERE id=:g",
        "membership":"UPDATE control_memberships SET enabled=false WHERE user_id=:u AND environment_id=:e",
        "session":"UPDATE control_sessions SET revoked_at=clock_timestamp() WHERE id=:s",
        "user":"UPDATE control_users SET enabled=false WHERE id=:u",
        "policy":"UPDATE control_mail_display_policies SET enabled=false WHERE id=:p",
        "account":"UPDATE control_customer_accounts SET verified_at=NULL WHERE user_id=:u AND environment_id=:e"}
    async with AsyncSession(c["admin"]) as tx,tx.begin():
        await tx.execute(text(statements[kind]),dict(g=c["grant_id"],u=c["binding"]["user_id"],e=c["environment"],s=c["session_id"],p=c["policy"]["id"]))


@pytest.mark.skipif(os.environ.get("PINET_MAIL_DISPLAY_PREFIX_BASELINE")!="1",reason="Intentional exact0046 baseline reproduction")
async def test_new_display_task_is_not_admitted_by0046(actor_case):
    async with actor(actor_case) as tx:
        await parent(actor_case,tx)


async def test_schema_columns_forced_rls_and_exact_privileges(display_case):
    c=display_case
    async with actor(c) as tx:
        for model in (DisplayPolicy,DisplayJob):
            table=model.__tablename__
            assert set(await tx.scalars(text("SELECT attname FROM pg_attribute WHERE attrelid=to_regclass(:t) AND attnum>0 AND NOT attisdropped"),{"t":table}))==set(model.__table__.columns.keys())
            assert await tx.scalar(text("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=to_regclass(:t)"),{"t":table})
            actual=(await tx.execute(text("SELECT has_table_privilege(current_user,:t,'SELECT'),has_table_privilege(current_user,:t,'INSERT'),has_table_privilege(current_user,:t,'UPDATE'),has_table_privilege(current_user,:t,'DELETE')"),{"t":table})).one()
            assert actual==(True,model is DisplayJob,False,False)
        helpers=(await tx.execute(text("""SELECT p.proname,p.proconfig,has_function_privilege(current_user,p.oid,'EXECUTE') AS allowed,
          EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public
          FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname LIKE 'mail_display_%'"""))).mappings().all()
        assert len(helpers)==9
        for row in helpers:
            assert row["proconfig"]==["search_path=pg_catalog, public"] and not row["public"]
            assert row["allowed"]==(row["proname"] in {"mail_display_reserve","mail_display_run_usage","mail_display_settle_task","mail_display_store_record","mail_display_projection"})


async def test_reservation_precedes_io_exact_replay_refuses_and_success_is_atomic(display_case):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"run_usage",task,run)==dict(usage=None,model_calls=0,unknown_usage_calls=0,usage_complete=True)
    assert await call(c,"reserve",task,run)
    assert not await call(c,"reserve",task,run)
    assert await call(c,"run_usage",task,run)==dict(usage=None,model_calls=1,unknown_usage_calls=1,usage_complete=False)
    usage={"input_tokens":11,"output_tokens":3}
    value=record(c,usage)
    assert await call(c,"store_record",task,run,v=json.dumps(value),j=json.dumps(usage))
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task,task)).status==(await tx.get(TaskRun,run)).status=="running"
        assert (await tx.get(DisplayJob,task)).record==value
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status="succeeded",lease_until=None))
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status="succeeded",finished_at=utcnow()))
    assert await call(c,"run_usage",task,run)==dict(usage=usage,model_calls=1,unknown_usage_calls=0,usage_complete=True)
    assert not await call(c,"settle_task",task,run,j=json.dumps(usage))


@pytest.mark.parametrize("usage",[None,{},"jsonnull"])
async def test_unknown_usage_never_becomes_token_zero(display_case,usage):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    raw="null" if usage=="jsonnull" else json.dumps(usage) if usage is not None else None
    assert await call(c,"settle_task",task,run,j=raw)
    assert await call(c,"run_usage",task,run)==dict(usage=None,model_calls=1,unknown_usage_calls=1,usage_complete=False)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(TaskRun,run)).usage==dict(model_calls=1,unknown_usage_calls=1,usage_complete=False)
        assert (await tx.get(DisplayJob,task)).record is None


@pytest.mark.parametrize("kind",["grant","membership","session","user","policy","source","account"])
async def test_authority_loss_keeps_exact_failed_usage_and_hides_output(display_case,kind):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    if kind=="source":
        settings().control_source_revision="b"*40
    else:
        await revoke(c,kind)
    usage={"input_tokens":7}
    assert not await call(c,"store_record",task,run,v=json.dumps(record(c,usage)),j=json.dumps(usage))
    assert await call(c,"settle_task",task,run,j=json.dumps(usage))
    assert await call(c,"run_usage",task,run)==dict(usage=usage,model_calls=1,unknown_usage_calls=0,usage_complete=True)
    async with actor(c) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob).where(DisplayJob.task_id==task))==(0 if kind in {"grant","membership","user"} else 1)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(DisplayJob,task)).record is None
        assert (await tx.get(Task,task)).status==(await tx.get(TaskRun,run)).status=="failed"


async def test_usage_record_bounds_scope_and_current_source_refuse(display_case):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    for usage in ([],{"input_tokens":True},{"input_tokens":1.5},{"input_tokens":-1},{"input_tokens":1000000001},{"model_calls":0}):
        assert not await call(c,"settle_task",task,run,j=json.dumps(usage))
        assert not await call(c,"store_record",task,run,v=json.dumps(record(c,usage)),j=json.dumps(usage))
    for key,value in (("business_id",str(uuid4())),("mail_id",str(uuid4())),("source_sha256","0"*64),
            ("instruction_sha256","0"*64),("target_language","en"),("model","other"),("reasoning_effort","low"),
            ("translated_at","9999-01-01T00:00:00Z"),("text",{"subject":"x","body":"x"*32001}),("extra",True)):
        changed=record(c)|{key:value}
        assert not await call(c,"store_record",task,run,v=json.dumps(changed))
    for identity in ({"t":str(uuid4())},{"r":str(uuid4())},{"u":str(uuid4())},{"e":"foreign"},{"s":"b"*40}):
        assert await call(c,"run_usage",task,run,**identity) is None
        assert not await call(c,"reserve",task,run,**identity)
        assert not await call(c,"settle_task",task,run,**identity)
    assert await call(c,"store_record",task,run,v=json.dumps(record(c)))


async def test_global_queue_cap_and_dedup_are_atomic_across_tasks(display_case):
    c=display_case
    c["policy"]=await policy(c,maximum_calls=1)
    async def enqueue(digest):
        try:
            return await queue(c,digest=digest)
        except DBAPIError as error:
            assert "slots exhausted" in str(error)
            return None
    results=await asyncio.gather(enqueue("a"*64),enqueue("b"*64))
    assert sum(value is not None for value in results)==1
    task=next(value for value in results if value is not None)
    async with AsyncSession(c["admin"]) as tx:
        old=await tx.get(DisplayJob,task)
        duplicate=old.source_sha256
    with pytest.raises(DBAPIError,match="duplicate key"):
        await queue(c,digest=duplicate)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    assert await call(c,"settle_task",task,run)
    with pytest.raises(DBAPIError,match="slots exhausted"):
        await queue(c,digest="c"*64)


async def test_unreserved_cancelled_slot_is_free_but_same_source_stays_dedup(display_case):
    c=display_case
    c["policy"]=await policy(c,maximum_calls=1)
    task=await queue(c)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status="cancelled"))
    with pytest.raises(DBAPIError,match="duplicate key"):
        await queue(c)
    other=await queue(c,digest="b"*64)
    assert other!=task


async def test_policy_session_cap_immutability_and_runtime_denials(display_case):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    statements=[("UPDATE control_mail_display_policies SET maximum_calls=1 WHERE id=:id",c["policy"]["id"]),
        ("UPDATE control_mail_display_jobs SET source_sha256=:v WHERE task_id=:id",task),
        ("DELETE FROM control_mail_display_policies WHERE id=:id",c["policy"]["id"]),
        ("UPDATE control_tasks SET run_id=NULL WHERE id=:id",task),("UPDATE control_tasks SET source_revision=:v WHERE id=:id",task),
        ("UPDATE control_task_runs SET model=:v WHERE id=:id",run)]
    for sql,value in statements:
        with pytest.raises(DBAPIError):
            async with AsyncSession(c["admin"]) as tx,tx.begin():
                await tx.execute(text(sql),{"id":value,"v":"b"*40})
    with pytest.raises(DBAPIError,match="Session cap"):
        await policy(c,approved_at=c["session_expiry"],expires_at=c["session_expiry"]+timedelta(seconds=1))
    with pytest.raises(DBAPIError,match="permission denied"):
        async with actor(c) as tx:
            tx.add(DisplayPolicy(**(c["policy"]|{"id":str(uuid4())})))
            await tx.flush()
    for sql in ("UPDATE control_mail_display_jobs SET record='{}'::jsonb WHERE task_id=:id","DELETE FROM control_mail_display_jobs WHERE task_id=:id"):
        with pytest.raises(DBAPIError,match="permission denied"):
            async with actor(c) as tx:
                await tx.execute(text(sql),{"id":task})
    for user in ("",str(uuid4())):
        async with actor(c,user=user) as tx:
            assert await tx.scalar(select(func.count()).select_from(DisplayJob))==0
    await revoke(c,"policy")
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx,tx.begin():
            await tx.execute(text("UPDATE control_mail_display_policies SET enabled=true WHERE id=:id"),{"id":c["policy"]["id"]})


async def test_waiting_for_policy_rechecks_db_clock_before_reservation(display_case):
    c=display_case
    now=utcnow()
    c["policy"]=await policy(c,approved_at=now,expires_at=now+timedelta(seconds=2))
    task=await queue(c)
    run=await running(c,task)
    async with AsyncSession(c["admin"]) as held,held.begin():
        await held.execute(text("SELECT 1 FROM control_mail_display_policies WHERE id=:id FOR UPDATE"),{"id":c["policy"]["id"]})
        pending=asyncio.create_task(call(c,"reserve",task,run))
        await asyncio.sleep(.2)
        assert not pending.done()
        await held.execute(text("SELECT pg_sleep(2)"))
    assert not await pending
    assert (await call(c,"run_usage",task,run))["model_calls"]==0


@pytest.mark.parametrize("terminal",["failed","cancelled"])
async def test_terminal_usage_enrichment_is_monotonic_and_replay_has_no_writes(display_case,terminal):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status=terminal,lease_until=None,failure_code="existing",event_sequence=1))
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status=terminal,finished_at=utcnow(),usage={"input_tokens":9,"model_calls":99}))
        tx.add(TaskEvent(**c["binding"],id=str(uuid4()),task_id=task,sequence=1,status=terminal,failure_code="existing"))
    await revoke(c,"grant")
    assert await call(c,"settle_task",task,run,j=json.dumps({"input_tokens":7}))
    async with AsyncSession(c["admin"]) as tx:
        before=(await tx.execute(text("SELECT xmin::text,finished_at FROM control_task_runs WHERE id=:id"),{"id":run})).one()
    assert await call(c,"settle_task",task,run)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.execute(text("SELECT xmin::text,finished_at FROM control_task_runs WHERE id=:id"),{"id":run})).one()==before
        assert (await tx.get(Task,task)).status==terminal and (await tx.get(Task,task)).failure_code=="existing"
        assert (await tx.get(TaskRun,run)).usage==dict(input_tokens=9,model_calls=1,unknown_usage_calls=0,usage_complete=True)
        assert await tx.scalar(select(func.count()).select_from(TaskEvent).where(TaskEvent.task_id==task))==1


async def test_new_kind_restrictions_preserve_all_previous_business_session_rules(display_case):
    c=display_case
    for changes in ({"business":False},{"session":False},{"kind":"chat.consult","business":False},
            {"kind":"acquisition.reviewed_capture","session":True},{"kind":"workspace.direct_turn","business":False}):
        with pytest.raises(DBAPIError):
            async with actor(c) as tx:
                await parent(c,tx,**changes)
                await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    async with actor(c) as tx:
        for kind in ("chat.consult","workspace.team_turn","acquisition.model_prepare"):
            await parent(c,tx,kind=kind)
        await parent(c,tx,kind="acquisition.reviewed_capture",session=False)
        await tx.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))


async def test_all_fixed_reasons_terminalize_pre_io_without_charge_or_job_mutation(display_case):
    c=display_case
    reasons=("authorization_revoked","provider_error","mail_translation_invalid","mail_authority_changed",
        "worker_interrupted","run_timeout","output_invalid","translation_runner_unavailable","translation_deadline_invalid")
    for i,reason in enumerate(reasons,1):
        task=await queue(c,digest=f"{i:064x}")
        run=await running(c,task)
        assert not await call(c,"settle_task",task,run,reason="untrusted_reason")
        assert not await call(c,"settle_task",task,run,j=json.dumps({"input_tokens":1}))
        assert await call(c,"settle_task",task,run,reason=reason)
        assert await call(c,"run_usage",task,run)==dict(usage=None,model_calls=0,unknown_usage_calls=0,usage_complete=True)
        async with AsyncSession(c["admin"]) as tx:
            job=await tx.get(DisplayJob,task)
            assert job.run_id is None and job.reserved_at is None and job.record is None
            assert (await tx.get(Task,task)).failure_code==reason
            assert (await tx.get(TaskRun,run)).status=="failed"
    # Old-source accounting still works before any IO after authority is gone.
    task=await queue(c,digest="f"*64)
    run=await running(c,task)
    await revoke(c,"grant")
    settings().control_source_revision="b"*40
    assert await call(c,"settle_task",task,run,reason="worker_interrupted")
    assert (await call(c,"run_usage",task,run))["model_calls"]==0


async def test_dedup_survives_new_policy_and_execution_source_revision(display_case):
    c=display_case
    await queue(c)
    c["policy"]=await policy(c)
    with pytest.raises(DBAPIError,match="duplicate key"):
        await queue(c)
    settings().control_source_revision="b"*40
    c["policy"]=await policy(c)
    with pytest.raises(DBAPIError,match="duplicate key"):
        await queue(c)


async def test_mail_case_cutoff_instruction_and_record_once_fences(display_case):
    c=display_case
    for changes in ({"case_id":str(uuid4())},{"instruction_sha256":"0"*64},{"record":{}},{"run_id":str(uuid4())}):
        with pytest.raises(DBAPIError):
            await queue(c,**changes)
    c["policy"]=await policy(c,mail_created_after=utcnow()+timedelta(days=1))
    with pytest.raises(DBAPIError,match="eligible display Mail/Case"):
        await queue(c)
    c["policy"]=await policy(c)
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    value=record(c)
    assert await call(c,"store_record",task,run,v=json.dumps(value))
    assert await call(c,"store_record",task,run,v=json.dumps(value))
    changed=value|{"text":{"subject":"Other","body":"Other 10 EUR."}}
    assert not await call(c,"store_record",task,run,v=json.dumps(changed))
    with pytest.raises(DBAPIError,match="immutable display Job"):
        async with AsyncSession(c["admin"]) as tx,tx.begin():
            await tx.execute(text("UPDATE control_mail_display_jobs SET record=NULL WHERE task_id=:id"),{"id":task})


@pytest.mark.parametrize("status",["running","failed","cancelled","succeeded"])
async def test_usage_observed_retains_only_monotonic_accounting_after_authority_loss(display_case,status):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert not await call(c,"settle_task",task,run,reason="usage_observed")
    assert await call(c,"reserve",task,run)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status=status,lease_until=None if status!="running" else utcnow()+timedelta(seconds=120),
            failure_code="existing" if status in {"failed","cancelled"} else None,result={"existing":True} if status=="succeeded" else None))
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status=status,finished_at=None if status=="running" else utcnow(),usage={"input_tokens":9}))
    await revoke(c,"grant")
    settings().control_source_revision="b"*40
    async with AsyncSession(c["admin"]) as tx:
        before_task=(await tx.execute(text("SELECT xmin::text,status,failure_code,result,lease_until,event_sequence,updated_at FROM control_tasks WHERE id=:t"),{"t":task})).one()
        before_run=(await tx.execute(text("SELECT status,finished_at FROM control_task_runs WHERE id=:r"),{"r":run})).one()
    assert await call(c,"settle_task",task,run,reason="usage_observed",j=json.dumps({"input_tokens":7,"output_tokens":2}))
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.execute(text("SELECT xmin::text,status,failure_code,result,lease_until,event_sequence,updated_at FROM control_tasks WHERE id=:t"),{"t":task})).one()==before_task
        assert (await tx.execute(text("SELECT status,finished_at FROM control_task_runs WHERE id=:r"),{"r":run})).one()==before_run
        assert (await tx.get(TaskRun,run)).usage==dict(input_tokens=9,output_tokens=2,model_calls=1,unknown_usage_calls=0,usage_complete=True)
        assert (await tx.get(DisplayJob,task)).record is None
        assert await tx.scalar(select(func.count()).select_from(TaskEvent).where(TaskEvent.task_id==task))==0
        before=(await tx.execute(text("SELECT xmin::text FROM control_task_runs WHERE id=:r"),{"r":run})).scalar_one()
    assert await call(c,"settle_task",task,run,reason="usage_observed")
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(text("SELECT xmin::text FROM control_task_runs WHERE id=:r"),{"r":run})==before


async def test_provider_return_checkpoint_survives_unknown_or_lower_store_usage(display_case):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    assert await call(c,"settle_task",task,run,reason="usage_observed",j=json.dumps({"input_tokens":11}))
    assert await call(c,"store_record",task,run,v=json.dumps(record(c)))
    assert await call(c,"run_usage",task,run)==dict(usage={"input_tokens":11},model_calls=1,unknown_usage_calls=0,usage_complete=True)
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Task,task)).status==(await tx.get(TaskRun,run)).status=="running"


async def test_record_completion_rollback_keeps_separate_usage_checkpoint(display_case):
    c=display_case
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    assert await call(c,"settle_task",task,run,reason="usage_observed",j=json.dumps({"input_tokens":7}))
    with pytest.raises(RuntimeError,match="synthetic completion rollback"):
        async with actor(c) as tx:
            usage={"input_tokens":9}
            assert await tx.scalar(text("SELECT mail_display_store_record(:t,:r,:u,:e,:s,CAST(:v AS jsonb),CAST(:j AS jsonb))"),
                dict(t=task,r=run,u=c["binding"]["user_id"],e=c["environment"],s="a"*40,v=json.dumps(record(c,usage)),j=json.dumps(usage)))
            await tx.execute(update(Task).where(Task.id==task).values(status="succeeded",lease_until=None,event_sequence=1))
            await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status="succeeded",finished_at=utcnow()))
            tx.add(TaskEvent(**c["binding"],id=str(uuid4()),task_id=task,sequence=1,status="succeeded",failure_code=None))
            await tx.flush()
            raise RuntimeError("synthetic completion rollback")
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(DisplayJob,task)).record is None
        assert (await tx.get(Task,task)).status==(await tx.get(TaskRun,run)).status=="running"
        assert (await tx.get(TaskRun,run)).usage==dict(input_tokens=7,model_calls=1,unknown_usage_calls=0,usage_complete=True)
        assert await tx.scalar(select(func.count()).select_from(TaskEvent).where(TaskEvent.task_id==task))==0


async def test_store_after_policy_lock_wait_uses_fresh_clock(display_case):
    c=display_case
    now=utcnow()
    c["policy"]=await policy(c,approved_at=now,expires_at=now+timedelta(seconds=2))
    task=await queue(c)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    value=record(c)
    async with AsyncSession(c["admin"]) as held,held.begin():
        await held.execute(text("SELECT 1 FROM control_mail_display_policies WHERE id=:id FOR UPDATE"),{"id":c["policy"]["id"]})
        pending=asyncio.create_task(call(c,"store_record",task,run,v=json.dumps(value)))
        await asyncio.sleep(.2)
        assert not pending.done()
        await held.execute(text("SELECT pg_sleep(2)"))
    assert not await pending
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(DisplayJob,task)).record is None
    assert (await call(c,"run_usage",task,run))["unknown_usage_calls"]==1


async def test_reservation_lifetime_cap_still_serializes_after_unreserved_slot_reuse(display_case):
    c=display_case
    c["policy"]=await policy(c,maximum_calls=1)
    one=await queue(c,digest="a"*64)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==one).values(status="cancelled"))
    two=await queue(c,digest="b"*64)
    # Synthetic adverse common-ledger transition: no prior Run or charged slot
    # exists for either Task. The SQL hardcap must survive this queue bypass.
    runs=await running(c,one),await running(c,two)
    results=await asyncio.gather(call(c,"reserve",one,runs[0]),call(c,"reserve",two,runs[1]))
    assert sorted(results)==[False,True]
    projections=[await call(c,"run_usage",task,run) for task,run in zip((one,two),runs)]
    assert sum(item["model_calls"] for item in projections)==1
    assert sum(item["unknown_usage_calls"] for item in projections)==1


async def projection(c,sha,*,user=None,**changes):
    async with actor(c,user=user,source="historical-read-no-execution-source") as tx:
        return await tx.scalar(text("SELECT mail_display_projection(:b,:m,:u,:e,:sha,:ins)"),
            dict(b=c["binding"]["business_id"],m=c["mail_id"],u=c["binding"]["user_id"] if user is None else user,
                e=c["environment"],sha=sha,ins=POLICY_SHA)|changes)


async def other_owner(c,*,admit=True):
    _,headers,_=await verified(c)
    async with AsyncSession(c["admin"],expire_on_commit=False) as tx,tx.begin():
        session=await tx.scalar(select(Session).where(Session.token_hash==token_hash(headers["Authorization"].split()[1])))
        if admit:
            tx.add(Membership(id=str(uuid4()),environment_id=c["environment"],user_id=session.user_id,
                organization_id=c["binding"]["organization_id"],enabled=True,role="owner"))
        return session.user_id


async def test_projection_shares_owned_mail_text_without_job_ids_usage_or_rls_broadening(display_case):
    c=display_case
    assert await projection(c,None) is None
    task=await queue(c)
    assert await projection(c,None)==dict(state="claimed",record=None)
    assert await projection(c,c["source_sha"])==dict(state="pending",record=None)
    run=await running(c,task)
    assert await call(c,"reserve",task,run)
    usage={"input_tokens":7}
    value=record(c,usage)
    assert await call(c,"store_record",task,run,v=json.dumps(value),j=json.dumps(usage))
    assert await projection(c,c["source_sha"])==dict(state="pending",record=None)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status="succeeded",lease_until=None))
    assert await projection(c,c["source_sha"])==dict(state="unavailable",record=None)
    async with actor(c) as tx:
        await tx.execute(update(TaskRun).where(TaskRun.id==run).values(status="succeeded",finished_at=utcnow()))
    second=await other_owner(c)
    await revoke(c,"policy")
    settings().control_source_revision="b"*40
    actual=await projection(c,c["source_sha"],user=second)
    assert actual==dict(state="ready",record=value|{"usage":None})
    assert set(actual)=={"state","record"}
    assert await projection(c,None,user=second)==dict(state="claimed",record=None)
    async with actor(c,user=second) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob))==0
        assert await tx.scalar(select(func.count()).select_from(DisplayPolicy))==0
        assert await tx.scalar(select(func.count()).select_from(Task).where(Task.id==task))==0
        await tx.execute(text("SELECT set_config('pinet.business',:b,true)"),{"b":c["binding"]["business_id"]})
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.id==c["mail_id"]))==1
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(DisplayJob,task)).record==value  # Projection did not rewrite usage.


async def test_projection_hides_foreign_scope_and_never_falls_back_for_failed_job(display_case):
    c=display_case
    task=await queue(c)
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task).values(status="failed",failure_code="provider_error"))
    assert await projection(c,c["source_sha"])==dict(state="unavailable",record=None)
    assert await projection(c,None)==dict(state="claimed",record=None)
    for changes in ({"b":str(uuid4())},{"m":str(uuid4())},{"u":str(uuid4())},{"e":"foreign"},{"ins":"0"*64}):
        assert await projection(c,c["source_sha"],**changes) is None
    assert await projection(c,"0"*64) is None
    outsider=await other_owner(c,admit=False)
    assert await projection(c,None,user=outsider) is None
    await revoke(c,"grant")
    assert await projection(c,None) is None


async def test_projection_recognizes_only_strict_legacy_no_run_marker_across_owners(actor_case):
    c=actor_case
    marker=dict(state="legacy_retained",mail_id=c["mail_id"],source_sha256=c["source_sha"],instruction_sha256=POLICY_SHA,target_language="lt")
    async with actor(c) as tx:
        task=await parent(c,tx)
        task.status,task.failure_code,task.result="cancelled","mail_display_legacy_retained",marker
        await tx.flush()
        task_id=task.id
    second=await other_owner(c)
    assert await projection(c,None,user=second)==dict(state="claimed",record=None)
    assert await projection(c,c["source_sha"],user=second)==dict(state="legacy_retained",record=None)
    assert await projection(c,"0"*64,user=second) is None
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task_id).values(result=marker|{"extra":"not-a-strict-marker"}))
    assert await projection(c,None,user=second) is None
    async with actor(c) as tx:
        await tx.execute(update(Task).where(Task.id==task_id).values(result=marker,status="failed"))
    assert await projection(c,None,user=second) is None
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(TaskRun).where(TaskRun.task_id==task_id))==0
        assert await tx.scalar(select(func.count()).select_from(DisplayJob).where(DisplayJob.task_id==task_id))==0
