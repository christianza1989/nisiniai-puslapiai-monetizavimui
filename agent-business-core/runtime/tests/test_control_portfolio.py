"""Real PostgreSQL acceptance: auth, tenant RLS, revocation and atomic bootstrap."""
import asyncio
import json
import os
import secrets
import socket
import subprocess
import sys
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.control.bootstrap import bootstrap
from pinet_core.control.models import BusinessGrant, LoginBucket, Membership, Organization, Session, User
from pinet_core.control.routes import scope, seal_cursor, token_hash
from pinet_core.db import db
from pinet_core.models import Business, utcnow


@pytest.fixture
async def pilot(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "control_enabled", True)
    monkeypatch.setattr(cfg, "control_cursor_secret", secrets.token_hex(32))
    monkeypatch.setattr(cfg, "control_source_revision", "a" * 40)
    client.base_url = "http://127.0.0.1:8846"
    admin = create_async_engine(cfg.admin_database_url)
    namespace = uuid4().hex[:12]
    entries = [{"site_id": f"test-{namespace}-{index}", "canonical_host": f"{namespace}-{index}.example.test",
                "display_name": f"Synthetic isolation business {index}", "evidence_revision": "b" * 40}
               for index in range(3)]
    passwords = [secrets.token_urlsafe(32), secrets.token_urlsafe(32)]
    inputs, receipts = [], []
    try:
        for index in range(2):
            value = {"environment": cfg.environment, "username": f"test-{namespace}-{index}",
                     "password": passwords[index], "organization_key": f"org-{namespace}-{index}",
                     "organization_name": f"Synthetic organization {index}", "portfolio_name": f"Test portfolio {index}",
                     "entries": entries[:2] if index == 0 else entries[2:], "allow_new_businesses": True}
            async with AsyncSession(admin) as tx, tx.begin():
                receipts.append(await bootstrap(tx, **value))
            inputs.append(value)
        yield {"client": client, "admin": admin, "inputs": inputs, "receipts": receipts}
    finally:
        async with AsyncSession(admin) as tx, tx.begin():
            for model in (Organization, User, LoginBucket):
                await tx.execute(delete(model).where(model.environment_id == cfg.environment))
            await tx.execute(delete(Business).where(Business.site_id.in_([e["site_id"] for e in entries])))
        await admin.dispose()


async def login(pilot, index=0):
    value = pilot["inputs"][index]
    response = await pilot["client"].post("/operator/v2/auth/login", json={k: value[k] for k in ("username", "password")})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert set(payload) == {"access_token", "token_type", "expires_at"}
    assert payload["token_type"] == "Bearer" and len(payload["access_token"]) == 64
    return {"Authorization": "Bearer " + payload["access_token"]}


def endpoint(pilot, index=0):
    return f"/operator/v2/portfolios/{pilot['receipts'][index]['portfolio_id']}/businesses"


async def test_two_org_projection_foreign_ids_and_capabilities(pilot):
    client = pilot["client"]
    a, b = await login(pilot), await login(pilot, 1)
    me = (await client.get("/operator/v2/me", headers=a)).json()
    assert [p["portfolio_id"] for p in me["data"]["portfolios"]] == [pilot["receipts"][0]["portfolio_id"]]
    result = await client.get(endpoint(pilot), headers=a)
    assert result.status_code == 200 and result.headers["cache-control"] == "private, no-store"
    items = result.json()["data"]["items"]
    assert len(items) == 2 and result.json()["data"]["next_cursor"] is None
    assert all(i["stage"] is None and i["runtime_status"] == "not_connected"
               and i["last_verified_activity_at"] is None for i in items)
    assert (await client.get(endpoint(pilot, 1), headers=a)).status_code == 404
    assert (await client.get(endpoint(pilot), headers=b)).status_code == 404
    foreign = pilot["receipts"][1]["business_ids"][0]
    assert (await client.get(f"/operator/v2/businesses/{foreign}", headers=a)).status_code == 404
    own = pilot["receipts"][0]["business_ids"][0]
    assert (await client.get(f"/operator/v2/businesses/{own}", headers=a)).json()["data"]["business_id"] == own
    assert (await client.get("/operator/v2/capabilities", headers=a)).json()["data"] == {"capabilities": ["portfolio.read"]}
    forbidden = {"password_hash", "username", "token_hash", "contacts", "transcripts", "email", "payload"}
    assert not forbidden.intersection(items[0])


