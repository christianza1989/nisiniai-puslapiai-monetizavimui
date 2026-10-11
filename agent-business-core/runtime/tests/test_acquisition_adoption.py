"""Opt-in normal entrypoint on a fresh full-chain restricted-role PostgreSQL DB."""

import asyncio
import hashlib
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
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from pinet_core.acquisition import normal
from pinet_core.acquisition.identity import CODEC, canonical_recipient
from pinet_core.acquisition.interfaces import Invitation, Scope
from pinet_core.acquisition.ledger import apply_scope
from pinet_core.acquisition.normal_config import ROOT
from pinet_core.acquisition.recipient_binding import ADDRESS_RULE, recipient_digest
from pinet_core.acquisition.transport_auth import WEBHOOK_PERMISSIONS, sign_request
from pinet_core.config import settings
from pinet_core.control.routes import ControlError, password_hash, token_hash
from pinet_core.control_api import app
from pinet_core.db import db

CONFIG = os.environ.get("PINET_ACQ_ADOPTION_CONFIG")
pytestmark = pytest.mark.skipif(not CONFIG, reason="Explicit owned full-chain QA configuration required")


@pytest.fixture
async def lane(monkeypatch):
    registration = json.loads(Path(CONFIG).read_bytes())
    admin_url, runtime_url = (
        registration["urls"][k] for k in ("PINET_ADMIN_DATABASE_URL", "PINET_DATABASE_URL")
    )
    for url in (admin_url, runtime_url):
        parsed = make_url(url)
        assert parsed.host == "127.0.0.1" and parsed.port == 15438
        assert re.fullmatch(r"pinet_acq_full_\d{14}", parsed.database)
    cfg = settings()
    environment = "test-normal-acq-" + uuid4().hex
    source = "a" * 40
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
    site = "madbeauty-test-" + uuid4().hex
    scope = Scope(
        business_id=ids["business"], site_id=site, environment_id=environment, environment_class="test"
    )
    adapter = "madbeauty-native"
    token = secrets.token_urlsafe(48)
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
            "INSERT INTO control_organizations(id,environment_id,key,display_name,creator_user_id) VALUES(:organization,:e,:organization,'Synthetic acquisition test',:user)",
            "INSERT INTO control_memberships(id,environment_id,user_id,organization_id,role,enabled) VALUES(:membership,:e,:user,:organization,'owner',true)",
            "INSERT INTO control_portfolios(id,environment_id,organization_id,display_name) VALUES(:portfolio,:e,:organization,'Synthetic acquisition test')",
            "INSERT INTO control_business_grants(id,environment_id,portfolio_id,organization_id,business_id,display_name,connection_status,runtime_status,evidence_revision,enabled) VALUES(:grant,:e,:portfolio,:organization,:business,'Synthetic acquisition test','registered','not_connected',:source,true)",
            "INSERT INTO control_sessions(id,environment_id,user_id,token_hash,created_at,expires_at) VALUES(:session,:e,:user,:token,:now,:expires)",
            "INSERT INTO acquisition_modules(business_id,environment_id,organization_id,approved_by_user_id,site_id,adapter_id,enabled,permissions,source_revision,approved_at,expires_at) VALUES(:business,:e,:organization,:user,:site,'madbeauty-native',true,'[\"acquisition.capture\",\"acquisition.read\"]',:source,:now,:expires)",
        )
        for statement in statements:
            await tx.execute(text(statement), params)
    path = ROOT / "artifacts" / ("normal-acq-registration-" + uuid4().hex + ".private.json")
    path.write_text(
        json.dumps(
            {
                "entries": [
                    {
                        "scope": scope.model_dump(),
                        "adapter_id": adapter,
                        "transport_key_id": "transport-" + uuid4().hex,
                        "transport_secret": secrets.token_hex(32),
                        "recipient_key_id": "recipient-v1",
                        "recipient_secret": secrets.token_hex(32),
                        "permissions": sorted(WEBHOOK_PERMISSIONS),
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(cfg, "acquisition_capture_config", str(path))
    engine = create_async_engine(runtime_url, pool_pre_ping=True)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(db, "sessions", async_sessionmaker(engine, expire_on_commit=False))
    async with app.router.lifespan_context(app):
        runtime = app.state.acquisition_runtime
        recipient_key = next(iter(runtime.ledger.recipient_keys.values()))
        grant = next(iter(runtime.grants.values()))
        invitation = Invitation(
            scope=scope,
            invitation_ref=uuid4().hex + uuid4().hex,
            campaign_id="campaign-" + uuid4().hex,
            prospect_id="prospect-" + uuid4().hex,
            offer_revision="synthetic-offer-v1",
            issued_at=now - timedelta(seconds=1),
            expires_at=now + timedelta(minutes=10),
        )
        recipient = await canonical_recipient(
            "owner@example.test",
            node=shutil.which("node"),
            expected_codec_sha256=hashlib.sha256(CODEC.read_bytes()).hexdigest(),
        )
        await runtime.ledger.prepare(invitation, adapter, recipient, recipient_key.key_id)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 12345)), base_url="http://127.0.0.1"
        ) as client:
            yield SimpleNamespace(
                admin=admin,
                cfg=cfg,
                ids=ids,
                scope=scope,
                adapter=adapter,
                token=token,
                invitation=invitation,
                runtime=runtime,
                recipient_key=recipient_key,
                grant=grant,
                client=client,
                registration_path=path,
            )
    await admin.dispose()


async def mutate(lane, sql, extra=None):
    async with lane.admin.begin() as tx:
        await tx.execute(text(sql), {**lane.ids, "e": lane.scope.environment_id, **(extra or {})})


def request(lane):
    return {
        "recipient_contract_version": "0.1.0",
        "scope": lane.scope.model_dump(),
        "adapter_id": lane.adapter,
        "invitation_ref": lane.invitation.invitation_ref,
        "request_id": str(uuid4()),
    }


async def post(lane, endpoint, value, raw=None):
    body = raw if raw is not None else json.dumps(value, separators=(",", ":")).encode()
    path = f"/integrations/acquisition/v1/sites/{lane.scope.site_id}/{endpoint}"
    headers = sign_request(lane.grant, path, body, int(datetime.now(UTC).timestamp()))
    return await lane.client.post(path, content=body, headers=headers)


async def report(lane, suffix=""):
    return await lane.client.get(
        f"/operator/v2/businesses/{lane.ids['business']}/acquisition" + suffix,
        headers={"Authorization": "Bearer " + lane.token},
    )


@pytest.mark.asyncio
async def test_normal_owner_api_and_internal_director_share_core_snapshot(lane):
    sent = await post(lane, "recipient-challenge", request(lane))
    assert sent.status_code == 200, sent.text
    response = await report(lane)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "private, no-store"
    data = response.json()["data"]
    internal = await normal.read_snapshot(
        app, db, business_id=lane.ids["business"], user_id=lane.ids["user"], session_id=lane.ids["session"]
    )
    assert data["counts"] == internal.model_dump(mode="json")["counts"]
    assert data["last_committed_receipt_at"] == internal.model_dump(mode="json")["last_committed_receipt_at"]
    assert data["projection_contract_version"] == "0.1.0" and data["counts"]["committed_commands"] == 1
    assert data["counts"]["outreach_sent"] is None and data["full_pipeline_accepted"] is False
    assert "owner@example.test" not in response.text and data["external_sent"] is False


@pytest.mark.asyncio
async def test_foreign_owner_and_query_scope_denied(lane):
    assert (await report(lane, "?environment_id=production")).status_code == 400
    foreign = await lane.client.get(
        f"/operator/v2/businesses/{uuid4()}/acquisition", headers={"Authorization": "Bearer " + lane.token}
    )
    assert foreign.status_code == 404
    with pytest.raises(ControlError) as denied:
        await normal.read_snapshot(
            app, db, business_id=lane.ids["business"], user_id=str(uuid4()), session_id=lane.ids["session"]
        )
    assert denied.value.status == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "change,expected",
    [
        ("UPDATE control_memberships SET enabled=false WHERE id=:membership", 404),
        ("UPDATE control_business_grants SET enabled=false WHERE id=:grant", 404),
        ("UPDATE control_sessions SET revoked_at=clock_timestamp() WHERE id=:session", 401),
        (
            "UPDATE acquisition_modules SET permissions='[\"acquisition.capture\"]' WHERE business_id=:business AND environment_id=:e",
            403,
        ),
        (
            "UPDATE acquisition_modules SET expires_at=clock_timestamp()-interval '1 second',approved_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business AND environment_id=:e",
            409,
        ),
        (
            "UPDATE acquisition_modules SET source_revision=repeat('b',40) WHERE business_id=:business AND environment_id=:e",
            409,
        ),
    ],
)
async def test_report_rechecks_current_authority(lane, change, expected):
    assert (await report(lane)).status_code == 200
    await mutate(lane, change)
    assert (await report(lane)).status_code == expected


@pytest.mark.asyncio
async def test_config_change_and_disabled_module_fail_closed(lane, monkeypatch):
    lane.registration_path.write_bytes(lane.registration_path.read_bytes() + b"\n")
    assert (await report(lane)).status_code == 503
    assert (await post(lane, "recipient-challenge", request(lane))).status_code == 503
    monkeypatch.setattr(lane.cfg, "acquisition_capture_enabled", False)
    assert (await report(lane)).status_code == 503


@pytest.mark.asyncio
async def test_immutable_replay_after_module_stop_and_expiry(lane):
    value = request(lane)
    original = await post(lane, "recipient-challenge", value)
    assert original.status_code == 200
    await mutate(
        lane,
        "UPDATE acquisition_modules SET enabled=false,expires_at=clock_timestamp()-interval '1 second',approved_at=clock_timestamp()-interval '1 minute' WHERE business_id=:business AND environment_id=:e",
    )
    replay = await post(lane, "recipient-challenge", value)
    assert replay.status_code == 200 and replay.content == original.content
    assert (
        await post(lane, "recipient-challenge", value, json.dumps(value, indent=2).encode())
    ).status_code == 409
    assert (await post(lane, "recipient-challenge", request(lane))).status_code == 409


@pytest.mark.asyncio
async def test_fresh_module_clock_after_module_lock(lane):
    async with lane.admin.connect() as lock:
        transaction = await lock.begin()
        await lock.execute(
            text(
                "UPDATE acquisition_modules SET expires_at=clock_timestamp()+interval '1 second' WHERE business_id=:b AND environment_id=:e"
            ),
            {"b": lane.ids["business"], "e": lane.scope.environment_id},
        )
        pending = asyncio.create_task(post(lane, "recipient-challenge", request(lane)))
        await asyncio.sleep(1.2)
        assert not pending.done(), "callback must wait for module approval row"
        await transaction.commit()
        response = await pending
    assert response.status_code == 409 and response.json()["detail"] == "acquisition_approval_expired"


@pytest.mark.asyncio
async def test_fresh_challenge_clock_after_last_proof_lock(lane):
    value = request(lane)
    challenge_response = await post(lane, "recipient-challenge", value)
    assert challenge_response.status_code == 200
    challenge = challenge_response.json()["challenge"]
    proof = {
        **request(lane),
        "challenge_nonce": challenge["challenge_nonce"],
        "recipient_key_id": lane.recipient_key.key_id,
        "address_rule": ADDRESS_RULE,
        "recipient_digest": recipient_digest(
            lane.recipient_key,
            lane.invitation.invitation_ref,
            challenge["challenge_nonce"],
            "owner@example.test",
        ),
        "native_account_ref": "native-owner",
        "native_verified_at": datetime.now(UTC).isoformat(),
        "source_release": "synthetic-native-v1",
    }
    # A different transaction holds the final nonce row while the invitation is otherwise available.
    async with lane.admin.connect() as lock:
        transaction = await lock.begin()
        await lock.execute(
            text(
                "UPDATE acquisition_challenges SET expires_at=clock_timestamp()+interval '1 second' WHERE business_id=:b AND environment_id=:e AND challenge_nonce=:n"
            ),
            {"b": lane.ids["business"], "e": lane.scope.environment_id, "n": challenge["challenge_nonce"]},
        )
        pending = asyncio.create_task(post(lane, "verify-recipient", proof))
        await asyncio.sleep(1.2)
        assert not pending.done(), "callback must wait for final nonce row"
        await transaction.commit()
        response = await pending
    assert response.status_code == 410, "a proof must expire after the final database wait"


@pytest.mark.asyncio
async def test_normal_startup_rejects_mismatched_site_registration(lane):
    await mutate(
        lane, "UPDATE businesses SET site_id=:s WHERE id=:business", {"s": "foreign-site-" + uuid4().hex}
    )
    with pytest.raises(RuntimeError, match="registered_acquisition_module_required"):
        await normal.start(SimpleNamespace(state=SimpleNamespace()), db)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "revoke",
    [
        "UPDATE control_users SET enabled=false WHERE id=:user AND environment_id=:e",
        "UPDATE control_memberships SET enabled=false WHERE id=:membership AND environment_id=:e",
        "UPDATE control_business_grants SET enabled=false WHERE id=:grant AND environment_id=:e",
    ],
)
async def test_approving_identity_rows_serialized_with_new_binding(lane, revoke):
    challenge_response = await post(lane, "recipient-challenge", request(lane))
    assert challenge_response.status_code == 200
    challenge = challenge_response.json()["challenge"]
    proof = {
        **request(lane),
        "challenge_nonce": challenge["challenge_nonce"],
        "recipient_key_id": lane.recipient_key.key_id,
        "address_rule": ADDRESS_RULE,
        "recipient_digest": recipient_digest(
            lane.recipient_key,
            lane.invitation.invitation_ref,
            challenge["challenge_nonce"],
            "owner@example.test",
        ),
        "native_account_ref": "native-owner",
        "native_verified_at": datetime.now(UTC).isoformat(),
        "source_release": "synthetic-native-v1",
    }
    async with lane.admin.connect() as lock:
        transaction = await lock.begin()
        await lock.execute(
            text(
                "SELECT 1 FROM acquisition_challenges WHERE business_id=:b AND environment_id=:e AND challenge_nonce=:n FOR UPDATE"
            ),
            {"b": lane.ids["business"], "e": lane.scope.environment_id, "n": challenge["challenge_nonce"]},
        )
        holder = await lock.scalar(text("SELECT pg_backend_pid()"))
        pending = asyncio.create_task(post(lane, "verify-recipient", proof))
        for _ in range(50):
            if await lock.scalar(
                text("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE :p=ANY(pg_blocking_pids(pid)))"),
                {"p": holder},
            ):
                break
            await asyncio.sleep(0.05)
        else:
            await transaction.rollback()
            await pending
            pytest.fail("proof did not reach the final nonce barrier")
        revocation = asyncio.create_task(mutate(lane, revoke))
        await asyncio.sleep(0.2)
        prematurely_committed = revocation.done()
        await transaction.commit()
        response = await pending
        await revocation
    assert not prematurely_committed, (
        "owner identity revocation must serialize with an already pinned new binding"
    )
    assert response.status_code == 200
    assert (await post(lane, "recipient-challenge", request(lane))).status_code == 403


@pytest.mark.asyncio
async def test_runtime_cannot_write_module_authorization_or_receipts(lane):
    async with db.registry() as tx:
        row = (
            await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))
        ).one()
        assert tuple(row) == (False, False)
        assert not await tx.scalar(
            text(
                "SELECT has_table_privilege(current_user,'acquisition_modules','UPDATE') OR has_table_privilege(current_user,'acquisition_receipts','UPDATE') OR has_table_privilege(current_user,'acquisition_receipts','DELETE')"
            )
        )
        await apply_scope(tx, lane.scope, lane.adapter)
        # The locking helper cannot pin a foreign module, even though its definer can bypass RLS.
        assert not await tx.scalar(
            text("SELECT acquisition_pin_module(:b,:e,:s,:a)"),
            {"b": str(uuid4()), "e": lane.scope.environment_id, "s": lane.scope.site_id, "a": lane.adapter},
        )
