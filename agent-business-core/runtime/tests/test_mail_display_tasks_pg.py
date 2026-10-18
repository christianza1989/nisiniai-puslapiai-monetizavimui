"""Retained isolated PostgreSQL/common-worker/owner-mail, zero real model/channel IO."""
import asyncio
import json
from copy import deepcopy
from datetime import timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import verified
from test_private_preview_pg import preview  # noqa: F401 - retained normal-owner fixture

from pinet_core.acquisition import module_admin
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Portfolio
from pinet_core.control.routes import scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.mail_view import task_handler, task_policy, task_service
from pinet_core.mail_view.task_contract import KIND
from pinet_core.mail_view.task_models import DisplayJob, DisplayPolicy
from pinet_core.mail_view.translations import POLICY_SHA, Record, TranslatedText, record_path, source_digest
from pinet_core.models import Business, Case, MailMessage, new_id, utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex_transport import RunnerError
from pinet_core.tasks.models import Task, TaskEvent, TaskRun


@pytest.fixture
async def display(preview, monkeypatch, tmp_path):  # noqa: F811
    c, cfg = preview, settings()
    monkeypatch.setattr(cfg, "mail_display_tasks_enabled", True)
    monkeypatch.setattr(cfg, "mail_display_runner_enabled", True)
    monkeypatch.setattr(cfg, "mail_display_directory", str(tmp_path))
    monkeypatch.setattr(task_handler, "runner_ready", lambda: True)  # Inert adapter; no CLI.
    monkeypatch.setattr(module_admin, "git_source_observation",
        lambda root: SimpleNamespace(head=cfg.control_source_revision, porcelain=""))
    _, auth, me = await verified(c)
    token = auth["Authorization"][7:]
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        session_id, user_id = actor.id, actor.user_id
    monkeypatch.setattr(cfg, "mail_display_actor_ids", [user_id])
    pid = me["portfolios"][0]["portfolio_id"]
    business_id, case_id, mail_id = new_id(), new_id(), new_id()
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        portfolio = await tx.get(Portfolio, pid)
        site = "display-qa-"+uuid4().hex
        tx.add(Business(id=business_id, site_id=site, canonical_host=site+".example.test"))
        await tx.flush()
        tx.add(BusinessGrant(id=new_id(), business_id=business_id, environment_id=c["environment"],
            organization_id=portfolio.organization_id, portfolio_id=pid, display_name="Synthetic mail display",
            evidence_revision=cfg.control_source_revision, enabled=True))
        tx.add(Case(id=case_id, business_id=business_id, environment_id=c["environment"], payload={"synthetic": True}))
        await tx.flush()
        payload = {"subject": "2 tubs", "body": "Not confirmed: 2 tubs.", "sender": "buyer@example.test",
            "recipient": "info@pinet.lt", "synthetic": True, "external_sent": False}
        tx.add(MailMessage(id=mail_id, case_id=case_id, business_id=business_id, environment_id=c["environment"],
            message_id="<"+uuid4().hex+"@example.test>", direction="inbound", state="captured", payload=payload))
    policy_request = {"policy_id": new_id(), "business_id": business_id, "authorizing_session_id": session_id,
        "execution_source_revision": cfg.control_source_revision, "model_execution_authorized": True,
        "maximum_calls": 3, "duration_seconds": 600,
        "mail_created_after": (utcnow()-timedelta(days=1)).astimezone(timezone(timedelta(hours=3))).isoformat()}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        approved = await task_policy.approve(tx, policy_request)
    return {**c, "auth": auth, "token": token, "user_id": user_id, "session_id": session_id,
        "business_id": business_id, "case_id": case_id, "mail_id": mail_id,
        "policy": approved["after"], "request": policy_request, "payload": deepcopy(payload), "root": tmp_path}


async def enqueue(p):
    async with scope(token=token_hash(p["token"])) as tx:
        session = await customer_session(tx, p["token"])
        return await task_service.enqueue(tx, session, {"policy_id": p["policy"]["id"], "mail_id": p["mail_id"]})


