"""One authenticated Page API queue execution; process exits after the durable result."""
import argparse
import asyncio
import json
import re
import sys
from urllib.parse import urlparse

import httpx

from ..config import settings


async def run(site, owner, base_url=None):
    base = base_url or settings().core_url
    value = urlparse(base)
    if (value.scheme != "http" or value.hostname != "127.0.0.1" or not value.port
            or value.username or value.password or value.path not in {"", "/"} or value.query or value.fragment
            or not re.fullmatch(r"[a-zA-Z0-9_-]+", site)
            or not re.fullmatch(r"[a-zA-Z0-9_-]{8,100}", owner)):
        raise RuntimeError("facebook_page_api_worker_requires_named_site_and_loopback_core")
    async with httpx.AsyncClient(timeout=240, follow_redirects=False, trust_env=False) as client:
        response = await client.post(base.rstrip("/") + f"/internal/sites/{site}/facebook/page-api/run-once",
            json={"owner": owner}, headers={"Authorization": "Bearer " + settings().worker_secret})
    if not response.is_success:
        raise RuntimeError(f"facebook_page_api_worker_http_{response.status_code}")
    result = response.json()
    return {key: result.get(key) for key in ("id", "state", "processed", "reason", "receipt", "external_sending")
            if key in result}


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Execute one durable owned-Page API job")
    parser.add_argument("--site", required=True)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--base-url")
    args = parser.parse_args()
    print(json.dumps(asyncio.run(run(args.site, args.owner, args.base_url)), ensure_ascii=False))


if __name__ == "__main__":
    main()
