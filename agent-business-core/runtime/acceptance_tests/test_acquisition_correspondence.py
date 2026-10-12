"""Opt-in owned full-chain PostgreSQL and normal API, synthetic capture only.

No deletion/reset of earlier lanes. Fake preparation/decision inputs are source
QA, not real model calibration, actual inbox, ordinary UI, or public acceptance.
"""

import asyncio
import json
import os
import re
import secrets
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pinet_core.acquisition import work_config
from pinet_core.acquisition.contracts import Assessment, Campaign, Prospect, Review
from pinet_core.acquisition.correspondence import Correspondence
from pinet_core.acquisition.dialogue import REPLY_INSTRUCTION, ReplyDecision
from pinet_core.acquisition.engine import fingerprint, prepare
from pinet_core.acquisition.identity import CODEC, canonical_recipient
from pinet_core.acquisition.instructions import compose
from pinet_core.acquisition.interfaces import Invitation, Scope
from pinet_core.acquisition.ledger import LedgerError, apply_scope
from pinet_core.acquisition.normal_config import ROOT
from pinet_core.acquisition.work_interfaces import InboundCapture, WorkSnapshot
from pinet_core.acquisition.work_models import MailBinding
from pinet_core.acquisition.work_routes import read_snapshot
from pinet_core.config import settings
from pinet_core.control.routes import password_hash, token_hash
from pinet_core.control_api import app
from pinet_core.db import Database, db
from pinet_core.models import MailMessage

CONFIG = os.environ.get("PINET_ACQ_WORK_QA_CONFIG")
pytestmark = pytest.mark.skipif(not CONFIG, reason="Explicit owned full-chain work QA configuration required")


class FakePreparation:
    async def ask(self, schema, instruction, data):
        if schema is Assessment:
            return Assessment(
                fit="yes",
                intent="possible",
                reasons="Synthetic provider fit",
                evidence_ids=["provider"],
                offer_fact_ids=["pilot"],
                next_action="draft",
                subject="Synthetic pilot enquiry",
                body="Would you like to review the synthetic pilot terms?",
            )
        assert schema is Review
        return Review(
            factual=True,
            relevant=True,
            one_clear_next_step=True,
            no_unverified_promises=True,
            no_source_instructions=True,
            reason="Synthetic source QA review",
        )


