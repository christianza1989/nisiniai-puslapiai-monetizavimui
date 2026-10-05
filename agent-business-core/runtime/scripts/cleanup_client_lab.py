"""Clean one explicitly named disposable local lab after interruption."""
import argparse
import asyncio
from uuid import UUID

from sqlalchemy import delete

from pinet_core import service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Admission, BusinessPolicy, Case, CostReservation, KnowledgeState, PolicyRevision


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run_id", type=UUID)
    parser.add_argument("--site", required=True)
    args = parser.parse_args()
    if settings().environment != "local":
        raise RuntimeError("local_only")
    settings().environment = "client-lab-" + str(args.run_id)
    item = await service.business(args.site)
    async with db.transaction(item.id, settings().environment) as tx:
        for table in [Case, KnowledgeState, BusinessPolicy, PolicyRevision]:
            await tx.execute(delete(table))
    async with db.registry() as tx:
        for table in [Admission, CostReservation]:
            await tx.execute(delete(table).where(table.environment_id == settings().environment))
    await db.engine.dispose()
    print("Only the explicitly named local client-lab scope cleared.")


if __name__ == "__main__":
    asyncio.run(main())
