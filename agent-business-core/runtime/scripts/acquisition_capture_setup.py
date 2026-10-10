"""Prepare only the explicitly isolated loopback acquisition acceptance database."""
import asyncio
import os
import subprocess
import sys

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.acquisition.capture_config import capture_config
from pinet_core.acquisition.ledger_schema import DDL, TABLES, isolation_sql


async def initialize(config):
    engine = create_async_engine(config['admin_database_url'])
    try:
        async with engine.begin() as tx:
            exists = await tx.scalar(text("SELECT count(*) FROM pg_roles WHERE rolname='pinet_runtime'"))
            if not exists:
                # Strict synthetic 64hex validated above; never interpolate general credentials.
                password = make_url(config['database_url']).password
                await tx.execute(text(f"CREATE ROLE pinet_runtime LOGIN PASSWORD '{password}' NOSUPERUSER NOBYPASSRLS"))
        env = {**os.environ, 'PINET_ADMIN_DATABASE_URL': config['admin_database_url'],
               'PINET_DATABASE_URL': config['database_url']}
        subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', '0009_facebook'], check=True, env=env)
        async with engine.begin() as tx:
            names = set(await tx.scalars(text("SELECT tablename FROM pg_tables WHERE schemaname='public'")))
            present = names.intersection(TABLES)
            if present and present != set(TABLES):
                raise RuntimeError('Partial acquisition schema; no destructive reset')
            if not present:
                for statement in (*DDL, *isolation_sql()):
                    await tx.execute(text(statement))
            await tx.execute(text('REVOKE UPDATE,DELETE ON acquisition_receipts FROM pinet_runtime'))
            # Full base schema is authoritative; no miniature replacement businesses table.
            await tx.execute(text('GRANT SELECT ON businesses TO pinet_runtime'))
        print('Capture setup PASS: existing migrations through0009 + isolated acquisition DDL; no0012/main mount claim')
    finally:
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(initialize(capture_config()))