@pytest.fixture
async def lane(monkeypatch):
    state = json.loads(Path(CONFIG).read_bytes())
    admin_url, runtime_url = (
        state["urls"][key] for key in ("PINET_ADMIN_DATABASE_URL", "PINET_DATABASE_URL")
    )
    for url in (admin_url, runtime_url):
        parsed = make_url(url)
        assert (
            parsed.host == "127.0.0.1"
            and parsed.port == 15438
            and re.fullmatch(r"pinet_acq_work_\d{14}", parsed.database)
        )
    cfg, environment = settings(), "test-acq-work-" + uuid4().hex
    source = state["source_head"]
    for key, value in {
        "database_url": runtime_url,
        "admin_database_url": admin_url,
        "environment": environment,
        "control_enabled": True,
        "control_mode": "local",
        "control_source_revision": source,
        "control_cursor_secret": secrets.token_hex(32),
        "smtp_enabled": False,
        "voice_enabled": False,
        "acquisition_capture_enabled": True,
        "acquisition_work_enabled": True,
        "customer_enabled": False,
        "chat_enabled": False,
        "xbot_bridge_enabled": False,
        "learning_enabled": False,
    }.items():
        monkeypatch.setattr(cfg, key, value)
    now = datetime.now(UTC)
    ids = {
        key: str(uuid4())
        for key in ("business", "user", "organization", "portfolio", "grant", "membership", "session")
    }
    site = "madbeauty-work-" + uuid4().hex
    scope = Scope(
        business_id=ids["business"], site_id=site, environment_id=environment, environment_class="test"
    )
    adapter, token = "madbeauty-native", secrets.token_urlsafe(48)
    admin = create_async_engine(admin_url)
    async with admin.begin() as tx:
        params = {
            **ids,
            "e": environment,
            "site": site,
            "host": site + ".example.test",
            "source": source,
            "now": now,
            "expires": now + timedelta(minutes=15),
            "token": token_hash(token),
            "password": password_hash(secrets.token_urlsafe(32)),
        }
        statements = (
            "INSERT INTO businesses(id,site_id,canonical_host) VALUES(:business,:site,:host)",
            "INSERT INTO control_users(id,environment_id,username,password_hash,identity_issuer,identity_subject,enabled) VALUES(:user,:e,:user,:password,'synthetic-test',:user,true)",
            "INSERT INTO control_organizations(id,environment_id,key,display_name,creator_user_id) VALUES(:organization,:e,:organization,'Synthetic work QA',:user)",
            "INSERT INTO control_memberships(id,environment_id,user_id,organization_id,role,enabled) VALUES(:membership,:e,:user,:organization,'owner',true)",
            "INSERT INTO control_portfolios(id,environment_id,organization_id,display_name) VALUES(:portfolio,:e,:organization,'Synthetic work QA')",
            "INSERT INTO control_business_grants(id,environment_id,portfolio_id,organization_id,business_id,display_name,connection_status,runtime_status,evidence_revision,enabled) VALUES(:grant,:e,:portfolio,:organization,:business,'Synthetic work QA','registered','not_connected',:source,true)",
            "INSERT INTO control_sessions(id,environment_id,user_id,token_hash,created_at,expires_at) VALUES(:session,:e,:user,:token,:now,:expires)",
            'INSERT INTO acquisition_modules(business_id,environment_id,organization_id,approved_by_user_id,site_id,adapter_id,enabled,permissions,source_revision,approved_at,expires_at) VALUES(:business,:e,:organization,:user,:site,\'madbeauty-native\',true,\'["acquisition.capture","acquisition.read","acquisition.correspondence","acquisition.correspondence.read"]\',:source,:now,:expires)',
        )
        for sql in statements:
            await tx.execute(text(sql), params)
    native = {
        "scope": scope.model_dump(),
        "adapter_id": adapter,
        "transport_key_id": "native-" + uuid4().hex,
        "recipient_key_id": "recipient-" + uuid4().hex,
        "transport_secret": secrets.token_hex(32),
        "recipient_secret": secrets.token_hex(32),
        "permissions": ["capture", "events"],
    }
    work = {
        "scope": scope.model_dump(),
        "adapter_id": adapter,
        "inbound_key_id": "work-" + uuid4().hex,
        "inbound_secret": secrets.token_hex(32),
        "permissions": ["inbound-capture"],
    }
    paths = {}
    for key, entry in (("acquisition_capture_config", native), ("acquisition_work_config", work)):
        path = ROOT / "artifacts" / (key + "-" + uuid4().hex + ".private.json")
        path.write_text(json.dumps({"entries": [entry]}), encoding="utf-8")
        monkeypatch.setattr(cfg, key, str(path))
        paths[key] = path
    engine = create_async_engine(runtime_url, pool_pre_ping=True)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(db, "sessions", async_sessionmaker(engine, expire_on_commit=False))
    campaign = Campaign(
        site_id=site,
        campaign_id="synthetic-pilot",
        mode="draft_only",
        objective="provider_signup",
        enabled=True,
        segments=["salon"],
        countries=["LT"],
        expires_at=now + timedelta(days=1),
        facts=[
            {
                "id": "pilot",
                "text": "Synthetic pilot for source QA only.",
                "source": "synthetic-owner-facts",
                "expires_at": now + timedelta(days=1),
            }
        ],
    )
    prospect = Prospect(
        site_id=site,
        organization_key="synthetic-salon",
        name="Synthetic salon",
        role="provider",
        segment="salon",
        country="LT",
        evidence=[
            {
                "id": "provider",
                "url": "https://example.test/salon",
                "fact": "Synthetic salon listing.",
                "checked_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=1),
                "use_allowed": True,
            }
        ],
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 12345)), base_url="http://127.0.0.1"
        ) as client:
            yield SimpleNamespace(
                cfg=cfg,
                ids=ids,
                scope=scope,
                adapter=adapter,
                admin=admin,
                client=client,
                service=app.state.acquisition_correspondence,
                entry=app.state.acquisition_work_registration.entries[0],
                campaign=campaign,
                prospect=prospect,
                prepared=await prepare(campaign, prospect, FakePreparation(), now),
                request_id=uuid4(),
                token=token,
                runtime_url=runtime_url,
                paths=paths,
            )
    await admin.dispose()


