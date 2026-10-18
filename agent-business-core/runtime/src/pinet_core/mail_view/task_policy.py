"""Privileged bounded display budget; no model dispatch or original-mail write."""
from datetime import UTC, timedelta

from sqlalchemy import text

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError
from ..creation.service import digest
from . import task_authority as authority
from .task_contract import EFFORT, MODEL, Approve, Reauthorize, Stop
from .task_models import DisplayPolicy
from .translations import POLICY_SHA


def view(row):
    return {**authority.material(row), "enabled": row.enabled, "fingerprint": row.fingerprint}


async def approve(tx, request):
    value = Approve.model_validate(request)
    authority.guard()
    await authority.source(value.execution_source_revision)
    if await tx.get(DisplayPolicy, str(value.policy_id)):
        raise ControlError(409, "mail_display_policy_exists")
    session = await tx.get(Session, str(value.authorizing_session_id), populate_existing=True)
    if session is None or session.environment_id != settings().environment:
        raise ControlError(401, "unauthenticated")
    owned = await authority.grant(tx, session, value.business_id)
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    expiry = min(now+timedelta(seconds=value.duration_seconds), session.expires_at)
    if expiry <= now:
        raise ControlError(409, "mail_display_policy_expired")
    row = DisplayPolicy(id=str(value.policy_id), business_id=owned.business_id, organization_id=owned.organization_id,
        user_id=session.user_id, environment_id=settings().environment, portfolio_id=owned.portfolio_id,
        grant_id=owned.id, session_id=session.id, source_revision=value.execution_source_revision,
        instruction_sha256=POLICY_SHA, target_language="lt", model=MODEL, effort=EFFORT,
        maximum_calls=value.maximum_calls, mail_created_after=value.mail_created_after.astimezone(UTC),
        approved_at=now, expires_at=expiry, enabled=True)
    row.fingerprint = digest(authority.material(row))
    tx.add(row)
    await tx.flush()
    async with authority.current(tx, row.id, session.id):
        return {"action": "approve", "before": None, "after": view(row), "configuration_only": True,
            "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def contain(tx, action, request):
    value = Stop.model_validate(request)
    await authority.source(value.execution_source_revision)
    session = await tx.get(Session, str(value.authorizing_session_id), populate_existing=True)
    if session is None or session.environment_id != settings().environment:
        raise ControlError(401, "unauthenticated")
    row = await authority.history(tx, value.policy_id, session, containment=True)
    row = await tx.get(DisplayPolicy, row.id, with_for_update=action == "stop", populate_existing=True)
    if row.fingerprint != value.expected_fingerprint:
        raise ControlError(409, "mail_display_policy_changed")
    before = view(row)
    if action == "stop":
        row.enabled = False
        await tx.flush()
    return {"action": action, "before": before, "after": view(row), "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def operate(tx, action, request):
    if action == "reauthorize":
        from .task_reauthorization import reauthorize
        return await reauthorize(tx, request)
    if action == "approve":
        return await approve(tx, request)
    if action in {"inspect", "stop"}:
        return await contain(tx, action, request)
    raise ValueError("unknown_display_policy_operation")


async def verify(tx, request, result):
    if result["action"] in {"approve", "reauthorize"}:
        value = (Reauthorize if result["action"] == "reauthorize" else Approve).model_validate(request)
        async with authority.current(tx, value.policy_id, value.authorizing_session_id) as (row, _):
            if view(row) != result["after"]:
                raise ControlError(409, "mail_display_policy_changed")
    elif (await contain(tx, "inspect", request))["after"] != result["after"]:
        raise ControlError(409, "mail_display_policy_changed")
