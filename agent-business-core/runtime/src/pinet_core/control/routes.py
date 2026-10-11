import asyncio
import base64
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from ..config import settings
from ..db import db
from ..models import Business, new_id, utcnow
from .models import BusinessGrant, LoginBucket, Membership, Portfolio, Session, User


class ControlError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


class SafeRoute(APIRoute):
    body_limit = 4096
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handle(request):
            request.state.control_request_id = new_id()
            try:
                # Stop reading oversized streams before FastAPI/bridge parse or retain their full body.
                size, chunks = 0, []
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > self.body_limit:
                        raise ControlError(400, "invalid_request")
                    chunks.append(chunk)
                request._body = b"".join(chunks)
                from .bridge import transport_guard
                await transport_guard(request)
                response = await original(request)
                response.headers["Cache-Control"] = "private, no-store"
                response.headers["X-Content-Type-Options"] = "nosniff"
                return response
            except ControlError as error:
                status, code = error.status, error.code
            except RequestValidationError:
                status, code = 400, "invalid_request"
            except SQLAlchemyError:
                status, code = 503, "source_unavailable"
            return JSONResponse({"code": code, "message": code,
                                 "request_id": request.state.control_request_id}, status_code=status,
                                headers={"Cache-Control": "private, no-store",
                                         **({"WWW-Authenticate": "Bearer"} if status == 401 else {}),
                                         **({"Retry-After": "900"} if status == 429 else {})})
        return handle


router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


def local_guard(request: Request):
    cfg = settings()
    hosted = cfg.control_mode == "hosted"
    enabled_environment = (cfg.environment == ("production" if hosted else "local")
                           or cfg.environment.startswith("test-"))
    try:
        loopback = ipaddress.ip_address(request.client.host).is_loopback
    except (ValueError, AttributeError):
        loopback = False
    if (not cfg.control_enabled or not enabled_environment or not loopback
            or cfg.control_mode not in {"local", "hosted"}
            or (request.url.hostname != cfg.control_bridge_host if hosted else
                request.url.hostname not in {"127.0.0.1", "localhost", "::1"})
            or request.headers.get("origin") or request.headers.get("forwarded")
            or any(key.startswith("x-forwarded-") for key in request.headers)
            or len(cfg.control_cursor_secret) < 32
            or not re.fullmatch(r"[a-f0-9]{40}", cfg.control_source_revision)
            or not 300 <= cfg.control_session_seconds <= 28800):
        raise ControlError(403, "control_unavailable")
    if hosted and (not getattr(request.state, "control_bridge_verified", False)
                   or len(cfg.control_bridge_secret) < 32 or not cfg.control_owner_user_id
                   or cfg.control_bridge_host != "control.pinet.internal"):
        raise ControlError(403, "control_unavailable")


@asynccontextmanager
async def scope(*, user="", login="", token=""):
    async with db.registry() as tx:
        await tx.execute(text("SELECT set_config('pinet.environment', :e, true), "
                              "set_config('pinet.control_user', :u, true), "
                              "set_config('pinet.control_login', :l, true), "
                              "set_config('pinet.control_token', :t, true)"),
                         {"e": settings().environment, "u": user, "l": login, "t": token})
        yield tx


def password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1, dklen=32)
    return f"scrypt:16384:8:1:{salt}:{digest.hex()}"


def password_matches(password, encoded):
    try:
        algorithm, n, r, p, salt, expected = encoded.split(":")
        if algorithm != "scrypt" or n not in {"16384", "131072"} or (r, p) != ("8", "1"):
            return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=8, p=1,
                                dklen=32, maxmem=256 * 1024 * 1024)
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


# Unknown username uses the same expensive operation; this is not a usable credential.
DUMMY_HASH = "scrypt:16384:8:1:" + "00" * 16 + ":" + "00" * 32


class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_.-]*$")
    password: str = Field(min_length=1, max_length=256)


async def admit_login(username, ip):
    now = utcnow()
    permitted = True
    async with scope() as tx:
        # Durable atomic counters; failures are committed independently of credential validation.
        for category, value, limit in (("ip", ip, 30), ("username", username, 10)):
            key = hmac.new(settings().control_cursor_secret.encode(),
                           f"{category}:{value}".encode(), hashlib.sha256).hexdigest()
            await tx.execute(insert(LoginBucket).values(key=key, environment_id=settings().environment,
                                                        window_start=now, attempts=0).on_conflict_do_nothing())
            bucket = await tx.scalar(select(LoginBucket).where(LoginBucket.key == key).with_for_update())
            if bucket.window_start + timedelta(minutes=15) <= now:
                bucket.window_start, bucket.attempts = now, 0
            permitted = permitted and bucket.attempts < limit
            bucket.attempts += 1
    if not permitted:
        raise ControlError(429, "login_rate_limited")


@router.post("/auth/login", dependencies=[Depends(local_guard)])
async def login(value: Login, request: Request):
    await admit_login(value.username, request.client.host)
    async with scope(login=value.username) as tx:
        user = await tx.scalar(select(User).where(User.username == value.username))
        encoded = user.password_hash if user else DUMMY_HASH
        valid = await asyncio.to_thread(password_matches, value.password, encoded)
        if not valid or not user or not user.enabled or user.identity_issuer == "pinet-customer":
            raise ControlError(401, "invalid_credentials")
        if settings().control_mode == "hosted" and user.id != settings().control_owner_user_id:
            raise ControlError(401, "invalid_credentials")
        await tx.execute(text("SELECT set_config('pinet.control_user', :u, true), "
                              "set_config('pinet.control_login', '', true)"), {"u": user.id})
        token = secrets.token_urlsafe(48)
        expires = utcnow() + timedelta(seconds=settings().control_session_seconds)
        tx.add(Session(user_id=user.id, environment_id=settings().environment, token_hash=token_hash(token),
                       expires_at=expires))
    return {"access_token": token, "token_type": "Bearer", "expires_at": expires.isoformat()}


