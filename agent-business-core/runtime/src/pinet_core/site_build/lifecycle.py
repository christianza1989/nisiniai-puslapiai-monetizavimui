"""Explicit local owner supervisor over maintained jobs; no implicit approval."""
import asyncio
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..business_discovery import worker as discovery
from ..config import settings
from ..content_work import adapter as guide_adapter
from ..control.models import Membership, User
from ..control.routes import ControlError, scope
from ..customer.models import Account
from ..customer_text.adapter import source_current
from ..db import db
from ..tasks.codex_transport import RunnerError
from . import selectors, service, worker


def actors():
    cfg = settings()
    service.enabled()
    if not cfg.control_enabled or not cfg.site_build_api_runner_enabled or not cfg.business_discovery_runner_enabled:
        raise RuntimeError("site_build_runner_disabled")
    try:
        values = tuple(str(UUID(value)) for value in cfg.site_build_actor_ids)
    except (ValueError, TypeError, AttributeError):
        raise RuntimeError("site_build_actor_allowlist_invalid") from None
    if not 1 <= len(values) <= 16 or len(set(values)) != len(values):
        raise RuntimeError("site_build_actor_allowlist_invalid")
    return values


async def source_guard():
    actors()
    if not await asyncio.to_thread(source_current):
        raise RunnerError("source_unavailable")


async def preflight():
    configured = actors()
    await source_guard()
    # These maintained checks inspect pinned paths/hashes/profiles and call no provider.
    await asyncio.to_thread(discovery.adapter.available)
    await asyncio.to_thread(guide_adapter.execution_hash)
    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        if any(role) or not await selectors.ready(tx):
            raise RuntimeError("site_build_runner_schema_unavailable")
    for actor in configured:
        async with scope(user=actor) as tx:
            eligible = await tx.scalar(select(User.id).join(Account, Account.user_id == User.id).join(
                Membership, Membership.user_id == User.id).where(User.id == actor, User.enabled,
                User.environment_id == settings().environment, Account.verified_at.is_not(None),
                Membership.enabled, Membership.role == "owner").limit(1))
            if not eligible:
                raise RuntimeError("site_build_actor_unavailable")


async def sweep(cursors, *, discovery_runner=None, build_runner=None):
    """Each owner/phase advances a bounded page; cursors wrap and restart from DB."""
    configured = actors()
    ran = False
    for actor in configured:
        for kind in ("discovery", "build"):
            await source_guard()
            key = (actor, kind)
            async with scope(user=actor) as tx:
                rows = await selectors.page(tx, kind, actor, settings().environment, cursors.get(key))
            cursors[key] = rows[-1] if rows else None
            for identity in rows:
                await source_guard()
                try:
                    if kind == "discovery":
                        ran = await (discovery_runner or discovery.execute_once)(discovery_id=identity) or ran
                    else:
                        result = await (build_runner or worker.tick)(identity)
                        ran = result["executed"] or ran
                except ControlError as error:
                    if error.code == "source_unavailable":
                        raise
                    # Current tenant/receipt denial is not permission to fall back
                    # or retry failed work. The next key remains independently eligible.
    return ran


async def loop():
    cursors = {}
    while True:
        try:
            await sweep(cursors)
            await asyncio.sleep(1)
        except SQLAlchemyError:
            # An interrupted execution retains its lease/failure accounting.
            # Rescan durable jobs; never reset them or retry a terminal failure.
            await asyncio.sleep(5)


async def start(app):
    if not settings().site_build_api_runner_enabled:
        app.state.site_build_runner_status = "disabled"
        return None
    await preflight()
    task = asyncio.create_task(loop(), name="maintained-site-build-supervisor")
    app.state.site_build_runner_status = "running"

    def completed(value):
        app.state.site_build_runner_status = "stopped" if value.cancelled() or value.exception() is None else "failed"

    task.add_done_callback(completed)
    return task


async def stop(task):
    if task is None:
        return
    task.cancel()

    async def joined():
        await asyncio.gather(task, return_exceptions=True)

    joining = asyncio.create_task(joined())
    cancelled = False
    while not joining.done():
        try:
            await asyncio.shield(joining)
        except asyncio.CancelledError:
            cancelled = True
    joining.result()
    if cancelled:
        raise asyncio.CancelledError


async def main():
    """Explicit `python -m pinet_core.site_build.lifecycle`; defaults reject start."""
    try:
        await preflight()
        await loop()
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
