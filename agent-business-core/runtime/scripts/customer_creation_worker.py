"""Explicit local creation worker preflight/start, no service install or provider probe."""
import argparse
import asyncio

from control_portable import preflight, source_check
from sqlalchemy import text

from pinet_core.config import settings
from pinet_core.creation import language_mode
from pinet_core.creation.adapter import available, role_model, team_instruction_hash
from pinet_core.creation.service import job_history_schema_ready
from pinet_core.creation.team import review_schema_ready
from pinet_core.creation.worker import execute_once, loop
from pinet_core.db import db


async def main(action):
    try:
        await preflight()
        cfg = settings()
        if not cfg.creation_enabled or not cfg.customer_enabled or cfg.control_mode != "local" or cfg.environment == "production":
            raise ValueError("creation_disabled")
        available()
        async with db.registry() as tx:
            if not await review_schema_ready(tx) or not await job_history_schema_ready(tx):
                raise ValueError('creation_review_schema_not_ready')
            count = await tx.scalar(text("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace "
                "AND relname IN ('control_creations','control_creation_jobs','control_creation_revisions',"
                "'control_creation_artifacts','control_creation_events','control_creation_attempts',"
                "'control_creation_team_events') AND relrowsecurity AND relforcerowsecurity"))
            if count != 7 or not await tx.scalar(text("SELECT has_function_privilege(current_user,"
                    "'control_creation_candidates(varchar)','EXECUTE')")):
                raise ValueError('creation_schema_not_ready')
            if not await tx.scalar(text("SELECT has_function_privilege(current_user,"
                    "'control_creation_attempt_count(varchar,timestamptz)','EXECUTE')")):
                raise ValueError('creation_team_schema_not_ready')
        digest = team_instruction_hash()
        print({"source_revision": cfg.control_source_revision, "instruction_hash": digest, "model": "gpt-6-luna",
               "role_models": {role: role_model(role) for role in ("creator", "critic", "coordinator")},
               "web_search_enabled": cfg.creation_web_search_enabled, "global_daily_limit": cfg.creation_global_daily_limit,
               "job_limit": cfg.creation_job_limit,
               "provider_calls": 0, "mode": "local", "language_review_mode": language_mode.mode()})
        if action == "once":
            await execute_once()
        elif action == "worker":
            await loop(source_check)
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["check", "once", "worker"])
    args = parser.parse_args()
    asyncio.run(main(args.action))
