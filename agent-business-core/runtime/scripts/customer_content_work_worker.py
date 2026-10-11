"""Explicit local GUIDE worker; check never invokes a provider."""
import argparse
import asyncio

from control_portable import preflight, source_check
from sqlalchemy import text

from pinet_core.content_work import service
from pinet_core.content_work.adapter import execution_hash
from pinet_core.content_work.worker import execute_once, loop
from pinet_core.creation import language_mode
from pinet_core.creation.adapter import available
from pinet_core.db import db


async def main(action):
    try:
        await preflight()
        service.enabled()
        available()
        execution_hash()
        async with db.registry() as tx:
            count = await tx.scalar(text("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace "
                "AND relname IN ('control_content_work_jobs','control_content_work_attempts','control_content_work_events') "
                "AND relrowsecurity AND relforcerowsecurity"))
            if count != 3 or not await service.review_schema_ready(tx) or not await tx.scalar(text("SELECT has_function_privilege(current_user,"
                "'control_content_work_candidates(varchar)','EXECUTE')")):
                raise ValueError("content_work_schema_not_ready")
        print({"adapter": "codex-native-guide-team.v1", "provider_calls": 0, "rounds": 2, "calls": 6,
               "maximum_seconds": 300, "approval": "not_performed", "language_review_mode": language_mode.mode()})
        if action == "once":
            await execute_once()
        elif action == "worker":
            await loop(source_check)
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["check", "once", "worker"])
    asyncio.run(main(parser.parse_args().action))
