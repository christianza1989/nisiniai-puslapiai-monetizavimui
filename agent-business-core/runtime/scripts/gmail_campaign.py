"""Explicit operator-reviewed campaign prepare/send/known-reply commands.

No campaign approval, scheduler, automatic reply or acquisition promotion.
"""
import argparse
import asyncio
import json
import os

from gmail_owner import private_path, read_private

from pinet_core.control.routes import ControlError
from pinet_core.db import db
from pinet_core.mail_provider.campaign import CampaignGmail
from pinet_core.mail_provider.gmail import GmailError
from pinet_core.mail_provider.vault import Vault


async def execute(args):
    path = private_path(args.output, exists=False)
    with path.open("x", encoding="utf-8") as output:
        os.chmod(path, 0o600)
        json.dump({"status": "started", "action": args.action}, output)
        output.flush()
        os.fsync(output.fileno())
    session = read_private(args.session_file)
    token = session.get("access_token")
    if not isinstance(token, str) or not 1 <= len(token) <= 8192:
        raise GmailError("gmail_private_session_required")
    gateway = CampaignGmail(Vault(args.vault, private_path(args.key_file).read_bytes().strip()),
        args.connection_id, token, args.business_id, plan_path=args.plan, plan_sha256=args.plan_sha256)
    if args.action == "prepare":
        result = await gateway.prepare_letter(args.identity)
    elif args.action == "send":
        result = await gateway.send_letter(args.identity)
    else:
        result = await gateway.sync_letter(args.identity)
    with path.open("w", encoding="utf-8") as output:
        json.dump({"status": "complete", "action": args.action, "result": result,
                   "automatic_reply_dispatched": False}, output, ensure_ascii=False, indent=2)
        output.flush()
        os.fsync(output.fileno())
    return {"status": "complete", "action": args.action, "automatic_reply_dispatched": False}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "send", "sync"))
    for name in ("identity", "business-id", "connection-id", "session-file", "vault", "key-file", "plan", "plan-sha256", "output"):
        parser.add_argument("--" + name, required=True)
    try:
        print(json.dumps(await execute(parser.parse_args())))
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (ControlError, GmailError) as error:
        raise SystemExit("Gmail campaign unavailable: " + error.code) from None
    except Exception:
        raise SystemExit("Gmail campaign failed; inspect retained private receipt. No automatic retry.") from None
