"""Normal API startup and one current actor-authorized portal/director read tool."""

import re

from sqlalchemy import text

from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError
from ..models import Business
from ..tasks.service import grant_for
from .interfaces import Scope
from .ledger import LedgerError, apply_scope
from .module_models import ModuleBinding
from .normal_config import read_registration, runtime_for
from .projection import capture_snapshot_in_transaction
from .routes import validate_capture_storage


async def start(app, database):
    cfg = settings()
    app.state.acquisition_runtime = None
    if not cfg.acquisition_capture_enabled:
        return
    registration, fingerprint = read_registration(cfg)
    await validate_capture_storage(database)
    async with database.registry() as tx:
        row = (
            await tx.execute(
                text(
                    "SELECT relrowsecurity,relforcerowsecurity,has_table_privilege(current_user,oid,'INSERT'),has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE') FROM pg_class WHERE relname='acquisition_modules' AND relnamespace='public'::regnamespace"
                )
            )
        ).one()
        if tuple(row) != (True, True, False, False, False):
            raise RuntimeError("acquisition_module_registration_requires_readonly_forced_rls")
        for entry in registration.entries:
            await apply_scope(tx, entry.scope, entry.adapter_id)
            business = await tx.get(Business, entry.scope.business_id)
            module = await tx.get(ModuleBinding, (entry.scope.business_id, entry.scope.environment_id))
            if (
                not business
                or business.site_id != entry.scope.site_id
                or not module
                or module.site_id != business.site_id
                or module.adapter_id != entry.adapter_id
            ):
                raise RuntimeError("registered_acquisition_module_required")
    app.state.acquisition_registration_sha256 = fingerprint
    app.state.acquisition_runtime = runtime_for(database, registration)
    app.state.acquisition_runtime.ledger.fresh_authorize = authorize_fresh_command


async def authorize_fresh_command(tx, operation, value):
    scope = value.scope
    pinned = await tx.scalar(
        text("SELECT acquisition_pin_module(:b,:e,:s,:a)"),
        {"b": scope.business_id, "e": scope.environment_id, "s": scope.site_id, "a": value.adapter_id},
    )
    module = await tx.get(ModuleBinding, (scope.business_id, scope.environment_id), populate_existing=True)
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if not pinned or not module or module.site_id != scope.site_id or module.adapter_id != value.adapter_id:
        raise LedgerError(403, "acquisition_module_denied")
    # Retirement and real inactive lifecycle signals must survive stop/expiry.
    if operation == "retire-recipient" or (
        operation == "events" and value.kind in {"profile_deactivated", "account_deleted"}
    ):
        return now
    if not module.enabled or "acquisition.capture" not in module.permissions:
        raise LedgerError(409, "acquisition_module_stopped")
    authority = await tx.scalar(
        text("SELECT acquisition_pin_authority(:b,:e,:s,:a)"),
        {"b": scope.business_id, "e": scope.environment_id, "s": scope.site_id, "a": value.adapter_id},
    )
    if not authority:
        raise LedgerError(403, "acquisition_module_denied")
    await tx.execute(
        text("SELECT set_config('pinet.control_user',:u,true)"), {"u": module.approved_by_user_id}
    )
    user = await tx.get(User, module.approved_by_user_id)
    try:
        grant = await grant_for(tx, scope.business_id, module.approved_by_user_id)
    except ControlError:
        raise LedgerError(403, "acquisition_module_denied") from None
    if not user or not user.enabled or grant.organization_id != module.organization_id:
        raise LedgerError(403, "acquisition_module_denied")
    # Any identity barrier/grant read above may wait; expiry uses the final DB clock.
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if module.expires_at <= now or module.approved_at > now:
        raise LedgerError(409, "acquisition_approval_expired")
    if module.source_revision != settings().control_source_revision:
        raise LedgerError(409, "acquisition_source_changed")
    return now


def ready(app):
    try:
        registration, fingerprint = read_registration(settings())
        if fingerprint != app.state.acquisition_registration_sha256 or app.state.acquisition_runtime is None:
            raise ValueError()
        return registration
    except (ValueError, OSError, AttributeError):
        raise ControlError(503, "acquisition_unavailable") from None


async def read_snapshot(app, database, *, business_id, user_id, session_id):
    """Only an authenticated identity and business UUID cross this internal boundary."""
    registration = ready(app)
    cfg = settings()
    async with database.registry() as tx:
        await tx.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        await tx.execute(
            text(
                "SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true),set_config('pinet.business',:b,true)"
            ),
            {"e": cfg.environment, "u": user_id, "b": business_id},
        )
        # Authorization and all counts share this transaction snapshot; no detached grant-to-data race.
        observed = await tx.scalar(text("SELECT transaction_timestamp()"))
        session = await tx.get(Session, session_id)
        user = await tx.get(User, user_id)
        if (
            not session
            or session.user_id != user_id
            or session.revoked_at
            or session.expires_at <= observed
            or not user
            or not user.enabled
        ):
            raise ControlError(401, "unauthenticated")
        grant = await grant_for(tx, business_id, user_id)
        business = await tx.get(Business, business_id)
        module = await tx.get(ModuleBinding, (business_id, cfg.environment))
        if (
            not business
            or not module
            or module.organization_id != grant.organization_id
            or module.site_id != business.site_id
        ):
            raise ControlError(503, "acquisition_not_connected")
        if not module.enabled or "acquisition.read" not in module.permissions:
            raise ControlError(403, "acquisition_read_denied")
        if module.expires_at <= observed or module.approved_at > observed:
            raise ControlError(409, "acquisition_approval_expired")
        if (
            not re.fullmatch("[a-f0-9]{40}", cfg.control_source_revision)
            or module.source_revision != cfg.control_source_revision
        ):
            raise ControlError(409, "acquisition_source_changed")
        scope = Scope(
            business_id=business.id,
            site_id=business.site_id,
            environment_id=cfg.environment,
            environment_class="test",
        )
        if not any(e.scope == scope and e.adapter_id == module.adapter_id for e in registration.entries):
            raise ControlError(503, "acquisition_not_connected")
        await apply_scope(tx, scope, module.adapter_id)
        # Reuse exact v1 definition, expiry time, watermark and redaction; missing sources remain null.
        return await capture_snapshot_in_transaction(
            tx, scope=scope, adapter_id=module.adapter_id, now=observed
        )