async def second_owner(p):
    _, auth, me = await verified(p)
    token = auth["Authorization"][7:]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        sid = session.id
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.business_id == p["business_id"],
            BusinessGrant.environment_id == p["environment"]))
        tx.add(Membership(id=new_id(), user_id=me["user_id"], organization_id=grant.organization_id,
            environment_id=p["environment"], role="owner", enabled=True))
        await tx.flush()
        policy = await task_policy.approve(tx, {**p["request"], "policy_id": new_id(), "authorizing_session_id": sid})
    return {"auth":auth,"token":token,"user_id":me["user_id"],"policy":policy["after"]}


class Translator:
    def __init__(self, *, usage=True, fail=False, after=None, wrong=False):
        self.calls, self.usage, self.fail, self.after, self.wrong = [], usage, fail, after, wrong

    async def __call__(self, original, **kwargs):
        assert await kwargs["still_authorized"]()
        self.calls.append(original["mail_id"])
        if self.after:
            await self.after()
        if self.fail:
            raise RunnerError("provider_error", {"input_tokens": 7})
        record = Record(version="mail-display-translation.v1", business_id=kwargs["business_id"],
            environment=kwargs["environment"], mail_id=original["mail_id"],
            source_sha256=source_digest(kwargs["business_id"], kwargs["environment"], original),
            instruction_sha256=POLICY_SHA, target_language="lt", translated_at=utcnow(),
            model="gpt-6.1-sol", reasoning_effort="high", text=TranslatedText(
                subject="2 kubilai", body="Nepatvirtinta: 2 kubilai."),
            usage={"input_tokens": 9, "output_tokens": 3} if self.usage else None)
        return record.model_copy(update={"source_sha256": "0"*64}) if self.wrong else record


async def retained(p):
    async with AsyncSession(p["admin"]) as tx:
        job = await tx.scalar(select(DisplayJob).where(DisplayJob.mail_id == p["mail_id"]))
        task = await tx.get(Task, job.task_id) if job else None
        run = await tx.get(TaskRun, task.run_id) if task and task.run_id else None
        mail = await tx.get(MailMessage, p["mail_id"])
        assert mail.payload == p["payload"]
        return job, task, run


@pytest.mark.parametrize("known", [True, False])
async def test_committed_mail_auto_materializes_once_then_owner_get_shows_db_record(display, known):
    p, fake = display, Translator(usage=known)
    base = f"/operator/v2/businesses/{p['business_id']}/mail/{p['mail_id']}"
    before = await p["client"].get(base, headers=p["auth"])
    assert before.status_code == 200 and before.json()["data"]["translation"]["status"] == "missing", before.text
    assert (await retained(p))[0] is None  # GET never enqueues.
    assert await worker.execute_once(fake, kind=KIND)
    job, task, run = await retained(p)
    assert task.status == run.status == "succeeded" and job.record is not None
    assert job.run_id == run.id and job.reserved_at is not None and fake.calls == [p["mail_id"]]
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == (0 if known else 1)
    assert run.usage["usage_complete"] is known and run.cost_microusd is None
    for _ in range(3):
        translated = await p["client"].get(base, headers=p["auth"])
        assert translated.status_code == 200, translated.text
        data = translated.json()["data"]
        assert data["body"] == p["payload"]["body"] and data["translation"]["body"] == "Nepatvirtinta: 2 kubilai."
        assert data["translation"]["status"] == "ready"
        assert (await enqueue(p))["task_id"] == task.id
        assert not await worker.execute_once(fake, kind=KIND)
    assert fake.calls == [p["mail_id"]]
    assert not list(p["root"].rglob("*.lt.json"))  # DB transaction, no FS publish gap.
    from mail_display_task import owner_action
    session_file = p["root"]/"session.private.json"
    session_file.write_text(json.dumps({"access_token": p["token"]}), encoding="utf-8")
    assert (await owner_action("enqueue", session_file,
        {"policy_id": p["policy"]["id"], "mail_id": p["mail_id"]}))["task_id"] == task.id
    assert (await owner_action("read", session_file, task_id=task.id))["execution"]["usage"]["model_calls"] == 1
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await task_policy.contain(tx, "stop", {"policy_id": p["policy"]["id"],
            "authorizing_session_id": p["session_id"], "execution_source_revision": settings().control_source_revision,
            "expected_fingerprint": p["policy"]["fingerprint"]})
    assert (await enqueue(p))["state"] == "existing"
    assert not await worker.execute_once(fake, kind=KIND)
    assert (await p["client"].get(base, headers=p["auth"])).json()["data"]["translation"]["status"] == "ready"


