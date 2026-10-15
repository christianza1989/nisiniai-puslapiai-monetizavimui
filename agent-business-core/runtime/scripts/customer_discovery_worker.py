"""Explicit local planning worker; discovery never implicitly starts building."""
import argparse
import asyncio
from uuid import UUID

from control_portable import preflight

from pinet_core.business_discovery import adapter, worker
from pinet_core.config import settings
from pinet_core.db import db


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("check", "once", "worker"))
    parser.add_argument("--discovery-id", type=lambda value: str(UUID(value)))
    args = parser.parse_args()
    await preflight()
    cfg = settings()
    if not cfg.business_discovery_enabled or not cfg.business_discovery_runner_enabled:
        raise RuntimeError("Discovery execution is disabled")
    adapter.available()
    if args.action == "check":
        print("PASS: discovery source/transport preflight only; provider calls0")
    elif args.action == "once":
        print("Discovery job executed:", await worker.execute_once(discovery_id=args.discovery_id))
    else:
        while True:
            await preflight()
            if not await worker.execute_once(discovery_id=args.discovery_id):
                await asyncio.sleep(1)


async def managed():
    try:
        await main()
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    asyncio.run(managed())