async def capture(lane, **changes):
    return await lane.service.capture_reviewed(
        **{
            "scope": lane.scope,
            "adapter_id": lane.adapter,
            "request_id": lane.request_id,
            "recipient": "owner@example.test",
            "campaign": lane.campaign,
            "prospect": lane.prospect,
            "prepared": lane.prepared,
            **changes,
        }
    )


async def mutate(lane, sql, extra=None):
    async with lane.admin.begin() as tx:
        await tx.execute(text(sql), {**lane.ids, "e": lane.scope.environment_id, **(extra or {})})


async def incoming(lane, captured, body="Synthetic reply", **changes):
    saved = json.loads(captured.body)
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        parent = await tx.get(MailMessage, saved["mail_id"])
        value = {
            "scope": lane.scope.model_dump(),
            "adapter_id": lane.adapter,
            "request_id": str(uuid4()),
            "thread_id": saved["thread_id"],
            "parent_mail_id": saved["mail_id"],
            "sender": "owner@example.test",
            "recipient": "info@pinet.lt",
            "message_id": f"<{uuid4()}@example.test>",
            "in_reply_to": parent.message_id,
            "subject": "Synthetic reply",
            "body": body,
            **changes,
        }
    return value


async def post(lane, value, raw=None, headers=None):
    path = f"/integrations/acquisition-work/v1/sites/{lane.scope.site_id}/inbound-capture"
    raw = raw if raw is not None else json.dumps(value, separators=(",", ":")).encode()
    headers = headers or work_config.sign_request(lane.entry, path, raw, work_config.clock_seconds())
    return await lane.client.post(path, content=raw, headers=headers)


async def snapshot(lane):
    response = await lane.client.get(
        f"/operator/v2/businesses/{lane.ids['business']}/acquisition-correspondence",
        headers={"Authorization": "Bearer " + lane.token},
    )
    assert response.status_code == 200
    return response.json()["data"]


async def decision(lane, received, *, request_id=None, **changes):
    item = received.json()
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        await apply_scope(tx, lane.scope, lane.adapter)
        binding = await tx.scalar(select(MailBinding).where(MailBinding.mail_id == item["mail_id"]))
        body_hash = binding.input_sha256
    value = ReplyDecision(
        **{
            "classification": "refusal",
            "action": "stop",
            "subject": "",
            "body": "",
            "offer_fact_ids": [],
            "evidence_ids": [],
            "reason": "Synthetic recipient refusal",
            **changes,
        }
    )
    return await lane.service.apply_decision(
        scope=lane.scope,
        adapter_id=lane.adapter,
        thread_id=item["thread_id"],
        inbound_id=item["mail_id"],
        revision=item["revision"],
        input_sha256=body_hash,
        request_id=request_id or uuid4(),
        decision=value,
        instruction_hash=fingerprint([compose(lane.campaign.sector)[0], REPLY_INSTRUCTION]),
    )


async def test_canonical_mail_case_immediate_hold_and_shared_read(lane):
    captured = await capture(lane)
    reply = await post(lane, await incoming(lane, captured))
    assert reply.status_code == 200 and reply.json()["marketing_state"] == "hold"
    current = await snapshot(lane)
    internal = await read_snapshot(
        app, db, business_id=lane.ids["business"], user_id=lane.ids["user"], session_id=lane.ids["session"]
    )
    assert current["counts"] == internal.counts.model_dump()
    assert current["watermark"] == internal.watermark.model_dump()
    assert WorkSnapshot.model_validate_json(json.dumps(current)).counts.inbound_captured == 1
    async with lane.admin.connect() as tx:
        assert (
            await tx.scalar(
                text("SELECT count(*) FROM cases WHERE business_id=:business AND environment_id=:e"),
                {**lane.ids, "e": lane.scope.environment_id},
            )
            == 1
        )
        rows = (
            await tx.execute(
                text(
                    "SELECT state,payload FROM mail_messages WHERE business_id=:business AND environment_id=:e"
                ),
                {**lane.ids, "e": lane.scope.environment_id},
            )
        ).all()
        assert len(rows) == 2 and all(
            row.state == "captured" and row.payload["external_sent"] is False for row in rows
        )
        assert (
            await tx.scalar(
                text("SELECT count(*) FROM conversations WHERE business_id=:business AND environment_id=:e"),
                {**lane.ids, "e": lane.scope.environment_id},
            )
            == 0
        )


