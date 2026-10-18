"""Explicit privileged local capture-module approval, never customer/self admission."""
import asyncio
from datetime import timedelta
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator
from sqlalchemy import select, text

from ..config import settings
from ..contracts import Strict
from ..control.models import BusinessGrant, Session
from ..control.routes import ControlError
from ..creation.service import binding, current_actor, digest
from ..creation_registration import admin as registrations_admin
from ..creation_registration import service as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..creation_registration.wire import Source
from ..models import Business
from ..source_observation import git_source_observation
from .interfaces import OpaqueId
from .module_models import ModuleBinding

Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Permission = Literal["acquisition.capture", "acquisition.read", "acquisition.correspondence",
                     "acquisition.correspondence.read", "acquisition.work"]
ROOT = Path(__file__).resolve().parents[5]


class Authority(Strict):
    registration_id: UUID | None = Field(default=None, exclude_if=lambda value: value is None)
    authorizing_session_id: UUID
    execution_source_revision: Source
    external_binding_id: UUID | None = Field(default=None, exclude_if=lambda value: value is None)

    @model_validator(mode="after")
    def exact_origin(self):
        if (self.registration_id is None) == (self.external_binding_id is None):
            raise ValueError("exact_acquisition_origin_required")
        return self


class Approve(Authority):
    adapter_id: OpaqueId
    permissions: tuple[Permission, ...] = Field(min_length=1, max_length=5)
    duration_seconds: int = Field(strict=True, ge=30, le=3600)
    expected_fingerprint: Digest | None = None


class Stop(Authority):
    expected_fingerprint: Digest


def snapshot(row):
    if row is None:
        return None
    value = {key: getattr(row, key) for key in ("business_id", "environment_id", "organization_id",
        "approved_by_user_id", "site_id", "adapter_id", "enabled", "permissions", "source_revision")}
    value.update(approved_at=row.approved_at.isoformat(), expires_at=row.expires_at.isoformat())
    return value


def fingerprint(value):
    return digest(value) if value is not None else None


async def execution_current(value):
    observation = await asyncio.to_thread(git_source_observation, ROOT)
    if (observation.porcelain or observation.head != value.execution_source_revision
            or settings().control_source_revision != value.execution_source_revision):
        raise ControlError(503, "acquisition_execution_source_changed")


async def authority(tx, value, *, containment=False):
    cfg = settings()
    if (not cfg.control_enabled or cfg.control_mode != "local"
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or (not containment and (cfg.smtp_enabled or cfg.voice_enabled))):
        raise ValueError("local_synthetic_module_administration_only")
    await registrations_admin.guard(tx, cfg.environment)
    if value.external_binding_id is not None:
        return await external_authority(tx, value, containment=containment)
    await lifetime(tx, cfg.environment, str(value.registration_id))
    row = await tx.scalar(select(Registration).where(Registration.id == str(value.registration_id),
        Registration.environment_id == cfg.environment).execution_options(populate_existing=True))
    if row is None or digest(registrations.stored_material(row)) != row.fingerprint:
        raise ValueError("exact_registration_required")
    creation, session = await registrations_admin.actor(tx, environment=cfg.environment,
        creation_id=row.creation_id, session_id=str(value.authorizing_session_id), require_idle=not containment)
    if binding(row) != binding(creation):
        raise ValueError("current_creation_owner_required")
    if not containment:
        latest = await tx.scalar(select(Registration.id).where(Registration.creation_id == creation.id,
            Registration.environment_id == cfg.environment).order_by(Registration.accepted_revision.desc()).limit(1))
        if row.revoked_at or latest != row.id or row.accepted_revision != creation.current_revision:
            raise ValueError("current_registration_required")
        proof = await registrations.accepted_proof(tx, creation)
        if any(getattr(row, key) != proof[key] for key in registrations.PROOF_KEYS):
            raise ControlError(503, "invalid_registration_source")
    statement = select(BusinessGrant, Business).join(Business,
        Business.id == BusinessGrant.business_id).where(BusinessGrant.id == row.grant_id,
        BusinessGrant.business_id == row.business_id, BusinessGrant.environment_id == cfg.environment,
        BusinessGrant.organization_id == row.organization_id, BusinessGrant.portfolio_id == row.portfolio_id)
    if not containment:
        statement = statement.where(BusinessGrant.enabled)
    pair = (await tx.execute(statement.with_for_update(read=True))).first()
    if not pair or (pair[1].site_id, pair[1].canonical_host) != (row.site_id, row.canonical_host):
        raise ValueError("current_business_grant_required")
    await execution_current(value)
    await current_actor(tx, session, creation.portfolio_id)
    return row, creation, session