@pytest.mark.parametrize("failure", ["provider", "stop", "grant", "source", "binding"])
async def test_failed_or_revoked_translation_keeps_original_and_known_charge(display, monkeypatch, failure):
    p = display
    async def after():
        if failure == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
        if failure in {"stop", "grant"}:
            model = DisplayPolicy if failure == "stop" else BusinessGrant
            field = model.id if failure == "stop" else model.business_id
            value = p["policy"]["id"] if failure == "stop" else p["business_id"]
            async with AsyncSession(p["admin"]) as tx, tx.begin():
                await tx.execute(update(model).where(field == value).values(enabled=False))
    fake = Translator(fail=failure == "provider", after=after, wrong=failure == "binding")
    assert await worker.execute_once(fake, kind=KIND)
    job, task, run = await retained(p)
    assert task.status == run.status == "failed" and job.record is None and task.result is None
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == 0
    assert run.usage["input_tokens"] in {7, 9}
    assert not await worker.execute_once(fake, kind=KIND) and fake.calls == [p["mail_id"]]
    response = await p["client"].get(f"/operator/v2/businesses/{p['business_id']}/mail/{p['mail_id']}", headers=p["auth"])
    if failure == "grant":
        assert response.status_code == 404
    else:
        assert response.status_code == 200 and response.json()["data"]["body"] == p["payload"]["body"], response.text
        assert response.json()["data"]["translation"]["status"] == "unavailable"


async def test_legacy_uncertain_claim_blocks_auto_model_without_creating_a_new_job(display):
    p, fake = display, Translator()
    response = await p["client"].get(f"/operator/v2/businesses/{p['business_id']}/mail/{p['mail_id']}", headers=p["auth"])
    original = response.json()["data"]
    digest = source_digest(p["business_id"], p["environment"], original)
    path = record_path(p["root"], p["business_id"], p["environment"], p["mail_id"], digest).with_suffix(".attempt.json")
    path.parent.mkdir(parents=True)
    path.write_text('{"max_calls":1,"state":"unknown"}', encoding="utf-8")
    assert (await enqueue(p))["state"] == "legacy_retained"
    assert not await worker.execute_once(fake, kind=KIND) and fake.calls == []
    assert (await retained(p))[0] is None


async def test_record_is_not_projected_before_common_terminal_transaction_commits(display, monkeypatch):
    p, fake = display, Translator()
    entered, release = asyncio.Event(), asyncio.Event()
    original_complete = task_handler.DisplayHandler.complete
    async def held(self, tx, task, result):
        value = await original_complete(self, tx, task, result)
        entered.set()
        await release.wait()
        return value
    monkeypatch.setattr(task_handler.DisplayHandler, "complete", held)
    pending = asyncio.create_task(worker.execute_once(fake, kind=KIND))
    try:
        await asyncio.wait_for(entered.wait(), 30)
        response = await p["client"].get(f"/operator/v2/businesses/{p['business_id']}/mail/{p['mail_id']}", headers=p["auth"])
        assert response.status_code == 200 and response.json()["data"]["translation"]["status"] == "missing", response.text
        job, task, run = await retained(p)
        assert job.record is None and task.status == run.status == "running"
        assert run.usage["input_tokens"] == 9
    finally:
        release.set()
    assert await asyncio.wait_for(pending, 30)
    assert (await retained(p))[1].status == "succeeded" and fake.calls == [p["mail_id"]]


