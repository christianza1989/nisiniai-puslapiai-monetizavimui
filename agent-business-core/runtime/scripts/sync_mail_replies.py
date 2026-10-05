import asyncio
import json

from pinet_core.db import db
from pinet_core.mail_reader import sync_replies


async def main():
    try:
        print(json.dumps(await sync_replies()))
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
