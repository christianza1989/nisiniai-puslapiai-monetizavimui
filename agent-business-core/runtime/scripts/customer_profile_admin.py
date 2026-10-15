"""Explicit private local profile admission; never prints source texts or sessions."""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.customer_profile.admin import admit, revoke


def read_request(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 4096:
        raise ValueError("invalid_profile_request")
    value = json.loads(path.read_text("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("invalid_profile_request")
    return value


async def execute(action, value):
    cfg = settings()
    engine = create_async_engine(cfg.admin_database_url)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
            return await (admit if action == "admit" else revoke)(tx, environment=cfg.environment, **value)
    finally:
        await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["admit", "revoke"])
    parser.add_argument("--input", required=True, help="Private JSON request outside Git")
    args = parser.parse_args()
    print(json.dumps(await execute(args.action, read_request(args.input))))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise SystemExit("Profile operation failed; verify the exact private request, current authority and source.") from None