async def test_exact_replay_after_new_pool_and_changed_bytes_conflict(lane):
    captured = await capture(lane)
    value = await incoming(lane, captured)
    first = await post(lane, value)
    assert first.status_code == 200
    current = await snapshot(lane)
    new_database = Database(lane.runtime_url)
    try:
        raw = json.dumps(value, separators=(",", ":")).encode()
        replay = await Correspondence(new_database).receive(InboundCapture.model_validate_json(raw), raw)
        assert replay.body.encode() == first.content
    finally:
        await new_database.engine.dispose()
    assert (await post(lane, value)).content == first.content
    assert (await post(lane, {**value, "body": "Changed"})).status_code == 409
    assert (await post(lane, value, raw=raw + b" ")).status_code == 409
    assert (await post(lane, {**value, "request_id": str(uuid4())})).status_code == 409
    after = await snapshot(lane)
    assert after["counts"] == current["counts"] and after["watermark"] == current["watermark"]


@pytest.mark.parametrize(
    "change",
    [
        {"sender": "forwarded@example.test"},
        {"parent_mail_id": "wrong-mail"},
        {"in_reply_to": "<wrong@pinet.lt>"},
        {"references": ["<wrong@pinet.lt>"]},
    ],
)
async def test_exact_parent_sender_reference_binding_denied(lane, change):
    captured = await capture(lane)
    response = await post(lane, await incoming(lane, captured, **change))
    assert response.status_code in {403, 409}
    assert (await snapshot(lane))["counts"]["inbound_captured"] == 0


async def test_foreign_scope_and_duplicate_auth_headers_denied(lane):
    captured = await capture(lane)
    value = await incoming(lane, captured)
    value["scope"]["environment_id"] = "test-foreign"
    assert (await post(lane, value)).status_code == 401
    value["scope"]["environment_id"] = lane.scope.environment_id
    path = f"/integrations/acquisition-work/v1/sites/{lane.scope.site_id}/inbound-capture"
    raw = json.dumps(value, separators=(",", ":")).encode()
    headers = list(work_config.sign_request(lane.entry, path, raw, work_config.clock_seconds()).items())
    headers.append(("X-Acq-Work-Key-Id", lane.entry.inbound_key_id))
    assert (await lane.client.post(path, content=raw, headers=headers)).status_code == 401


async def test_refusal_even_blocked_decision_stops_other_campaign(lane):
    captured = await capture(lane)
    received = await post(lane, await incoming(lane, captured, body="Do not contact us again."))
    stopped = await decision(
        lane,
        received,
        action="reply",
        subject="Wrong marketing continuation",
        body="Invalid reply",
        offer_fact_ids=["pilot"],
    )
    assert (
        json.loads(stopped.body)["state"] == "blocked"
        and json.loads(stopped.body)["marketing_state"] == "stopped"
    )
    campaign = lane.campaign.model_copy(update={"campaign_id": "other-campaign"})
    prepared = await prepare(campaign, lane.prospect, FakePreparation(), datetime.now(UTC))
    with pytest.raises(LedgerError) as blocked:
        await capture(lane, campaign=campaign, prepared=prepared, request_id=uuid4())
    assert blocked.value.code == "recipient_marketing_contained"
    assert (await snapshot(lane))["counts"]["stopped_recipients"] == 1


async def test_conditional_quote_persists_without_resume(lane):
    captured = await capture(lane)
    quote = "Contact us only when terms are approved."
    received = await post(lane, await incoming(lane, captured, body=quote))
    hold = await decision(
        lane, received, classification="interest", action="hold", resume_condition_quote=quote
    )
    assert json.loads(hold.body)["state"] == "hold"
    async with lane.admin.connect() as tx:
        policy = (
            await tx.execute(
                text(
                    "SELECT state,resume_condition_quote FROM acquisition_contact_policies WHERE business_id=:business AND environment_id=:e"
                ),
                {**lane.ids, "e": lane.scope.environment_id},
            )
        ).one()
        assert policy.state == "hold" and policy.resume_condition_quote == quote
    with pytest.raises(LedgerError) as blocked:
        await capture(lane, request_id=uuid4())
    assert blocked.value.code == "recipient_marketing_contained"


