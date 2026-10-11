"""Explicit local admin JSON input; never print sessions, raw drafts, contacts or proof paths."""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.creation_registration.admin import provision, revoke


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["provision", "revoke"])
    parser.add_argument("--input", required=True, help="Private JSON request file outside Git")
    args = parser.parse_args()
    path = Path(args.input)
    if path.stat().st_size > 4096:
        raise ValueError("invalid_registration_request")
    value = json.loads(path.read_text("utf-8"))
    cfg = settings()
    engine = create_async_engine(cfg.admin_database_url)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
            result = await (provision if args.action == "provision" else revoke)(tx, environment=cfg.environment, **value)
        print(json.dumps(result))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise SystemExit("Registration failed; verify the exact private request, current authority and migrations.") from None
