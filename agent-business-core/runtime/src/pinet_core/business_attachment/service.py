"""Current consumer authority over reviewed immutable business source versions."""
import asyncio
from contextlib import asynccontextmanager
from datetime import UTC
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select, text

from ..config import settings
from ..control.models import BusinessGrant
from ..control.routes import ControlError
from ..creation.service import current_actor, digest
from ..customer_text.adapter import source_current
from ..models import Business
from .models import IDENTITY_KEYS, TABLE, Binding
from .wire import SourcePayload

MATERIAL_KEYS = ["id", *IDENTITY_KEYS, "sequence", "payload", "source_revision",
    "authorizing_session_id", "request_id", "request_fingerprint", "reviewed_at", "expires_at"]


def guard():
    cfg = settings()
    if (not cfg.control_enabled or cfg.control_mode != "local" or not cfg.customer_enabled
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise ControlError(403, "business_attachment_unavailable")


def material(row):
    value = {key: getattr(row, key) for key in MATERIAL_KEYS}
    for key in ("reviewed_at", "expires_at"):
        when = value[key]
        if when.tzinfo is None:
            raise ControlError(503, "invalid_business_source")
        value[key] = when.astimezone(UTC).isoformat(timespec="microseconds")
    return value


def validated(row):
    try:
        if (SourcePayload.model_validate(row.payload).model_dump(mode="json") != row.payload
                or digest(material(row)) != row.fingerprint):
            raise ValueError()
    except (ValueError, TypeError, AttributeError, ValidationError):
        raise ControlError(503, "invalid_business_source") from None
    return row


async def lifetime(tx, business_id, *, exclusive=False):
    """All versions use one business key, before actor/Grant/Binding/Agent locks."""
    identity = str(UUID(str(business_id)))
    function = "pg_advisory_xact_lock" if exclusive else "pg_advisory_xact_lock_shared"
    await tx.execute(text(f"SELECT {function}(hashtextextended(:key,0))"),
        {"key": f"business-source:{settings().environment}:{identity}"})


async def schema_ready(tx):
    return bool(await tx.scalar(text(f"""SELECT EXISTS(SELECT 1 FROM pg_class
      WHERE oid=to_regclass('{TABLE}') AND relrowsecurity AND relforcerowsecurity)
      AND to_regprocedure('public.business_source_binding_current(character varying)') IS NOT NULL
      AND to_regprocedure('public.business_source_binding_pin(character varying,boolean)') IS NOT NULL
      AND to_regprocedure('public.business_source_grant_pin(character varying)') IS NOT NULL""")))


async def owned_business(tx, session, business_id, lock=False):
    """Use the consumer Session, never the binding's historical reviewer Session."""
    identity = str(UUID(str(business_id)))
    await current_actor(tx, session, lock=lock)
    pair = (await tx.execute(select(BusinessGrant, Business).join(Business,
        Business.id == BusinessGrant.business_id).where(BusinessGrant.business_id == identity,
            BusinessGrant.environment_id == settings().environment, BusinessGrant.enabled)
        .execution_options(populate_existing=True))).one_or_none()
    if pair is None:
        raise ControlError(404, "not_found")
    grant, business = pair
    portfolio = await current_actor(tx, session, grant.portfolio_id)
    if lock and not await tx.scalar(text("SELECT public.business_source_grant_pin(:id)"), {"id": identity}):
        raise ControlError(404, "not_found")
    return portfolio, grant, business


async def is_current(tx, registry):
    """Fresh SQL/data ONLY; callers separately fence current Session/source."""
    validated(registry)
    return bool(await tx.scalar(text(f"""SELECT coalesce((SELECT fingerprint=:fp
      AND public.business_source_binding_current(id) FROM {TABLE} WHERE id=:id),false)"""),
        {"id": registry.id, "fp": registry.fingerprint}))


async def current(tx, session, registry, writing=False):
    """Final data-only fence after all native/Git waits; history need not be live."""
    guard()
    expected_id, expected_fp = registry.id, validated(registry).fingerprint
    portfolio, grant, business = await owned_business(tx, session, registry.business_id)
    row = await tx.scalar(select(Binding).where(Binding.id == expected_id,
        Binding.user_id == session.user_id, Binding.environment_id == settings().environment)
        .execution_options(populate_existing=True))
    if row is None:
        raise ControlError(404, "not_found")
    validated(row)
    if (row.fingerprint != expected_fp or (row.organization_id, row.portfolio_id, row.grant_id,
            row.business_id, row.site_id, row.canonical_host) != (portfolio.organization_id, portfolio.id,
            grant.id, business.id, business.site_id, business.canonical_host)):
        raise ControlError(404, "not_found")
    live_session, accepted = (await tx.execute(text(f"""SELECT
      EXISTS(SELECT 1 FROM control_sessions WHERE id=:session AND user_id=:user
        AND environment_id=:environment AND revoked_at IS NULL AND expires_at>clock_timestamp()),
      coalesce((SELECT fingerprint=:fp AND public.business_source_binding_pin(id,:writing)
        FROM {TABLE} WHERE id=:id),false)"""),
        {"session": session.id, "user": session.user_id, "environment": settings().environment,
         "fp": expected_fp, "id": expected_id, "writing": writing})).one()
    if not live_session:
        raise ControlError(401, "unauthenticated")
    if not accepted:
        raise ControlError(409, "business_source_not_current" if writing else "business_source_unavailable")
    return row


async def execution_fence(expected=None):
    guard()
    pin = settings().control_source_revision
    if (expected is not None and expected != pin) or not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")
    if settings().control_source_revision != pin:
        raise ControlError(503, "source_unavailable")
    return pin


@asynccontextmanager
async def transaction_authority(tx, session, business_id, binding_id=None, writing=False, lock=True):
    pin = await execution_fence()
    if not await schema_ready(tx):
        raise ControlError(503, "business_attachment_schema_unavailable")
    if lock:
        # Exclusive business barrier is reentrant for old/read + new/write adoption.
        await lifetime(tx, business_id, exclusive=True)
    await owned_business(tx, session, business_id, lock=lock)
    query = select(Binding).where(Binding.business_id == str(UUID(str(business_id))),
        Binding.user_id == session.user_id, Binding.environment_id == settings().environment)
    if binding_id is not None:
        query = query.where(Binding.id == str(UUID(str(binding_id))))
    else:
        # Latest BEFORE expiry/revocation. Never fall back to an older source.
        query = query.order_by(Binding.sequence.desc()).limit(1)
    row = await tx.scalar(query.execution_options(populate_existing=True))
    if row is None:
        raise ControlError(409, "business_source_required")
    row = await current(tx, session, row, writing=writing)
    yield row
    await execution_fence(pin)
    await current(tx, session, row, writing=writing)
