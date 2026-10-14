"""Read-only readiness inventory. Never outputs secret values or claims audio proof."""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core import knowledge, onboarding, policy
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Outbox
from pinet_core.service import business
from pinet_core.profiles import PROFILES


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', choices=sorted(PROFILES), default='traktoriupadangos')
    args = parser.parse_args()
    cfg = settings()
    checks = []

    def add(name, ok, required_for="live"):
        checks.append({"check": name, "status": "PASS" if ok else "UNVERIFIED", "required_for": required_for})

    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        add("postgres_restricted_role", not role.rolsuper and not role.rolbypassrls, "local_and_live")
    migration = "unavailable_to_runtime_role"
    # Migration metadata stays inaccessible to the runtime. This optional CLI
    # check uses the separately configured administration connection read-only.
    if cfg.admin_database_url:
        metadata_engine = create_async_engine(cfg.admin_database_url)
        async with metadata_engine.begin() as tx:
            await tx.execute(text("SET TRANSACTION READ ONLY"))
            migration = await tx.scalar(text("SELECT version_num FROM alembic_version"))
        await metadata_engine.dispose()
    add("distinct_server_secrets", len({cfg.edge_secret, cfg.worker_secret, cfg.operator_secret}) == 3
        and all(len(x) >= 32 for x in [cfg.edge_secret, cfg.worker_secret, cfg.operator_secret]), "local_and_live")
    add("google_key_configured", bool(cfg.google_api_key))
    add("livekit_credentials_configured", bool(cfg.livekit_api_key and cfg.livekit_api_secret))
    add("measured_m0_gate", cfg.m0_verified)
    add("simulation_disabled_for_live", not cfg.allow_simulation)
    add("explicit_global_budget_and_voice_ceiling", cfg.global_daily_budget_microusd > 0 and cfg.voice_cost_ceiling_microusd > 0)
    add("explicit_postcall_ceiling", cfg.analysis_cost_ceiling_microusd > 0)
    item = await business(args.site)
    async with db.transaction(item.id, cfg.environment) as tx:
        value, revision = await policy.read(tx)
        add("site_enabled_and_unpaused", value.enabled and not value.paused)
        add("explicit_site_budget", value.daily_budget_microusd > 0)
        add("current_approved_knowledge", await knowledge.projection(tx) is not None, "local_and_live")
        add('source_explicitly_admitted', (await onboarding.status(tx, item.site_id))['source_ready'], 'local_and_live')
        add('site_allowed_for_voice', args.site in cfg.voice_sites)
        pending = await tx.scalar(select(func.count()).select_from(Outbox).where(Outbox.state.in_(["dispatched", "unknown"])))
    report = {"site_id": args.site, "canonical_host": item.canonical_host,
              "environment": cfg.environment, "migration": migration, "policy_revision": revision,
              "checks": checks, "voice_enabled": cfg.voice_enabled, "smtp_enabled": cfg.smtp_enabled,
              "unreconciled_delivery_count": pending, "audio_test_verified_by_this_script": False,
              "invoice_verified_by_this_script": False,
              "live_eligible": all(x["status"] == "PASS" for x in checks) and cfg.voice_enabled}
    Path("artifacts").mkdir(exist_ok=True)
    target = Path('artifacts/prelive-doctor.json') if args.site == 'traktoriupadangos' else Path('artifacts') / (args.site + '-voice') / 'prelive-doctor.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    await db.engine.dispose()


asyncio.run(main())