async def test_legacy_secrets_and_forged_claims_cannot_authorize(pilot):
    client, cfg = pilot["client"], settings()
    for token in (cfg.operator_secret, cfg.edge_secret, cfg.worker_secret, secrets.token_urlsafe(48)):
        result = await client.get("/operator/v2/me", headers={"Authorization": f"Bearer {token}",
                                                            "x-pinet-user": pilot["receipts"][0]["user_id"]})
        assert result.status_code == 401
        assert result.headers["www-authenticate"] == "Bearer"
    headers = await login(pilot)
    headers["x-pinet-organization"] = pilot["receipts"][1]["organization_id"]
    assert (await client.get(endpoint(pilot, 1), headers=headers)).status_code == 404


async def test_logout_persisted_hash_only_and_pool_restart(pilot):
    headers = await login(pilot)
    token = headers["Authorization"][7:]
    async with AsyncSession(pilot["admin"]) as tx:
        row = await tx.scalar(select(Session).where(Session.token_hash == token_hash(token)))
        assert row and row.token_hash != token and (row.expires_at - row.created_at).total_seconds() <= 28800
        user = await tx.get(User, row.user_id)
        assert user.password_hash.startswith("scrypt:") and pilot["inputs"][0]["password"] not in user.password_hash
    await db.engine.dispose()  # New connection pool must authenticate from persisted DB, not memory.
    assert (await pilot["client"].get("/operator/v2/me", headers=headers)).status_code == 200
    assert (await pilot["client"].post("/operator/v2/auth/logout", headers=headers)).status_code == 204
    await db.engine.dispose()
    assert (await pilot["client"].get("/operator/v2/me", headers=headers)).status_code == 401


@pytest.mark.parametrize("revocation", ["expiry", "session", "user", "membership", "grant"])
async def test_immediate_current_db_revocation(pilot, revocation):
    headers = await login(pilot)
    receipt = pilot["receipts"][0]
    async with AsyncSession(pilot["admin"]) as tx, tx.begin():
        if revocation in {"expiry", "session"}:
            changes = {"expires_at": utcnow() - timedelta(seconds=1)} if revocation == "expiry" else {"revoked_at": utcnow()}
            await tx.execute(update(Session).where(Session.token_hash == token_hash(headers["Authorization"][7:]))
                             .values(**changes))
        elif revocation == "user":
            await tx.execute(update(User).where(User.id == receipt["user_id"]).values(enabled=False))
        elif revocation == "membership":
            await tx.execute(update(Membership).where(Membership.user_id == receipt["user_id"]).values(enabled=False))
        else:
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == receipt["business_ids"][0],
                             BusinessGrant.environment_id == settings().environment).values(enabled=False))
    result = await pilot["client"].get(endpoint(pilot), headers=headers)
    if revocation in {"expiry", "session", "user"}:
        assert result.status_code == 401
    elif revocation == "membership":
        assert result.status_code == 404
        assert (await pilot["client"].get("/operator/v2/capabilities", headers=headers)).json()["data"]["capabilities"] == []
    else:
        assert len(result.json()["data"]["items"]) == 1
        assert (await pilot["client"].get(f"/operator/v2/businesses/{receipt['business_ids'][0]}", headers=headers)).status_code == 404