@pytest.mark.parametrize("barrier", ["stop", "expiry", "campaign_stop"])
async def test_privacy_inbound_case_acceptance_survives_marketing_barrier(lane, barrier):
    captured = await capture(lane)
    if barrier == "stop":
        await mutate(
            lane,
            "UPDATE acquisition_modules SET enabled=false WHERE business_id=:business AND environment_id=:e",
        )
    elif barrier == "expiry":
        await mutate(
            lane,
            "UPDATE acquisition_modules SET approved_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE business_id=:business AND environment_id=:e",
        )
    else:
        await mutate(
            lane,
            "UPDATE acquisition_campaigns SET stopped=true WHERE business_id=:business AND environment_id=:e",
        )
    quote = "Please check removal of my profile from the platform."
    received = await post(lane, await incoming(lane, captured, body=quote))
    assert received.status_code == 200
    request_id = uuid4()
    handoff = await decision(
        lane,
        received,
        request_id=request_id,
        classification="question",
        action="privacy_handoff",
        privacy_request_quote=quote,
    )
    assert json.loads(handoff.body)["handoff_executed"] is True
    replay = await decision(
        lane,
        received,
        request_id=request_id,
        classification="question",
        action="privacy_handoff",
        privacy_request_quote=quote,
    )
    assert replay.body == handoff.body
    current = await snapshot(lane)
    assert current["counts"]["operator_privacy_cases"] == 1 and current["counts"]["outbound_captured"] == 1
    async with lane.admin.connect() as tx:
        assert (
            await tx.scalar(
                text(
                    "SELECT count(*) FROM case_sources WHERE business_id=:business AND environment_id=:e AND source_system='acquisition_privacy_handoff'"
                ),
                {**lane.ids, "e": lane.scope.environment_id},
            )
            == 1
        )


async def test_stale_model_decision_cannot_apply_to_newer_inbound(lane):
    captured = await capture(lane)
    first = await post(lane, await incoming(lane, captured))
    second = await post(lane, await incoming(lane, captured))
    assert second.status_code == 200
    with pytest.raises(LedgerError) as stale:
        await decision(lane, first)
    assert stale.value.code == "correspondence_decision_stale"


@pytest.mark.parametrize("identity", ["control_users", "control_memberships", "control_business_grants"])
async def test_current_identity_revocation_denies_read_and_new_capture(lane, identity):
    await capture(lane)
    where = (
        "id=:user"
        if identity == "control_users"
        else "id=:membership"
        if identity == "control_memberships"
        else "id=:grant"
    )
    await mutate(lane, f"UPDATE {identity} SET enabled=false WHERE environment_id=:e AND {where}")
    response = await lane.client.get(
        f"/operator/v2/businesses/{lane.ids['business']}/acquisition-correspondence",
        headers={"Authorization": "Bearer " + lane.token},
    )
    assert response.status_code in {401, 403, 404}
    with pytest.raises(LedgerError):
        await capture(lane, request_id=uuid4())


async def test_receipt_and_binding_update_delete_forbidden_and_rls_hidden(lane):
    await capture(lane)
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        await apply_scope(tx, lane.scope.model_copy(update={"site_id": "foreign"}), lane.adapter)
        assert not await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM acquisition_work_receipts)"))
    async with db.registry() as tx:
        for table in ("acquisition_work_receipts", "acquisition_mail_bindings"):
            assert not await tx.scalar(
                text(
                    f"SELECT has_table_privilege(current_user,'{table}','UPDATE') OR has_table_privilege(current_user,'{table}','DELETE')"
                )
            )


async def test_immutable_parent_payload_tamper_denied(lane):
    captured = await capture(lane)
    value = await incoming(lane, captured)
    await mutate(
        lane,
        'UPDATE mail_messages SET payload=payload || \'{"recipient":"forwarded@example.test"}\'::jsonb WHERE id=:mail',
        {"mail": json.loads(captured.body)["mail_id"]},
    )
    assert (await post(lane, value)).status_code == 409


async def test_work_flag_or_changed_private_registration_denies_ingress(lane, monkeypatch):
    captured = await capture(lane)
    value = await incoming(lane, captured)
    monkeypatch.setattr(lane.cfg, "acquisition_work_enabled", False)
    assert (await post(lane, value)).status_code == 503
    monkeypatch.setattr(lane.cfg, "acquisition_work_enabled", True)
    path = lane.paths["acquisition_work_config"]
    path.write_bytes(path.read_bytes() + b" ")
    assert (await post(lane, value)).status_code == 503


