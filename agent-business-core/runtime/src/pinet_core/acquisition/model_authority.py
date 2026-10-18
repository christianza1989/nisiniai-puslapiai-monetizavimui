"""Current saved-purpose/native/module authority for the separate model work kind."""
from contextlib import asynccontextmanager
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError
from ..creation.service import current_actor, digest
from ..creation_registration import service as registrations
from ..customer_agents import service as agents
from ..db import db
from . import module_admin
from .correspondence import Correspondence
from .interfaces import Scope
from .model_contract import EFFORT, MODEL
from .model_models import ModelAuthorization
from .module_models import ModuleBinding
from .tasks import available_target
from .work_config import read_registration

AUTH_FIELDS = ("id", "environment_id", "business_id", "organization_id", "user_id", "portfolio_id",
    "site_id", "adapter_id", "creation_id", "registration_id", "registration_fingerprint",
    "agent_id", "config_id", "config_revision", "config_sha256", "purpose", "session_id",
    "source_revision", "module_fingerprint", "module_snapshot", "work_registration_sha256",
    "maximum_attempts", "approved_at", "expires_at", "model", "effort")


def guard(*, execution=False):
    cfg = settings()
    if (not cfg.acquisition_model_enabled or not cfg.control_enabled or cfg.control_mode != "local"
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or not cfg.customer_enabled or not cfg.customer_agents_enabled or cfg.smtp_enabled or cfg.voice_enabled
            or (execution and not cfg.acquisition_model_runner_enabled)):
        raise ControlError(403, "acquisition_model_disabled")


def material(row):
    result = {key: getattr(row, key) for key in AUTH_FIELDS}
    for key in ("approved_at", "expires_at"):
        result[key] = result[key].isoformat()
    return result


def source_value(source):
    return type("SourcePin", (), {"execution_source_revision": source})()


async def historical(tx, authorization_id, session):
    """Current owner history is not a new dispatch/renewal, even after expiry."""
    agents.guard()
    row = await tx.scalar(select(ModelAuthorization).where(ModelAuthorization.id == str(UUID(str(authorization_id))),
        ModelAuthorization.environment_id == settings().environment).execution_options(populate_existing=True))
    if row is None or row.user_id != session.user_id:
        raise ControlError(404, "not_found")
    await current_actor(tx, session, row.portfolio_id, lock=True)
    if digest(material(row)) != row.fingerprint:
        raise ControlError(503, "acquisition_model_authorization_invalid")
    return row


@dataclass
class Work:
    authorization: ModelAuthorization
    session: Session
    scope: Scope
    specification: dict


async def saved(tx, session, creation_id, agent_id):
    """Use the maintained writer readiness; no Foundation/Profile workaround."""
    async with agents.transaction_authority(tx, session, creation_id, agent_id, writing=True) as context:
        _, _, creation, registry, agent = context
        proof = await registrations.accepted_proof(tx, creation)
        if any(getattr(registry, key) != proof[key] for key in registrations.PROOF_KEYS):
            raise ControlError(409, "acquisition_model_registration_changed")
        if agent.purpose not in {"customer_research", "email"}:
            raise ControlError(409, "acquisition_model_purpose_unavailable")
        config = await agents.current_config(tx, agent)
        view = agents.config_view(agent, config)
        return registry, agent, config, view["specification"]


async def module(tx, registry, expected_fingerprint):
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": registry.business_id})
    row = await tx.get(ModuleBinding, (registry.business_id, settings().environment), populate_existing=True)
    if (row is None or row.site_id != registry.site_id or row.organization_id != registry.organization_id
            or row.approved_by_user_id != registry.user_id
            or module_admin.fingerprint(module_admin.snapshot(row)) != expected_fingerprint):
        raise ControlError(409, "acquisition_model_module_changed")
    scope = Scope(business_id=row.business_id, site_id=row.site_id,
        environment_id=row.environment_id, environment_class="test")
    registration, registered_hash = read_registration(settings())
    if not any(entry.scope == scope and entry.adapter_id == row.adapter_id for entry in registration.entries):
        raise ControlError(409, "acquisition_model_private_registration_changed")
    service = Correspondence(db)
    await service.locked(tx, scope, row.adapter_id)
    await service.admission(tx, scope, row.adapter_id)
    if not {"acquisition.capture", "acquisition.correspondence", "acquisition.work"} <= set(row.permissions):
        raise ControlError(403, "acquisition_model_capture_permission_missing")
    return row, scope, registered_hash


