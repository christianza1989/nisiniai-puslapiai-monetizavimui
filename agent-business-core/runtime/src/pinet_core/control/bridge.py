"""Prepared server-to-server bridge; browser actor authority stays in durable core sessions."""
import hashlib
import hmac
import re
import time
from datetime import timedelta

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..db import db
from ..models import EdgeNonce, utcnow


def signature(secret, timestamp, nonce, method, target, body):
    canonical = "\n".join(["pinet-control-bridge-v1", timestamp, nonce, method.upper(), target,
                           hashlib.sha256(body).hexdigest()])
    return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()


async def transport_guard(request: Request):
    from .routes import ControlError, local_guard

    cfg = settings()
    if cfg.control_mode != "hosted":
        local_guard(request)
        return
    # Mark only for evaluating the same local/host/header/config boundary before any DB access.
    # The bit is cleared before signature verification and set again only after durable nonce admission.
    request.state.control_bridge_verified = True
    try:
        local_guard(request)
    finally:
        request.state.control_bridge_verified = False
    timestamp = request.headers.get("x-pinet-control-timestamp", "")
    nonce = request.headers.get("x-pinet-control-nonce", "")
    supplied = request.headers.get("x-pinet-control-signature", "")
    if (not re.fullmatch(r"[0-9]{10,11}", timestamp)
            or abs(time.time() - int(timestamp)) > 45
            or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", nonce)
            or not re.fullmatch(r"[0-9a-f]{64}", supplied)):
        raise ControlError(403, "control_unavailable")
    # ASGI raw_path preserves percent encoding. The encoded query is part of the signed target.
    target = request.scope.get("raw_path", request.url.path.encode()).decode("ascii")
    query = request.scope.get("query_string", b"").decode("ascii")
    if query:
        target += "?" + query
    expected = signature(cfg.control_bridge_secret, timestamp, nonce, request.method, target, await request.body())
    if not hmac.compare_digest(expected, supplied):
        raise ControlError(403, "control_unavailable")
    try:
        async with db.registry() as tx:
            await tx.execute(delete(EdgeNonce).where(EdgeNonce.expires_at < utcnow()))
            # Separate from the existing edge wire; nonce persisted before application mutations.
            tx.add(EdgeNonce(id=f"control-v1:{nonce}", expires_at=utcnow() + timedelta(seconds=90)))
    except IntegrityError:
        raise ControlError(409, "replayed_request") from None
    request.state.control_bridge_verified = True