@pytest.mark.parametrize("scenario", ["known", "unknown", "revoked"])
async def test_cancelled_display_preserves_one_attempt_and_one_terminal_event(display, scenario):
    p, entered = display, asyncio.Event()
    calls = []
    async def paused(original, **kwargs):
        assert await kwargs["still_authorized"]()
        calls.append(original["mail_id"])
        if scenario == "revoked":
            async with AsyncSession(p["admin"]) as tx, tx.begin():
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["business_id"],
                    BusinessGrant.environment_id == p["environment"]).values(enabled=False))
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError as error:
            if scenario == "known":
                error.receipt = {"input_tokens": 7}
            raise
    pending = asyncio.create_task(worker.execute_once(paused, kind=KIND))
    try:
        await asyncio.wait_for(entered.wait(), 30)
    finally:
        pending.cancel()
    with pytest.raises(asyncio.CancelledError):
        await pending
    job, task, run = await retained(p)
    assert task.status == run.status == "failed" and task.result is None and job.record is None
    assert run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == (0 if scenario == "known" else 1)
    assert run.usage.get("input_tokens") == (7 if scenario == "known" else None)
    assert not await worker.execute_once(paused, kind=KIND) and calls == [p["mail_id"]]
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(TaskEvent).where(
            TaskEvent.task_id == task.id, TaskEvent.status == "failed")) == 1


async def test_latest_explicit_policy_cap_does_not_fall_back_to_an_older_budget(display):
    p, fake = display, Translator()
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        limited = await task_policy.approve(tx, {**p["request"], "policy_id": new_id(), "maximum_calls": 1})
        tx.add(MailMessage(id=new_id(), business_id=p["business_id"], environment_id=p["environment"],
            case_id=p["case_id"], message_id="<"+uuid4().hex+"@example.test>", direction="inbound",
            state="captured", payload=deepcopy(p["payload"])))
    assert await worker.execute_once(fake, kind=KIND)
    assert not await worker.execute_once(fake, kind=KIND) and fake.calls == [p["mail_id"]]
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob).where(
            DisplayJob.policy_id == limited["after"]["id"])) == 1


async def test_late_final_fence_rolls_back_record_but_preserves_precompletion_usage(display, monkeypatch):
    p, fake = display, Translator()
    complete = task_handler.DisplayHandler.complete
    async def late(self, tx, task, result):
        value = await complete(self, tx, task, result)
        monkeypatch.setattr(settings(), "mail_display_runner_enabled", False)
        return value
    monkeypatch.setattr(task_handler.DisplayHandler, "complete", late)
    assert await worker.execute_once(fake, kind=KIND)
    job, task, run = await retained(p)
    assert job.record is None and task.result is None and task.status == run.status == "failed"
    assert run.usage["input_tokens"] == 9 and run.usage["model_calls"] == 1 and run.usage["unknown_usage_calls"] == 0


async def test_thirty_retained_legacy_claims_do_not_starve_the_next_new_mail(display):
    p, fake = display, Translator()
    claims = []
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(MailMessage).where(MailMessage.id == p["mail_id"]).values(created_at=utcnow()+timedelta(seconds=60)))
        for index in range(30):
            mid, message = new_id(), "<"+uuid4().hex+"@example.test>"
            tx.add(MailMessage(id=mid, business_id=p["business_id"], environment_id=p["environment"],
                case_id=p["case_id"], message_id=message, direction="inbound", state="captured",
                created_at=utcnow()-timedelta(seconds=30-index), payload=deepcopy(p["payload"])))
            value = {"mail_id":mid,"case_id":p["case_id"],"message_id":message,"direction":"inbound",**p["payload"]}
            sha = source_digest(p["business_id"],p["environment"],value)
            path = record_path(p["root"],p["business_id"],p["environment"],mid,sha).with_suffix(".attempt.json")
            path.parent.mkdir(parents=True)
            path.write_text('{"max_calls":1,"usage":null}',encoding="utf-8")
            claims.append(path)
    # A bounded materialization pass may acknowledge30 old sources, but the
    # durable no-attempt markers must advance the next pass across restart.
    for _ in range(2):
        await worker.execute_once(fake,kind=KIND)
    assert fake.calls == [p["mail_id"]]
    assert (await retained(p))[1].status == "succeeded"
    assert all(path.read_text()== '{"max_calls":1,"usage":null}' for path in claims)
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob).where(DisplayJob.business_id==p["business_id"]))==1
        assert await tx.scalar(select(func.count()).select_from(TaskRun).where(TaskRun.business_id==p["business_id"]))==1