@asynccontextmanager
async def current(tx, authorization_id, session_id, *, execution=False):
    guard(execution=execution)
    row = await tx.scalar(select(ModelAuthorization).where(ModelAuthorization.id == str(UUID(str(authorization_id))),
        ModelAuthorization.environment_id == settings().environment).execution_options(populate_existing=True))
    if row is None:
        raise ControlError(404, "not_found")
    if execution and row.user_id not in settings().acquisition_model_actor_ids:
        raise ControlError(403, "acquisition_model_actor_not_enabled")
    if digest(material(row)) != row.fingerprint or row.model != MODEL or row.effort != EFFORT:
        raise ControlError(503, "acquisition_model_authorization_invalid")
    if not row.enabled or row.source_revision != settings().control_source_revision:
        raise ControlError(409, "acquisition_model_authorization_stale")
    if str(session_id) != row.session_id:
        raise ControlError(403, "acquisition_model_session_changed")
    session = await tx.get(Session, row.session_id, populate_existing=True)
    if not session or session.user_id != row.user_id:
        raise ControlError(401, "unauthenticated")
    await module_admin.execution_current(source_value(row.source_revision))
    registry, agent, config, specification = await saved(tx, session, row.creation_id, row.agent_id)
    expected = {"registration_id": registry.id, "registration_fingerprint": registry.fingerprint,
        "business_id": registry.business_id, "organization_id": registry.organization_id, "user_id": registry.user_id,
        "portfolio_id": registry.portfolio_id, "site_id": registry.site_id, "purpose": agent.purpose,
        "config_id": config.id, "config_revision": agent.current_revision, "config_sha256": config.config_sha256}
    if any(getattr(row, key) != value for key, value in expected.items()):
        raise ControlError(409, "acquisition_model_saved_purpose_changed")
    bound, scope, registered_hash = await module(tx, registry, row.module_fingerprint)
    if (bound.adapter_id != row.adapter_id or module_admin.snapshot(bound) != row.module_snapshot
            or registered_hash != row.work_registration_sha256):
        raise ControlError(409, "acquisition_model_private_registration_changed")
    await tx.execute(text("SELECT set_config('pinet.execution_source_revision',:s,true)"), {"s": row.source_revision})
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if row.approved_at > now or row.expires_at <= now or session.expires_at <= now or session.revoked_at:
        raise ControlError(409, "acquisition_model_authorization_expired")
    work = Work(row, session, scope, specification)
    yield work
    guard(execution=execution)
    await module_admin.execution_current(source_value(row.source_revision))
    await tx.refresh(row)
    await tx.refresh(session)
    bound, _, registered_hash = await module(tx, registry, row.module_fingerprint)
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    # The canonical owner/config locks remain held; expiry and mutable stop are fresh.
    if (not row.enabled or row.expires_at <= now or session.expires_at <= now or session.revoked_at
            or module_admin.snapshot(bound) != row.module_snapshot or registered_hash != row.work_registration_sha256):
        raise ControlError(409, "acquisition_model_authorization_expired")


async def target(tx, work, value):
    """Reuse maintained current campaign/recipient/Module gates before any model."""
    if value.campaign.site_id != work.scope.site_id:
        raise ControlError(403, "acquisition_model_foreign_site")
    # The maintained helper needs these trusted attributes, not a supplied reviewed body.
    target = type("Target", (), {"scope": work.scope, "adapter_id": work.authorization.adapter_id,
        "recipient": value.recipient, "campaign": value.campaign, "prospect": value.prospect})()
    return await available_target(tx, Correspondence(db), target)
