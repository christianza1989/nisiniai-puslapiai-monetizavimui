"""Local account primitives. No SMTP/provider transport or parallel identity store."""
import asyncio
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
import threading
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import Request
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert

from ..config import settings
from ..control.models import LoginBucket, User
from ..control.routes import ControlError, local_guard, password_matches, scope, token_hash
from ..models import new_id, utcnow
from .models import Account, ActionToken

ROOT = Path(__file__).resolve().parents[3]
HASH_SLOTS = threading.BoundedSemaphore(2)
DUMMY = "scrypt:131072:8:1:" + "00" * 16 + ":" + "00" * 32
# A small explicit local blocklist, not a comprehensive breached-password lookup.
COMMON = {"passwordpassword", "123456789012345", "1234567890123456", "qwertyuiopasdfgh", "slaptazodisslaptazodis"}


def host(value):
    try:
        value = value.strip().rstrip('.').encode('idna').decode('ascii').lower()
        if not 1 <= len(value) <= 253 or '.' not in value or value.endswith(('.local', '.localhost')):
            raise ValueError()
        if not all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in value.split('.')):
            raise ValueError()
        try:
            ipaddress.ip_address(value)
        except ValueError:
            return value
        raise ValueError()
    except (ValueError, UnicodeError):
        raise ValueError("A DNS hostname is required") from None


def customer_guard(request: Request):
    local_guard(request)
    cfg = settings()
    origin = urlsplit(cfg.customer_portal_origin)
    directory = Path(cfg.customer_outbox_directory).resolve()
    if (not cfg.customer_enabled or cfg.control_mode != "local" or cfg.environment == "production"
            or origin.scheme != "http" or origin.hostname not in {"127.0.0.1", "localhost", "::1"}
            or not origin.port or origin.username or origin.password or origin.path or origin.query or origin.fragment
            or not directory.is_relative_to((ROOT / "artifacts").resolve())):
        raise ControlError(403, "customer_unavailable")


def email_hash(value):
    # Stable lookup digest remains personal data. It is never a public anonymized ID.
    return hashlib.sha256(value.lower().encode()).hexdigest()


async def actor(tx, user):
    await tx.execute(text("SELECT set_config('pinet.control_user', :u, true), "
                          "set_config('pinet.customer_email', '', true), "
                          "set_config('pinet.customer_token', '', true)"), {"u": user})


@asynccontextmanager
async def customer_scope(*, user="", email="", token=""):
    files = []
    try:
        async with scope(user=user) as tx:
            tx.info["customer_outbox_files"] = files
            await tx.execute(text("SELECT set_config('pinet.customer_email', :e, true), "
                                  "set_config('pinet.customer_token', :t, true)"), {"e": email, "t": token})
            yield tx
    except BaseException:
        # DB rollback must not leave a usable-looking mail receipt behind.
        for path in files:
            path.unlink(missing_ok=True)
        raise


async def lock_account(tx, account):
    await actor(tx, account.user_id)
    return await tx.scalar(select(User).where(User.id == account.user_id).with_for_update())


def validate_password(password, confirm):
    if password != confirm or password.casefold() in COMMON or len(set(password)) < 3:
        raise ControlError(400, "invalid_password")


def hash_password(password):
    with HASH_SLOTS:
        salt = secrets.token_hex(16)
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=131072, r=8, p=1,
                                dklen=32, maxmem=256 * 1024 * 1024)
        return f"scrypt:131072:8:1:{salt}:{digest.hex()}"


def matches(password, encoded):
    with HASH_SLOTS:
        return password_matches(password, encoded)


async def admit(action, request, address=""):
    now, allowed = utcnow(), True
    # Separate namespaces for signup/recovery/login/token/intake; durable independently committed rows.
    ip_limit = 30 if action in {"login", "verify", "reset", "intake"} else 20
    limits = [("ip", request.client.host, ip_limit)]
    if address:
        limits.append(("email", address.lower(), 10 if action == "login" else 5))
    async with scope() as tx:
        for category, value, limit in limits:
            key = hmac.new(settings().control_cursor_secret.encode(),
                           f"customer:{action}:{category}:{value}".encode(), hashlib.sha256).hexdigest()
            await tx.execute(insert(LoginBucket).values(key=key, environment_id=settings().environment,
                             window_start=now, attempts=0).on_conflict_do_nothing())
            bucket = await tx.scalar(select(LoginBucket).where(LoginBucket.key == key,
                                     LoginBucket.environment_id == settings().environment).with_for_update())
            if bucket.window_start + timedelta(minutes=15) <= now:
                bucket.window_start, bucket.attempts = now, 0
            allowed = allowed and bucket.attempts < limit
            bucket.attempts += 1
    if not allowed:
        raise ControlError(429, "action_rate_limited")


async def generic_floor(start):
    # Reduces the easy lookup timing distinction; does not claim perfect constant-time network behavior.
    await asyncio.sleep(max(0, 0.6 - (asyncio.get_running_loop().time() - start)))


def outbox(tx, account, purpose, token=None):
    directory = Path(settings().customer_outbox_directory).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / (new_id() + ".json")
    route = "/patvirtinti-el-pasta" if purpose == "verify" else "/naujas-slaptazodis"
    payload = {"transport": "development_outbox", "environment": settings().environment,
               "recipient": account.email, "purpose": purpose, "created_at": utcnow().isoformat()}
    if token:
        payload["link"] = settings().customer_portal_origin + route + "#token=" + token
    # Private local operator artifact. Never return it from HTTP or log its body/path.
    tx.info["customer_outbox_files"].append(path)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False)
        stream.write("\n")


async def issue(tx, account, purpose):
    now = utcnow()
    await tx.execute(update(ActionToken).where(ActionToken.user_id == account.user_id,
                     ActionToken.purpose == purpose, ActionToken.consumed_at.is_(None)).values(consumed_at=now))
    token = secrets.token_urlsafe(32)
    tx.add(ActionToken(user_id=account.user_id, environment_id=settings().environment, purpose=purpose,
                       token_hash=token_hash(token), expires_at=now + timedelta(minutes=30 if purpose == "verify" else 15)))
    await tx.flush()
    outbox(tx, account, purpose, token)


async def consume_context(tx, raw, purpose):
    # Lookup only the hash first, then lock the user before locking any of its action tokens.
    # A single lock order serializes recovery/verification/login and prevents cross-token deadlocks.
    hashed = token_hash(raw)
    item = await tx.scalar(select(ActionToken).where(ActionToken.token_hash == hashed))
    if not item:
        raise ControlError(400, "invalid_token")
    await actor(tx, item.user_id)
    user = await tx.scalar(select(User).where(User.id == item.user_id).with_for_update())
    await tx.refresh(item, with_for_update=True)
    if not user or user.identity_issuer != "pinet-customer" or item.purpose != purpose or item.consumed_at or item.expires_at <= utcnow():
        raise ControlError(400, "invalid_token")
    account = await tx.scalar(select(Account).where(Account.user_id == user.id))
    if not account:
        raise ControlError(400, "invalid_token")
    return user, account, item
