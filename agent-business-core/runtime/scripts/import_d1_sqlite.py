"""Read a named local D1 SQLite database/export; durable server checkpoint.

No default database discovery, Cloudflare secret, original form mutation or mail.
Use --database <absolute path> --site <registered site>. Data stays private.
"""
import argparse
import asyncio
import json
import sqlite3
import time
from pathlib import Path
from uuid import uuid4

import httpx

from pinet_core.config import settings
from pinet_core.security import edge_signature


def read_batch(database, site, cursor):
    path = Path(database).resolve(strict=True)
    with sqlite3.connect(path.as_uri() + "?mode=ro", uri=True) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT id,site_id,created_at,source_path,name,email,message,consent_at,status "
            "FROM niche_leads WHERE site_id=? AND (created_at>? OR (created_at=? AND id>?)) "
            "ORDER BY created_at,id LIMIT 30", (site, cursor["created_at"], cursor["created_at"], cursor["id"])).fetchall()
        return [dict(row) for row in rows]


async def transfer(client, method, site, body=None):
    cfg = settings()
    path = f"/v1/sites/{site}/lead-import"
    content = json.dumps(body).encode() if body is not None else b""
    stamp, nonce = str(int(time.time())), str(uuid4())
    response = await client.request(method, path, content=content, headers={"Content-Type": "application/json",
        "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
        "x-pinet-signature": edge_signature(cfg.edge_secret, stamp, nonce, method, path, content)})
    # Never print the private input or HTTP body on rejection.
    if response.status_code != 200:
        raise RuntimeError(f"source_transfer_http_{response.status_code}")
    return response.json()


async def run(database, site, client):
    imported, batches = 0, 0
    while True:
        state = await transfer(client, "GET", site)
        records = await asyncio.to_thread(read_batch, database, site, state["cursor"])
        if not records:
            return {"status": "pass", "site_id": site, "imported": imported, "batches": batches,
                    "mail_sent": False, "source_database_modified": False}
        receipt = await transfer(client, "POST", site, {"source_system": "website_d1",
            "base_cursor": state["cursor"], "records": records})
        imported += receipt["imported"]
        batches += 1


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True)
    parser.add_argument("--site", required=True, choices=["traktoriupadangos", "greitossvetaines"])
    args = parser.parse_args()
    cfg = settings()
    if cfg.environment != "local":
        raise RuntimeError("local named export adapter only; configure the production source reader separately")
    async with httpx.AsyncClient(base_url=cfg.core_url, timeout=15, follow_redirects=False) as client:
        print(json.dumps(await run(args.database, args.site, client)))


if __name__ == "__main__":
    asyncio.run(main())
