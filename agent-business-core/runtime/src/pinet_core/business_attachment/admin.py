"""Explicit trusted review/import; no customer endpoint, provider or activation."""
from datetime import timedelta

from sqlalchemy import func, select, text

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError
from ..creation.service import binding, digest
from ..models import new_id
from . import service
from .models import Binding
from .wire import Approve, Inspect, Revoke

MODELS = {"approve": Approve, "inspect": Inspect, "revoke": Revoke}


async def administrative(tx):
    service.guard()
    role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
    if not (role.rolsuper or role.rolbypassrls):
        raise ControlError(403, "administrative_connection_required")
    if not await service.schema_ready(tx):
        raise ControlError(503, "business_attachment_schema_unavailable")


async def actor(tx, value):
    # Every writer starts with the same business barrier, including revocation.
    await service.lifetime(tx, value.business_id, exclusive=True)
    session = await tx.scalar(select(Session).where(Session.id == str(value.authorizing_session_id),
        Session.environment_id == settings().environment).execution_options(populate_existing=True))
    if session is None:
        raise ControlError(401, "unauthenticated")
    await tx.execute(text("SELECT set_config('pinet.control_user',:user,true), "
        "set_config('pinet.environment',:environment,true)"),
        {"user": session.user_id, "environment": settings().environment})
    portfolio, grant, business = await service.owned_business(tx, session, value.business_id, lock=True)
    return session, portfolio, grant, business


def request_material(value, owner):
    # Current consumer Session can change on an exact replay. The first review
    # Session remains immutable provenance on the stored version.
    return {key: item for key, item in value.model_dump(mode="json").items()
        if key != "authorizing_session_id"} | {"owner": owner}


def receipt(row, *, action, replayed, current):
    return {"action": action, "binding_id": row.id, "business_id": row.business_id,
        "sequence": row.sequence, "fingerprint": row.fingerprint,
        "reviewed_at": row.reviewed_at.isoformat(), "expires_at": row.expires_at.isoformat(),
        "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None,
        "binding_current": current, "replayed": replayed, "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def operate(tx, action, request):
    if action not in MODELS:
        raise ValueError("unknown_business_attachment_operation")
    value = MODELS[action].model_validate(request)
    await administrative(tx)
    pin = await service.execution_fence()
    session, portfolio, grant, business = await actor(tx, value)
    replayed = False
    if action == "approve":
        owner = {"user_id": session.user_id, "organization_id": portfolio.organization_id,
            "portfolio_id": portfolio.id, "environment_id": settings().environment}
        expected = digest(request_material(value, owner))
        row = await tx.scalar(select(Binding).where(Binding.user_id == session.user_id,
            Binding.environment_id == settings().environment, Binding.request_id == str(value.request_id))
            .execution_options(populate_existing=True))
        if row is not None:
            service.validated(row)
            if (row.request_fingerprint != expected or row.business_id != business.id or binding(row) != owner
                    or row.grant_id != grant.id or row.site_id != business.site_id
                    or row.canonical_host != business.canonical_host):
                raise ControlError(409, "business_source_request_conflict")
            replayed = True
        else:
            if value.source_revision != pin:
                raise ControlError(503, "source_unavailable")
            sequence = 1 + (await tx.scalar(select(func.max(Binding.sequence)).where(
                *(getattr(Binding, key) == item for key, item in owner.items()),
                Binding.business_id == business.id)) or 0)
            if sequence > 2147483647:
                raise ControlError(409, "business_source_version_limit")
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            row = Binding(id=new_id(), **owner, business_id=business.id, grant_id=grant.id,
                site_id=business.site_id, canonical_host=business.canonical_host, sequence=sequence,
                payload=value.payload.model_dump(mode="json"), source_revision=pin,
                authorizing_session_id=session.id, request_id=str(value.request_id), request_fingerprint=expected,
                created_at=now, reviewed_at=now, expires_at=now + timedelta(seconds=value.duration_seconds), revoked_at=None)
            row.fingerprint = digest(service.material(row))
            tx.add(row)
            await tx.flush()
    else:
        if value.source_revision != pin:
            raise ControlError(503, "source_unavailable")
        row = await tx.scalar(select(Binding).where(Binding.id == str(value.binding_id),
            Binding.business_id == business.id, Binding.user_id == session.user_id,
            Binding.environment_id == settings().environment).execution_options(populate_existing=True))
        if row is None:
            raise ControlError(404, "not_found")
        await service.current(tx, session, row, writing=False)
        if action == "revoke":
            if row.fingerprint != value.expected_fingerprint:
                raise ControlError(409, "business_source_changed")
            replayed = row.revoked_at is not None
            if not replayed:
                row.revoked_at = await tx.scalar(text("SELECT clock_timestamp()"))
                await tx.flush()
    await service.execution_fence(pin)
    await service.current(tx, session, row, writing=False)
    return {**receipt(row, action=action, replayed=replayed, current=await service.is_current(tx, row)),
        "execution_source_revision": pin}


async def verify(tx, value, result):
    """After receipt fsync: repeat current execution/consumer and data fences."""
    await service.execution_fence(result["execution_source_revision"])
    session, _, _, _ = await actor(tx, value)
    row = await tx.scalar(select(Binding).where(Binding.id == result["binding_id"],
        Binding.business_id == str(value.business_id)).execution_options(populate_existing=True))
    if row is None or row.fingerprint != result["fingerprint"]:
        raise ControlError(409, "business_source_changed")
    await service.current(tx, session, row, writing=False)
    if (row.revoked_at.isoformat() if row.revoked_at else None) != result["revoked_at"]:
        raise ControlError(409, "business_source_changed")
    if await service.is_current(tx, row) != result["binding_current"]:
        raise ControlError(409, "business_source_changed")
