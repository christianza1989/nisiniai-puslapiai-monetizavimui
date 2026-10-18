"""Privileged explicit model budget, never derived from capture/work permission."""
from datetime import timedelta

from sqlalchemy import text

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import digest
from . import model_authority as authority
from . import module_admin
from .model_contract import EFFORT, MODEL, ApproveModel, StopModel
from .model_models import ModelAuthorization


def view(row):
    return {**authority.material(row), "enabled": row.enabled, "fingerprint": row.fingerprint}


async def approve(tx, request):
    value = ApproveModel.model_validate(request)
    authority.guard()
    registry, _, session = await module_admin.authority(tx, value)
    if await tx.get(ModelAuthorization, str(value.authorization_id)):
        raise ControlError(409, "acquisition_model_authorization_exists")
    _, agent, config, _ = await authority.saved(tx, session, registry.creation_id, str(value.agent_id))
    if config.revision != value.expected_config_revision or config.config_sha256 != value.expected_config_sha256:
        raise ControlError(409, "acquisition_model_saved_purpose_changed")
    bound, _, registered_hash = await authority.module(tx, registry, value.expected_module_fingerprint)
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    expiry = min(now+timedelta(seconds=value.duration_seconds), bound.expires_at, session.expires_at)
    if expiry <= now:
        raise ControlError(409, "acquisition_model_authorization_expired")
    row = ModelAuthorization(id=str(value.authorization_id), environment_id=settings().environment,
        business_id=registry.business_id, organization_id=registry.organization_id, user_id=registry.user_id,
        portfolio_id=registry.portfolio_id, site_id=registry.site_id, adapter_id=bound.adapter_id,
        creation_id=registry.creation_id, registration_id=registry.id, registration_fingerprint=registry.fingerprint,
        agent_id=agent.id, config_id=config.id, config_revision=config.revision, config_sha256=config.config_sha256,
        purpose=agent.purpose, session_id=session.id, source_revision=value.execution_source_revision,
        module_fingerprint=value.expected_module_fingerprint, module_snapshot=module_admin.snapshot(bound),
        work_registration_sha256=registered_hash, maximum_attempts=value.maximum_attempts,
        approved_at=now, expires_at=expiry, enabled=True, model=MODEL, effort=EFFORT)
    row.fingerprint = digest(authority.material(row))
    tx.add(row)
    await tx.flush()
    async with authority.current(tx, row.id, session.id):
        result = {"action": "approve", "before": None, "after": view(row),
            "configuration_only": True, "model_dispatch_performed": False, "channel_activation": "not_performed"}
    return result


async def contain(tx, action, request):
    value = StopModel.model_validate(request)
    registry, _, _ = await module_admin.authority(tx, value, containment=True)
    row = await tx.get(ModelAuthorization, str(value.authorization_id),
        with_for_update=action == "stop", populate_existing=True)
    if (row is None or row.registration_id != registry.id or row.business_id != registry.business_id
            or row.environment_id != registry.environment_id or row.user_id != registry.user_id
            or row.organization_id != registry.organization_id or row.portfolio_id != registry.portfolio_id):
        raise ControlError(404, "not_found")
    if row.fingerprint != value.expected_fingerprint or digest(authority.material(row)) != row.fingerprint:
        raise ControlError(409, "acquisition_model_authorization_changed")
    before = view(row)
    if action == "stop":
        row.enabled = False
        await tx.flush()
    return {"action": action, "before": before, "after": view(row), "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def operate(tx, action, request):
    if action == "approve":
        return await approve(tx, request)
    if action in {"stop", "inspect"}:
        return await contain(tx, action, request)
    raise ValueError("unknown_model_authorization_operation")


async def verify(tx, request, result):
    """Called after private receipt fsync, before the explicit CLI commits."""
    if result["action"] == "approve":
        value = ApproveModel.model_validate(request)
        async with authority.current(tx, value.authorization_id, value.authorizing_session_id) as work:
            if view(work.authorization) != result["after"]:
                raise ControlError(409, "acquisition_model_authorization_changed")
    else:
        current = await contain(tx, "inspect", request)
        if current["after"] != result["after"]:
            raise ControlError(409, "acquisition_model_authorization_changed")