async def test_expiry_clock_is_checked_after_campaign_lock_wait(lane):
    await capture(lane)
    prospect = lane.prospect.model_copy(update={"organization_key": "other-synthetic-salon"})
    prepared = await prepare(lane.campaign, prospect, FakePreparation(), datetime.now(UTC))
    await mutate(
        lane,
        "UPDATE acquisition_modules SET expires_at=clock_timestamp()+interval '1 second' WHERE business_id=:business AND environment_id=:e",
    )
    async with lane.admin.connect() as connection:
        transaction = await connection.begin()
        await connection.execute(
            text(
                "SELECT 1 FROM acquisition_campaigns WHERE business_id=:business AND environment_id=:e FOR UPDATE"
            ),
            {**lane.ids, "e": lane.scope.environment_id},
        )
        pending = asyncio.create_task(
            capture(
                lane,
                recipient="second@example.test",
                prospect=prospect,
                prepared=prepared,
                request_id=uuid4(),
            )
        )
        try:
            deadline = asyncio.get_running_loop().time() + 3
            while True:
                async with lane.admin.connect() as observer:
                    waiting = await observer.scalar(
                        text(
                            "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND usename='pinet_runtime' AND wait_event_type='Lock' AND query LIKE '%acquisition_campaigns%')"
                        )
                    )
                if waiting:
                    break
                assert asyncio.get_running_loop().time() < deadline, (
                    "Owned capture must actually wait on campaign row"
                )
                await asyncio.sleep(0.03)
            await asyncio.sleep(1.2)
        finally:
            await transaction.rollback()
        with pytest.raises(LedgerError) as expired:
            await asyncio.wait_for(pending, timeout=3)
        assert expired.value.code == "acquisition_approval_expired"
    assert (await snapshot(lane))["counts"]["outbound_captured"] == 1


async def test_source_change_denies_new_capture_but_preserves_exact_old_ack(lane):
    first = await capture(lane)
    await mutate(
        lane,
        "UPDATE acquisition_modules SET source_revision=:changed WHERE business_id=:business AND environment_id=:e",
        {"changed": "f" * 40},
    )
    assert (await capture(lane)).body == first.body
    with pytest.raises(LedgerError) as changed:
        await capture(lane, request_id=uuid4())
    assert changed.value.code == "acquisition_source_changed"
    assert (await snapshot(lane))["marketing_configuration"] == "source_changed"


async def test_database_rejects_foreign_core_mail_uuid_binding(lane):
    captured = json.loads((await capture(lane)).body)
    foreign = {
        "business": str(uuid4()),
        "case": str(uuid4()),
        "mail": str(uuid4()),
        "site": "foreign-" + uuid4().hex,
    }
    foreign["host"] = foreign["site"] + ".example.test"
    foreign["message_id"] = "<" + foreign["mail"] + "@example.test>"
    async with lane.admin.begin() as tx:
        await tx.execute(
            text("INSERT INTO businesses(id,site_id,canonical_host) VALUES(:business,:site,:host)"),
            foreign,
        )
        await tx.execute(
            text(
                "INSERT INTO cases(id,business_id,environment_id,payload,created_at) VALUES(:case,:business,'test-foreign','{}',clock_timestamp())"
            ),
            foreign,
        )
        await tx.execute(
            text(
                "INSERT INTO mail_messages(id,business_id,environment_id,case_id,message_id,direction,state,payload,created_at) VALUES(:mail,:business,'test-foreign',:case,:message_id,'inbound','captured','{}',clock_timestamp())"
            ),
            foreign,
        )
    with pytest.raises(DBAPIError) as denied:
        async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
            await apply_scope(tx, lane.scope, lane.adapter)
            await tx.execute(
                text(
                    "INSERT INTO acquisition_mail_bindings(business_id,environment_id,site_id,environment_class,adapter_id,mail_id,thread_id,direction,payload_sha256,input_sha256,created_at) VALUES(:business,:e,:site,'test',:adapter,:mail,:thread,'inbound',:hash,:hash,clock_timestamp())"
                ),
                {
                    **lane.ids,
                    "e": lane.scope.environment_id,
                    "site": lane.scope.site_id,
                    "adapter": lane.adapter,
                    "mail": foreign["mail"],
                    "thread": captured["thread_id"],
                    "hash": "a" * 64,
                },
            )
    assert denied.value.orig.sqlstate == "23503"