async def test_cursor_binding_tamper_expiry_and_live_snapshot(pilot):
    client, headers = pilot["client"], await login(pilot)
    first = (await client.get(endpoint(pilot), params={"limit": 1}, headers=headers)).json()["data"]
    cursor = first["next_cursor"]
    second = (await client.get(endpoint(pilot), params={"limit": 1, "cursor": cursor}, headers=headers)).json()["data"]
    assert first["items"][0]["business_id"] < second["items"][0]["business_id"] and second["next_cursor"] is None
    assert (await client.get(endpoint(pilot), params={"cursor": cursor + "x"}, headers=headers)).status_code == 400
    other_session = await login(pilot)
    assert (await client.get(endpoint(pilot), params={"cursor": cursor}, headers=other_session)).status_code == 400
    decoded = json.loads(__import__("base64").urlsafe_b64decode(cursor.split(".")[0]))
    decoded["expires"] = 0
    assert (await client.get(endpoint(pilot), params={"cursor": seal_cursor(decoded)}, headers=headers)).status_code == 409
    async with AsyncSession(pilot["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.environment_id == settings().environment,
                         BusinessGrant.business_id == second["items"][0]["business_id"]).values(enabled=False))
    assert (await client.get(endpoint(pilot), params={"cursor": cursor}, headers=headers)).status_code == 409


async def test_direct_sql_rls_and_transaction_pool_scope(pilot):
    receipt = pilot["receipts"][0]
    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        assert not role.rolsuper and not role.rolbypassrls
        assert not list(await tx.scalars(select(BusinessGrant)))
        assert not list(await tx.scalars(select(User)))
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'control_memberships','UPDATE')"))
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'control_users','INSERT')"))
    async with scope(user=receipt["user_id"]) as tx:
        rows = list(await tx.scalars(select(BusinessGrant)))
        assert len(rows) == 2 and all(r.organization_id == receipt["organization_id"] for r in rows)
    async with db.registry() as tx:
        assert not list(await tx.scalars(select(BusinessGrant)))
    original = settings().environment
    settings().environment = "test-other-namespace"
    try:
        async with scope(user=receipt["user_id"]) as tx:
            assert not list(await tx.scalars(select(BusinessGrant)))
    finally:
        settings().environment = original


async def test_atomic_idempotent_conflict_and_concurrent_bootstrap(pilot):
    value = pilot["inputs"][0]

    async def rerun():
        async with AsyncSession(pilot["admin"]) as tx, tx.begin():
            return await bootstrap(tx, **value)
    assert await rerun() == pilot["receipts"][0]
    assert all(r == pilot["receipts"][0] for r in await asyncio.gather(rerun(), rerun()))
    conflict = {**pilot["inputs"][1], "entries": value["entries"]}
    with pytest.raises(ValueError, match="business_grant_conflict"):
        async with AsyncSession(pilot["admin"]) as tx, tx.begin():
            await bootstrap(tx, **conflict)
    assert await rerun() == pilot["receipts"][0]
    mapping = {**value, "entries": [{**value["entries"][0], "business_id": str(uuid4())}]}
    with pytest.raises(ValueError, match="business_mapping_conflict"):
        async with AsyncSession(pilot["admin"]) as tx, tx.begin():
            await bootstrap(tx, **mapping)


async def test_local_only_disabled_production_headers_and_validation(pilot, monkeypatch):
    headers = await login(pilot)
    client = pilot["client"]
    for injected in ({"Origin": "http://localhost:3000"}, {"X-Forwarded-For": "127.0.0.1"},
                     {"Forwarded": "for=127.0.0.1"}, {"Host": "verslomatika.lt"}):
        assert (await client.get("/operator/v2/me", headers={**headers, **injected})).status_code == 403
    monkeypatch.setattr(settings(), "control_enabled", False)
    assert (await client.get("/operator/v2/me", headers=headers)).status_code == 403
    monkeypatch.setattr(settings(), "control_enabled", True)
    original = settings().environment
    monkeypatch.setattr(settings(), "environment", "production")
    assert (await client.get("/operator/v2/me", headers=headers)).status_code == 403
    monkeypatch.setattr(settings(), "environment", original)
    result = await client.get(endpoint(pilot), params={"limit": 0}, headers=headers)
    assert result.status_code == 400 and set(result.json()) == {"code", "message", "request_id"}
    result = await client.post("/operator/v2/auth/login", json={"username": "bad", "password": "private-value", "actor": "forged"})
    assert result.status_code == 400 and "private-value" not in result.text
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=("198.51.100.1", 54321)),
                                 base_url="http://127.0.0.1:8846") as remote:
        assert (await remote.get("/operator/v2/me", headers=headers)).status_code == 403
    oversized = await client.post("/operator/v2/auth/login", content="x" * 4097)
    assert oversized.status_code == 400 and oversized.json()["code"] == "invalid_request"


