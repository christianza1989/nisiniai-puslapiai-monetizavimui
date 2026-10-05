"""Operator CLI; credentials stay in the private local configuration, never in arguments."""
import argparse
import asyncio
import json
from urllib.parse import urlparse

import httpx

from pinet_core.config import settings
from pinet_core.contracts import Policy


async def main():
    parser = argparse.ArgumentParser(description="Read or update a niche's runtime policy")
    parser.add_argument("--site", default="traktoriupadangos")
    parser.add_argument("--url", default="http://127.0.0.1:8840")
    for positive, negative in [("enable", "disable"), ("pause", "resume"), ("followup", "no-followup")]:
        group = parser.add_mutually_exclusive_group()
        group.add_argument(f"--{positive}", action="store_true")
        group.add_argument(f"--{negative}", action="store_true")
    parser.add_argument("--deny-tool", action="append", default=[])
    parser.add_argument("--allow-tool", action="append", default=[])
    parser.add_argument("--max-sessions", type=int)
    parser.add_argument("--daily-seconds", type=int)
    parser.add_argument("--daily-budget-microusd", type=int)
    parser.add_argument("--reason")
    args = parser.parse_args()
    target = urlparse(args.url)
    if target.scheme != "https" and not (target.scheme == "http" and target.hostname in {"127.0.0.1", "localhost"}):
        parser.error("Operator API requires HTTPS or local loopback")
    changes = {}
    for field, positive, negative in [("enabled", "enable", "disable"), ("paused", "pause", "resume"),
                                       ("followup_enabled", "followup", "no_followup")]:
        if getattr(args, positive):
            changes[field] = True
        elif getattr(args, negative):
            changes[field] = False
    if args.max_sessions is not None:
        changes["max_sessions"] = args.max_sessions
    if args.daily_seconds is not None:
        changes["daily_reserved_seconds"] = args.daily_seconds
    if args.daily_budget_microusd is not None:
        changes["daily_budget_microusd"] = args.daily_budget_microusd
    if (changes or args.deny_tool or args.allow_tool) and not args.reason:
        parser.error("Provide --reason for an audited change")
    if not settings().operator_secret:
        parser.error("Private operator configuration missing; run setup_local.py")
    async with httpx.AsyncClient(base_url=args.url, timeout=35, follow_redirects=False,
            headers={"Authorization": f"Bearer {settings().operator_secret}"}) as client:
        path = f"/operator/sites/{args.site}/policy"
        current = await client.get(path)
        if current.status_code != 200:
            raise RuntimeError(f"operator_read_rejected:{current.status_code}")
        data = current.json()
        if changes or args.deny_tool or args.allow_tool:
            tools = list(dict.fromkeys(data["policy"]["allowed_tools"] + args.allow_tool))
            if args.deny_tool:
                tools = [tool for tool in tools if tool not in args.deny_tool]
            value = Policy.model_validate({**data["policy"], **changes, "allowed_tools": tools})
            result = await client.put(path, json={"base_revision": data["revision"],
                "policy": value.model_dump(), "reason": args.reason})
            if result.status_code != 200:
                raise RuntimeError(f"operator_change_rejected:{result.status_code}")
            data = result.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))


asyncio.run(main())
