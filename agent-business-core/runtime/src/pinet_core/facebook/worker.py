"""Bounded module runner. Private drafts only, no Meta or browser calls."""
import argparse
import asyncio
import json

from ..config import settings
from ..db import db
from ..service import business
from .service import tick


async def run_once(site, generator="brief"):
    item = await business(site)
    if generator == "codex":
        from .agent import generate
        from .service import claim_model_draft, complete_model_draft
        async with db.transaction(item.id, settings().environment) as tx:
            task = await claim_model_draft(tx, item)
        if not task:
            return {"site_id": site, "state": "idle_or_limited", "processed": 0}
        # No database lock is held while the local model runs.
        result = await generate(task)
        async with db.transaction(item.id, settings().environment) as tx:
            result = await complete_model_draft(tx, item, task, result)
    else:
        async with db.transaction(item.id, settings().environment) as tx:
            result = await tick(tx, item)
    return {"site_id": site, **result}


async def main(site, generator):
    result = await run_once(site, generator)
    await db.engine.dispose()
    print(json.dumps(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare at most one private Facebook draft")
    parser.add_argument("--site", required=True)
    parser.add_argument("--generator", choices=["brief", "codex"], default="brief")
    args = parser.parse_args()
    asyncio.run(main(args.site, args.generator))