async def external_authority(tx, value, *, containment=False):
    """Use the common reviewed business source, never fabricate a Creation proof."""
    from ..business_attachment import service as sources
    from ..business_attachment.models import Binding

    row = await tx.get(Binding, str(value.external_binding_id), populate_existing=True)
    session = await tx.get(Session, str(value.authorizing_session_id), populate_existing=True)
    if row is None or session is None:
        raise ControlError(404, "not_found")
    # A privileged CLI transaction has no bearer-derived ambient scope. Pin the
    # actual consumer; the canonical source guard still verifies its live owner.
    await tx.execute(text("SELECT set_config('pinet.control_user',:user,true), "
        "set_config('pinet.environment',:environment,true)"),
        {"user": session.user_id, "environment": settings().environment})
    async with sources.transaction_authority(tx, session, row.business_id, row.id,
            writing=not containment, lock=True) as current:
        await execution_current(value)
        return current, current, session


def origin_reference(value, registry):
    key = "external_binding_id" if value.external_binding_id is not None else "registration_id"
    return {key: registry.id}


async def operate(tx, action, request):
    models = {"approve": Approve, "stop": Stop, "inspect": Authority}
    if action not in models:
        raise ValueError("unknown_module_operation")
    value = models[action].model_validate(request)
    if isinstance(value, Approve) and len(set(value.permissions)) != len(value.permissions):
        raise ValueError("duplicate_module_permission")
    registry, _, session = await authority(tx, value, containment=action != "approve")
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
        {"key": f"acquisition-module-admin:{registry.environment_id}:{registry.business_id}"})
    row = await tx.get(ModuleBinding, (registry.business_id, registry.environment_id),
        with_for_update=action != "inspect", populate_existing=True)
    before = snapshot(row)
    if action != "inspect":
        if fingerprint(before) != value.expected_fingerprint:
            raise ControlError(409, "acquisition_module_changed")
        if (action == "approve" and row is not None
                and (row.organization_id, row.site_id) != (registry.organization_id, registry.site_id)):
            raise ControlError(409, "acquisition_module_binding_changed")
        if action == "stop":
            if row is None:
                raise ControlError(409, "acquisition_module_missing")
            row.enabled = False
        else:
            if row is not None and row.adapter_id != value.adapter_id:
                raise ControlError(409, "acquisition_adapter_change_requires_migration")
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            if row is None:
                row = ModuleBinding(business_id=registry.business_id, environment_id=registry.environment_id)
                tx.add(row)
            row.organization_id, row.approved_by_user_id = registry.organization_id, registry.user_id
            row.site_id, row.adapter_id = registry.site_id, value.adapter_id
            row.enabled, row.permissions = True, sorted(value.permissions)
            row.source_revision, row.approved_at = value.execution_source_revision, now
            row.expires_at = now + timedelta(seconds=value.duration_seconds)
            if value.external_binding_id is not None:
                row.expires_at = min(row.expires_at, registry.expires_at, session.expires_at)
        await tx.flush()
    result = {"action": action, **origin_reference(value, registry), "before": before, "after": snapshot(row),
        "fingerprint": fingerprint(snapshot(row)), "environment_class": "test", "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}
    await verify(tx, value, result)
    return result


async def verify(tx, value, result):
    """Repeat authority after source/fsync waits, immediately before the caller commits."""
    registry, _, _ = await authority(tx, value, containment=result["action"] != "approve")
    row = await tx.get(ModuleBinding, (registry.business_id, registry.environment_id), populate_existing=True)
    if (any(result.get(key) != identity for key, identity in origin_reference(value, registry).items())
            or fingerprint(snapshot(row)) != result["fingerprint"]):
        raise ControlError(409, "acquisition_module_changed")
    if result["action"] == "approve":
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if row is None or row.expires_at <= now or row.approved_at > now:
            raise ControlError(409, "acquisition_module_expired_before_commit")