async def test_second_owner_reuses_business_cache_without_duplicate_job_or_private_task_read(display,monkeypatch):
    p,fake=display,Translator()
    assert await worker.execute_once(fake,kind=KIND)
    _,task,_=await retained(p)
    other=await second_owner(p)
    auth=other["auth"]
    monkeypatch.setattr(settings(),"mail_display_actor_ids",[p["user_id"],other["user_id"]])
    assert not await worker.execute_once(fake,kind=KIND)
    assert fake.calls==[p["mail_id"]]
    response=await p["client"].get(f"/operator/v2/businesses/{p['business_id']}/mail/{p['mail_id']}",headers=auth)
    assert response.status_code==200 and response.json()["data"]["translation"]["status"]=="ready",response.text
    assert response.json()["data"]["translation"]["body"]=="Nepatvirtinta: 2 kubilai."
    from pinet_core.control.routes import ControlError
    async with scope(token=token_hash(auth["Authorization"][7:])) as tx:
        session=await customer_session(tx,auth["Authorization"][7:])
        with pytest.raises(ControlError):
            await task_service.read(tx,session,task.id)
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob).where(DisplayJob.mail_id==p["mail_id"]))==1


async def test_two_owners_concurrently_enqueue_one_source_under_a_named_unique_fence(display,monkeypatch):
    p,fake=display,Translator()
    other=await second_owner(p)
    monkeypatch.setattr(settings(),"mail_display_actor_ids",[p["user_id"],other["user_id"]])
    arrivals,ready=set(),asyncio.Event()
    original=task_service.new_task
    async def held(tx,policy,session,key,**kwargs):
        arrivals.add(session.user_id)
        if len(arrivals)==2:
            ready.set()
        await asyncio.wait_for(ready.wait(),15)
        return await original(tx,policy,session,key,**kwargs)
    monkeypatch.setattr(task_service,"new_task",held)
    async def submit(token,policy_id):
        async with scope(token=token_hash(token)) as tx:
            session=await customer_session(tx,token)
            return await task_service.enqueue(tx,session,{"policy_id":policy_id,"mail_id":p["mail_id"]})
    results=await asyncio.wait_for(asyncio.gather(submit(p["token"],p["policy"]["id"]),
        submit(other["token"],other["policy"]["id"])),30)
    assert {row["state"] for row in results}=={"queued","existing_shared"}
    assert await worker.execute_once(fake,kind=KIND)
    assert not await worker.execute_once(fake,kind=KIND) and fake.calls==[p["mail_id"]]


@pytest.mark.parametrize("invalid", [
    {"body": "x"*16001}, {"body": {"unexpected": "object"}},
    {"subject": "x"*257}, {"sender": ["unexpected@example.test"]},
], ids=("oversized-body", "object-body", "oversized-subject", "array-sender"))
async def test_more_than_one_page_of_invalid_originals_cannot_starve_valid_new_mail(display, invalid):
    p, fake = display, Translator()
    expected = {**deepcopy(p["payload"]), **invalid}
    retained_ids = []
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(MailMessage).where(MailMessage.id == p["mail_id"])
            .values(created_at=utcnow()+timedelta(seconds=60)))
        for index in range(31):
            mail_id = new_id()
            retained_ids.append(mail_id)
            tx.add(MailMessage(id=mail_id, business_id=p["business_id"], environment_id=p["environment"],
                case_id=p["case_id"], message_id="<"+uuid4().hex+"@example.test>", direction="inbound",
                state="captured", created_at=utcnow()-timedelta(seconds=40-index),
                payload=deepcopy(expected)))
    for _ in range(2):
        await worker.execute_once(fake, kind=KIND)
    assert fake.calls == [p["mail_id"]]
    assert (await retained(p))[1].status == "succeeded"
    async with AsyncSession(p["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DisplayJob)
            .where(DisplayJob.business_id == p["business_id"])) == 1
        assert await tx.scalar(select(func.count()).select_from(MailMessage)
            .where(MailMessage.business_id == p["business_id"])) == 32
        assert all(payload == expected for payload in await tx.scalars(
            select(MailMessage.payload).where(MailMessage.id.in_(retained_ids))))
