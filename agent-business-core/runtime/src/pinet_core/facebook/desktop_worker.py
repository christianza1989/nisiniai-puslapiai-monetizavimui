"""Authenticated queue bridge for Codex desktop; never simulates having CUA tools in CLI."""
import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import httpx

from ..config import settings
from .browser_contracts import BlockInput, ClaimInput, DiscoveryResult, ReceiptInput, SubmitInput, TaskInput

SCHEMAS = {"claim": ClaimInput, "check": ClaimInput, "resume": ClaimInput, "renew": TaskInput, "submit-permit": SubmitInput,
           "receipt": ReceiptInput, "block": BlockInput, "discovery-result": DiscoveryResult}


async def call(site, operation, request, job_id=None, base_url=None):
    base = base_url or settings().core_url
    parsed = urlparse(base)
    if (parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.username or parsed.password
            or parsed.path not in {"", "/"} or parsed.query or parsed.fragment):
        raise RuntimeError("desktop_bridge_requires_configured_loopback_core")
    if operation not in SCHEMAS or (operation != "claim" and not job_id):
        raise RuntimeError("desktop_bridge_command_invalid")
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", site) or (job_id and not re.fullmatch(r"[a-zA-Z0-9_-]+", job_id)):
        raise RuntimeError("desktop_bridge_identifier_invalid")
    body = SCHEMAS[operation].model_validate(request).model_dump(mode="json")
    route = f"/internal/sites/{site}/facebook/browser/"
    route += "claim" if operation == "claim" else f"posts/{job_id}/{operation}"
    # No redirects and no output of headers/credential values.
    async with httpx.AsyncClient(timeout=15, follow_redirects=False, trust_env=False) as client:
        response = await client.post(base.rstrip("/") + route, json=body,
            headers={"Authorization": "Bearer " + settings().worker_secret})
    if not response.is_success:
        raise RuntimeError(f"desktop_bridge_http_{response.status_code}:" + str(response.json().get("detail")))
    return response.json()


def main():
    # Windows pipes can default to cp1252: a successful claim must not be lost while printing Lithuanian text.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Private queue bridge; browser actions run in Codex desktop")
    parser.add_argument("operation", choices=SCHEMAS)
    parser.add_argument("--site", required=True)
    parser.add_argument("--request-file", required=True)
    parser.add_argument("--job")
    parser.add_argument("--base-url")
    args = parser.parse_args()
    value = json.loads(Path(args.request_file).read_text(encoding="utf-8"))
    result = asyncio.run(call(args.site, args.operation, value, args.job, args.base_url))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