async def test_invalid_privacy_quote_has_no_handoff_ack(lane):
    captured = await capture(lane)
    received = await post(lane, await incoming(lane, captured, body="Please check the profile."))
    result = json.loads(
        (
            await decision(
                lane,
                received,
                classification="question",
                action="privacy_handoff",
                privacy_request_quote="Invented request",
            )
        ).body
    )
    assert result["state"] == "blocked" and result["handoff_executed"] is False
    assert (await snapshot(lane))["counts"]["operator_privacy_cases"] == 0


async def test_post_refusal_privacy_request_keeps_stop_and_creates_case(lane):
    captured = await capture(lane)
    first = await post(lane, await incoming(lane, captured, body="Do not contact us again."))
    assert json.loads((await decision(lane, first)).body)["marketing_state"] == "stopped"
    quote = "Please check removal of my profile."
    second = await post(lane, await incoming(lane, captured, body=quote))
    result = json.loads(
        (
            await decision(
                lane, second, classification="question", action="privacy_handoff", privacy_request_quote=quote
            )
        ).body
    )
    assert result["marketing_state"] == "stopped" and result["handoff_executed"] is True


async def test_new_uuid_and_fresh_revision_cannot_repeat_same_inbound_decision(lane):
    captured = await capture(lane)
    quote = "Please check removal of my profile."
    received = await post(lane, await incoming(lane, captured, body=quote))
    first = await decision(
        lane, received, classification="question", action="privacy_handoff", privacy_request_quote=quote
    )
    assert json.loads(first.body)["handoff_executed"] is True
    revision = (await snapshot(lane))["threads"][0]["revision"]
    candidate = httpx.Response(200, json={**received.json(), "revision": revision})
    with pytest.raises(LedgerError) as denied:
        await decision(
            lane, candidate, classification="question", action="privacy_handoff", privacy_request_quote=quote
        )
    assert denied.value.code == "correspondence_decision_already_committed"
    assert (await snapshot(lane))["counts"]["operator_privacy_cases"] == 1


async def test_concurrent_canonical_invite_and_copy_share_campaign_lock(lane, monkeypatch):
    import hashlib

    from pinet_core.acquisition.models import AcquisitionCampaign

    scalar = AsyncSession.scalar
    observed, release = asyncio.Event(), asyncio.Event()

    async def pause_canonical_after_absent_campaign(session, statement, *args, **kwargs):
        result = await scalar(session, statement, *args, **kwargs)
        if (
            asyncio.current_task().get_name() == "canonical_prepare"
            and "acquisition_campaigns" in str(statement)
            and result is None
        ):
            observed.set()
            await release.wait()
        return result

    monkeypatch.setattr(AsyncSession, "scalar", pause_canonical_after_absent_campaign)
    recipient = await canonical_recipient(
        "owner@example.test",
        node=shutil.which("node"),
        expected_codec_sha256=hashlib.sha256(CODEC.read_bytes()).hexdigest(),
    )
    now = datetime.now(UTC)
    invitation = Invitation(
        scope=lane.scope,
        invitation_ref=uuid4().hex + uuid4().hex,
        campaign_id=lane.campaign.campaign_id,
        prospect_id="synthetic-salon",
        offer_revision="synthetic-offer-v1",
        issued_at=now - timedelta(seconds=1),
        expires_at=now + timedelta(minutes=5),
    )
    runtime = app.state.acquisition_runtime
    key = next(iter(runtime.ledger.recipient_keys.values()))
    canonical = asyncio.create_task(
        runtime.ledger.prepare(invitation, lane.adapter, recipient, key.key_id), name="canonical_prepare"
    )
    await asyncio.wait_for(observed.wait(), timeout=3)
    copy = asyncio.create_task(capture(lane), name="correspondence_capture")
    try:
        deadline = asyncio.get_running_loop().time() + 3
        while not copy.done():
            async with lane.admin.connect() as tx:
                waiting = await tx.scalar(
                    text(
                        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND usename='pinet_runtime' AND wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock%')"
                    )
                )
            if waiting:
                break
            assert asyncio.get_running_loop().time() < deadline
            await asyncio.sleep(0.03)
    finally:
        release.set()
    results = await asyncio.wait_for(asyncio.gather(canonical, copy, return_exceptions=True), timeout=4)
    assert not any(isinstance(item, BaseException) for item in results), (
        "Both maintained preparations must succeed without a PK conflict"
    )
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        await apply_scope(tx, lane.scope, lane.adapter)
        assert len(list(await tx.scalars(select(AcquisitionCampaign)))) == 1
