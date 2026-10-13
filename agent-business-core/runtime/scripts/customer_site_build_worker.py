"""Explicit local approved-case continuation. check/advance call no provider."""
import argparse
import asyncio
import json
from uuid import UUID

from control_portable import preflight

from pinet_core.content_work import adapter as guide_adapter
from pinet_core.creation import adapter as creation_adapter
from pinet_core.db import db
from pinet_core.site_build import service, worker


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("check", "advance", "once", "worker"))
    parser.add_argument("--creation-id", required=True, type=lambda value: str(UUID(value)))
    args = parser.parse_args()
    await preflight()
    service.enabled()
    creation_adapter.available()
    guide_adapter.execution_hash()
    if args.action == "check":
        print(json.dumps({"source": "PASS", "provider_calls": 0, "scope": "approved-case continuation"}))
        return
    if args.action == "advance":
        print(json.dumps(await service.advance(args.creation_id)))
        return
    while True:
        await preflight()
        result = await worker.tick(args.creation_id)
        print(json.dumps(result), flush=True)
        if args.action == "once" or not result["executed"] or result["state"] == "blocked":
            return


async def managed():
    try:
        await main()
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    asyncio.run(managed())
