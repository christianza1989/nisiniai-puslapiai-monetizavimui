"""Verify frozen migration in a new disposable local schema; no application rows touched."""
import asyncio
import json
import runpy
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.config import settings


async def main():
    cfg = settings()
    if cfg.environment != "local":
        raise RuntimeError("isolated local migration check only")
    schema = "voice_qa_" + uuid4().hex
    data = json.loads(Path("migrations/versions/0001_core.schema.json").read_text(encoding="utf-8"))
    policy = runpy.run_path("migrations/versions/0002_policy.py")
    memory = runpy.run_path("migrations/versions/0003_memory.py")
    indexes = runpy.run_path("migrations/versions/0004_memory_indexes.py")
    knowledge = runpy.run_path("migrations/versions/0005_knowledge.py")
    costs = runpy.run_path("migrations/versions/0006_costs.py")
    imports = runpy.run_path("migrations/versions/0007_import.py")
    mail = runpy.run_path("migrations/versions/0008_mail.py")
    engine = create_async_engine(cfg.admin_database_url)
    async with engine.begin() as tx:
        await tx.execute(text(f'CREATE SCHEMA "{schema}"'))
        await tx.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        for statement in data["statements"]:
            await tx.execute(text(statement))
        for statement in policy["statements"]():
            await tx.execute(text(statement))
        for statement in memory["STATEMENTS"]:
            await tx.execute(text(statement))
        for statement in indexes["STATEMENTS"]:
            await tx.execute(text(statement))
        for statement in knowledge["STATEMENTS"]:
            await tx.execute(text(statement))
        for statement in costs["STATEMENTS"]:
            await tx.execute(text(statement))
        for statement in imports["STATEMENTS"]:
            await tx.execute(text(statement))
        for statement in mail["STATEMENTS"]:
            await tx.execute(text(statement))
        actual = await tx.scalar(text("SELECT count(*) FROM information_schema.tables WHERE table_schema=:s"), {"s": schema})
        assert actual == len(data["tables"]) + len(policy["TABLES"]) + 5
        policies = await tx.scalar(text("SELECT count(*) FROM pg_policies WHERE schemaname=:s"), {"s": schema})
        assert policies == 14
        forced = await tx.scalar(text("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                                      "WHERE n.nspname=:s AND c.relrowsecurity AND c.relforcerowsecurity"), {"s": schema})
        assert forced == 14
        await tx.execute(text("DROP TABLE mail_messages"))
        await tx.execute(text("DROP TABLE source_checkpoints"))
        await tx.execute(text("DROP TABLE cost_reservations"))
        await tx.execute(text("DROP TABLE knowledge_states"))
        await tx.execute(text("ALTER TABLE conversations DROP CONSTRAINT conversations_visitor_scope_fk"))
        await tx.execute(text("ALTER TABLE conversations DROP COLUMN visitor_id"))
        await tx.execute(text("DROP TABLE visitors"))
        for table in reversed(policy["TABLES"]):
            await tx.execute(text(f'DROP TABLE "{table}"'))
        for table in reversed(data["tables"]):
            await tx.execute(text(f'DROP TABLE "{table}"'))
        # Exact UUID schema created above, already emptied by the frozen downgrade order.
        await tx.execute(text(f'DROP SCHEMA "{schema}"'))
    await engine.dispose()
    print(json.dumps({"migration": "0008_mail", "status": "pass", "tables": actual,
                      "rls_policies": policies, "disposable_schema_removed": True}))


asyncio.run(main())