async def test_persistent_login_limits_and_no_username_disclosure(pilot):
    client, value = pilot["client"], pilot["inputs"][0]
    for _ in range(10):
        result = await client.post("/operator/v2/auth/login", json={"username": value["username"], "password": "wrong"})
        assert result.status_code == 401 and result.json()["code"] == "invalid_credentials"
    await db.engine.dispose()
    result = await client.post("/operator/v2/auth/login", json={"username": value["username"], "password": value["password"]})
    assert result.status_code == 429 and result.headers["retry-after"] == "900"
    unknown = await client.post("/operator/v2/auth/login", json={"username": "unknown-user", "password": "wrong"})
    assert unknown.status_code == 401 and unknown.json()["code"] == "invalid_credentials"


async def test_actual_response_shapes_match_canonical_schema(pilot):
    # Validate the actual shape, including no additional properties, without another schema runtime dependency.
    schemas = json.loads((Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-portfolio.openapi.json")
                         .read_text(encoding="utf-8"))["components"]["schemas"]
    headers = await login(pilot)
    for url, schema in (("/operator/v2/me", "MeResponse"), ("/operator/v2/capabilities", "CapabilitiesResponse"),
                        (endpoint(pilot), "BusinessPageResponse")):
        response = (await pilot["client"].get(url, headers=headers)).json()
        assert set(response) == set(schemas[schema]["required"])
        data_schema = schemas[schemas[schema]["properties"]["data"]["$ref"].rsplit("/", 1)[-1]]
        assert set(response["data"]) == set(data_schema["required"])
    item = (await pilot["client"].get(endpoint(pilot), headers=headers)).json()["data"]["items"][0]
    assert set(item) == set(schemas["Business"]["required"])


async def test_actual_tcp_logout_commits_before_response(pilot):
    # ASGITransport waits for after-response dependency cleanup; it hides the network race.
    cfg = settings()
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        port = reservation.getsockname()[1]
    env = {**os.environ, "PINET_DATABASE_URL": cfg.database_url, "PINET_ENVIRONMENT": cfg.environment,
           "PINET_CONTROL_ENABLED": "true", "PINET_CONTROL_CURSOR_SECRET": cfg.control_cursor_secret,
           "PINET_CONTROL_SOURCE_REVISION": cfg.control_source_revision,
           "PINET_VOICE_ENABLED": "false", "PINET_SMTP_ENABLED": "false",
           "PINET_KNOWLEDGE_REFRESH_ENABLED": "false", "PINET_LEARNING_ENABLED": "false"}
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "pinet_core.api:app", "--host", "127.0.0.1",
                                "--port", str(port), "--no-access-log"], env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    try:
        async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{port}", timeout=3, trust_env=False) as client:
            ready = False
            for _ in range(80):
                if process.poll() is not None:
                    break
                try:
                    ready = (await client.get("/health")).status_code == 200
                except httpx.TransportError:
                    pass
                if ready:
                    break
                await asyncio.sleep(0.1)
            assert ready, "Dedicated TCP regression API did not start"
            value = pilot["inputs"][0]
            for _ in range(3):
                response = await client.post("/operator/v2/auth/login", json={k: value[k] for k in ("username", "password")})
                assert response.status_code == 200
                headers = {"Authorization": "Bearer " + response.json()["access_token"]}
                assert (await client.post("/operator/v2/auth/logout", headers=headers)).status_code == 204
                # New independent connection immediately after204 sees committed revocation.
                async with httpx.AsyncClient(base_url=client.base_url, timeout=3, trust_env=False) as next_client:
                    assert (await next_client.get("/operator/v2/me", headers=headers)).status_code == 401
    finally:
        if os.name == "nt":
            # Windows venv launcher spawns the interpreter; terminate only our own process tree.
            await asyncio.to_thread(subprocess.run, ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                    creationflags=subprocess.CREATE_NO_WINDOW, check=False)
        else:
            process.terminate()
        await asyncio.to_thread(process.wait, timeout=10)
