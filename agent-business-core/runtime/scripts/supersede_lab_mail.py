"""Reversibly retire only drafts imported from one explicitly named synthetic report."""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from pinet_core import service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import MailMessage


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    data = json.loads(args.report.read_text(encoding="utf-8"))
    if settings().environment != "local" or not data.get("synthetic_core_scope"):
        raise RuntimeError("named_local_synthetic_report_required")
    count = 0
    for row in data["clients"]:
        item = await service.business(row["site_id"])
        case_id = str(uuid5(NAMESPACE_URL, item.site_id + ":client-lab:" + row["conversation_id"]))
        async with db.transaction(item.id, settings().environment) as tx:
            for message in await tx.scalars(select(MailMessage).where(MailMessage.case_id == case_id,
                    MailMessage.state == "draft").with_for_update()):
                if message.payload.get("synthetic"):
                    message.state = "superseded"
                    count += 1
    await db.engine.dispose()
    print(json.dumps({"superseded_drafts": count, "sent_messages_modified": False}))


if __name__ == "__main__":
    asyncio.run(main())