async def authenticated(request: Request):
    local_guard(request)
    auth = request.headers.get("authorization", "")
    if not re.fullmatch(r"Bearer [A-Za-z0-9_-]{64}", auth):
        raise ControlError(401, "unauthenticated")
    async with scope(token=token_hash(auth[7:])) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth[7:])))
        if not session or session.revoked_at or session.expires_at <= utcnow():
            raise ControlError(401, "unauthenticated")
        await tx.execute(text("SELECT set_config('pinet.control_user', :u, true), "
                              "set_config('pinet.control_token', '', true)"), {"u": session.user_id})
        user = await tx.get(User, session.user_id)
        if not user or not user.enabled:
            raise ControlError(401, "unauthenticated")
        if settings().control_mode == "hosted" and user.id != settings().control_owner_user_id:
            raise ControlError(401, "unauthenticated")
        yield tx, session


@router.post("/auth/logout", status_code=204)
async def logout(context=Depends(authenticated, scope="function")):
    tx, session = context
    session.revoked_at = utcnow()
    await tx.flush()
    return Response(status_code=204)


def envelope(request, data):
    cfg = settings()
    return {"contract_version": "portfolio.v1", "environment": "test" if cfg.environment.startswith("test-")
            else cfg.environment, "source_revision": cfg.control_source_revision, "observed_at": utcnow().isoformat(),
            "request_id": request.state.control_request_id, "data": data}


def identifier(value):
    try:
        return str(UUID(value))
    except ValueError:
        raise ControlError(400, "invalid_request") from None


@router.get("/me")
async def me(request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    portfolios = list(await tx.scalars(select(Portfolio).join(Membership, Membership.organization_id ==
                     Portfolio.organization_id).where(Membership.user_id == session.user_id, Membership.enabled)
                     .order_by(Portfolio.id)))
    return envelope(request, {"user_id": session.user_id, "portfolios": [
        {"organization_id": p.organization_id, "portfolio_id": p.id, "display_name": p.display_name}
        for p in portfolios]})


@router.get("/capabilities")
async def capabilities(request: Request, context=Depends(authenticated, scope="function")):
    tx, _ = context
    exists = await tx.scalar(select(Portfolio.id).limit(1))
    return envelope(request, {"capabilities": ["portfolio.read"] if exists else []})


def projection(grant, business):
    return {"business_id": business.id, "display_name": grant.display_name,
            "sites": [{"site_id": business.site_id, "canonical_host": business.canonical_host}],
            "stage": grant.stage, "connection_status": grant.connection_status,
            "runtime_status": grant.runtime_status,
            "last_verified_activity_at": grant.last_verified_activity_at.isoformat()
            if grant.last_verified_activity_at else None}


def seal_cursor(payload):
    data = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).decode()
    signature = hmac.new(settings().control_cursor_secret.encode(), data.encode(), hashlib.sha256).hexdigest()
    return data + "." + signature


def open_cursor(value, session, portfolio, snapshot):
    try:
        data, signature = value.split(".")
        expected = hmac.new(settings().control_cursor_secret.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        decoded = json.loads(base64.urlsafe_b64decode(data))
        binding = [session.user_id, session.id, portfolio, settings().environment]
        if decoded["binding"] != binding:
            raise ValueError()
        if decoded["expires"] <= int(utcnow().timestamp()) or decoded["snapshot"] != snapshot:
            raise ControlError(409, "snapshot_expired")
        return identifier(decoded["after"]), decoded["expires"]
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise ControlError(400, "invalid_cursor") from None


@router.get("/portfolios/{portfolio_id}/businesses")
async def listing(portfolio_id: str, request: Request, limit: int = Query(25, ge=1, le=100),
                  cursor: str | None = Query(None, min_length=1, max_length=2048),
                  context=Depends(authenticated, scope="function")):
    tx, session = context
    portfolio_id = identifier(portfolio_id)
    if not await tx.get(Portfolio, portfolio_id):
        raise ControlError(404, "not_found")
    rows = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
            .where(BusinessGrant.portfolio_id == portfolio_id, BusinessGrant.enabled).order_by(Business.id))).all()
    items = [projection(g, b) for g, b in rows]
    # Snapshot changes on revocation, projection or evidence updates. No unbounded cursor ledger.
    snapshot = hashlib.sha256(json.dumps({"items": items, "revision": settings().control_source_revision,
                              "evidence": [g.evidence_revision for g, _ in rows]}, sort_keys=True).encode()).hexdigest()
    expires = int(utcnow().timestamp()) + 300
    if cursor:
        after, expires = open_cursor(cursor, session, portfolio_id, snapshot)
        items = [item for item in items if item["business_id"] > after]
    page = items[:limit]
    next_cursor = None
    if len(items) > limit:
        next_cursor = seal_cursor({"binding": [session.user_id, session.id, portfolio_id, settings().environment],
                                  "snapshot": snapshot, "after": page[-1]["business_id"], "expires": expires})
    return envelope(request, {"portfolio_id": portfolio_id, "items": page, "next_cursor": next_cursor,
                              "snapshot_id": snapshot})


@router.get("/businesses/{business_id}")
async def detail(business_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, _ = context
    row = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
                           .where(BusinessGrant.business_id == identifier(business_id), BusinessGrant.enabled))).first()
    if not row:
        raise ControlError(404, "not_found")
    return envelope(request, projection(*row))
