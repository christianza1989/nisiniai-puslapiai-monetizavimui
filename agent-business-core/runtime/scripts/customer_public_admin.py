"""Local admin JSON input file. Never print passwords, tokens, email or private evidence."""
import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.customer.admin import decide
from pinet_core.public_projects.admin import approve, revoke, save


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['draft', 'approve', 'revoke', 'intake-decision'])
    parser.add_argument('--input', required=True, help='Private JSON input file; keep outside Git')
    args = parser.parse_args()
    value = json.loads(Path(args.input).read_text('utf-8'))
    cfg = settings()
    engine = create_async_engine(cfg.admin_database_url)
    try:
        async with AsyncSession(engine) as tx, tx.begin():
            if args.action == 'draft':
                value['publish_at'] = datetime.fromisoformat(value['publish_at'])
                result = await save(tx, environment=cfg.environment, **value)
            elif args.action == 'approve':
                result = await approve(tx, environment=cfg.environment, **value)
            elif args.action == 'revoke':
                result = await revoke(tx, environment=cfg.environment, **value)
            else:
                result = await decide(tx, environment=cfg.environment, **value)
        print(json.dumps(result))
    finally:
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
