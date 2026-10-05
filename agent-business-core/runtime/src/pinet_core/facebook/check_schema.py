"""Prove additive schema in a disposable transaction before local migration."""
import asyncio
import json
import runpy
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from ..config import settings


async def check():
    if settings().environment != "local":
        raise RuntimeError("local schema check only")
    migrations = Path(__file__).resolve().parents[3] / "migrations/versions"
    schema = "facebook_qa_" + uuid4().hex
    frozen = json.loads((migrations / "0001_core.schema.json").read_text(encoding="utf-8"))
    statements = list(frozen["statements"])
    for name in ["0002_policy", "0003_memory", "0004_memory_indexes", "0005_knowledge",
                 "0006_costs", "0007_import", "0008_mail", "0009_facebook"]:
        module = runpy.run_path(str(migrations / (name + ".py")))
        statements.extend(module["statements"]() if "statements" in module else module["STATEMENTS"])
    engine = create_async_engine(settings().admin_database_url)
    async with engine.begin() as tx:
        await tx.execute(text(f'CREATE SCHEMA "{schema}"'))
        await tx.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        for statement in statements:
            await tx.execute(text(statement))
        forced = await tx.scalar(text("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                                     "WHERE n.nspname=:s AND c.relrowsecurity AND c.relforcerowsecurity"), {"s": schema})
        tables = await tx.scalar(text("SELECT count(*) FROM information_schema.tables WHERE table_schema=:s"),
                                 {"s": schema})
        assert tables == 20 and forced == 16
        # Name is the exact newly created UUID schema, never user input or a computed workspace path.
        await tx.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    await engine.dispose()
    return {"migration": "0009_facebook", "tables": tables, "forced_rls_tables": forced,
            "disposable_schema_removed": True}


if __name__ == "__main__":
    print(json.dumps(asyncio.run(check())))
