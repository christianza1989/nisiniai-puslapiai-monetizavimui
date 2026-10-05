import hashlib
import hmac
import time
from datetime import timedelta

from fastapi import HTTPException, Request
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError

from .config import settings
from .db import db
from .models import EdgeNonce, utcnow


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def edge_signature(secret, timestamp, nonce, method, path, body):
    canonical = "\n".join([timestamp, nonce, method, path, hashlib.sha256(body).hexdigest()])
    return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()


async def signed_edge(request: Request):
    cfg = settings()
    stamp = request.headers.get("x-pinet-timestamp", "")
    nonce = request.headers.get("x-pinet-nonce", "")
    try:
        valid_time = abs(time.time() - int(stamp)) <= 45
    except ValueError:
        valid_time = False
    if not cfg.edge_secret or not valid_time or not 16 <= len(nonce) <= 100:
        raise HTTPException(401, "edge authentication required")
    body = await request.body()
    if len(body) > 220000:
        raise HTTPException(413, "request too large")
    expected = edge_signature(cfg.edge_secret, stamp, nonce, request.method, request.url.path, body)
    if not hmac.compare_digest(expected, request.headers.get("x-pinet-signature", "")):
        raise HTTPException(401, "edge authentication required")
    try:
        async with db.registry() as tx:
            await tx.execute(delete(EdgeNonce).where(EdgeNonce.expires_at < utcnow()))
            tx.add(EdgeNonce(id=nonce, expires_at=utcnow() + timedelta(seconds=90)))
    except IntegrityError:
        raise HTTPException(409, "replayed request") from None


async def worker_auth(request: Request):
    secret = settings().worker_secret
    if not secret or not hmac.compare_digest(request.headers.get("authorization", ""), f"Bearer {secret}"):
        raise HTTPException(401, "worker authentication required")


async def operator_auth(request: Request):
    cfg = settings()
    secret = cfg.operator_secret
    if (not secret or secret in {cfg.worker_secret, cfg.edge_secret} or
            not hmac.compare_digest(request.headers.get("authorization", ""), f"Bearer {secret}")):
        raise HTTPException(401, "operator authentication required")
