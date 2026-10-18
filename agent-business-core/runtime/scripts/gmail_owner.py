"""Explicit current-owner local Gmail OAuth/self-test; no campaign activation."""
import argparse
import asyncio
import json
import os
from pathlib import Path
from uuid import UUID

from pinet_core.control.routes import ControlError
from pinet_core.db import db
from pinet_core.mail_provider.callback import listener
from pinet_core.mail_provider.gmail import GmailError
from pinet_core.mail_provider.owner import OwnerGmail
from pinet_core.mail_provider.vault import Vault


def private_path(value, *, exists=True):
    path = Path(value)
    if (not path.is_absolute() or any(p.is_symlink() for p in (path, *path.parents))
            or exists and (not path.is_file() or path.stat().st_size > 65536)):
        raise GmailError("gmail_private_file_required")
    return path


def read_private(value):
    try:
        result = json.loads(private_path(value).read_text("utf-8-sig"))
        if not isinstance(result, dict):
            raise ValueError("object_required")
        return result
    except (OSError, ValueError, TypeError):
        raise GmailError("gmail_private_file_unavailable") from None


def save_private(path, value):
    """Exclusive receipts keep prior failed/ambiguous attempts inspectable."""
    path = private_path(path, exists=False)
    with path.open("x", encoding="utf-8", newline="\n") as output:
        os.chmod(path, 0o600)
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.flush()
        os.fsync(output.fileno())


async def execute(args):
    # Reserve output before any transport effect. A failed run is retained and
    # requires a new output path; it does not authorize retrying an unknown send.
    output = private_path(args.output, exists=False)
    with output.open("x", encoding="utf-8") as pending:
        os.chmod(output, 0o600)
        json.dump({"status": "started", "action": args.action}, pending)
        pending.flush()
        os.fsync(pending.fileno())
    session = read_private(args.session_file)
    token = session.get("access_token")
    if not isinstance(token, str) or not 1 <= len(token) <= 8192:
        raise GmailError("gmail_private_session_required")
    key = private_path(args.key_file).read_bytes().strip()
    gateway = OwnerGmail(Vault(args.vault, key), args.connection_id, token, args.business_id)
    if args.action == "connect":
        if not args.client_file or not args.authorization_output or args.request or args.mail_id:
            raise GmailError("gmail_exact_connect_request_required")
        async with listener(gateway.complete) as (redirect, result):
            url = await gateway.begin(read_private(args.client_file), redirect)
            save_private(args.authorization_output, {"authorization_url": url, "connection_id": gateway.id,
                "expires_in_seconds": 600, "status": "awaiting_google_consent"})
            print(json.dumps({"status": "awaiting_google_consent", "connection_id": gateway.id}), flush=True)
            try:
                value = await asyncio.wait_for(asyncio.shield(result), 600)
            except TimeoutError:
                raise GmailError("gmail_oauth_flow_expired") from None
    elif args.action == "prepare-self-test":
        if not args.request or args.client_file or args.authorization_output or args.mail_id:
            raise GmailError("gmail_exact_self_test_request_required")
        request = read_private(args.request)
        if set(request) != {"request_id", "subject", "body"}:
            raise GmailError("gmail_exact_self_test_request_required")
        value = await gateway.prepare_self_test(**request)
    else:
        if not args.mail_id or args.request or args.client_file or args.authorization_output:
            raise GmailError("gmail_exact_known_mail_required")
        value = await (gateway.send_self_test(args.mail_id) if args.action == "send-self-test"
                       else gateway.sync_self_test(args.mail_id))
    # Finish the exclusively reserved receipt, never a different run's file.
    with output.open("w", encoding="utf-8", newline="\n") as saved:
        json.dump({"status": "complete", "action": args.action, "connection_id": gateway.id,
            "result": value, "campaign_activation": False}, saved, ensure_ascii=False, indent=2)
        saved.flush()
        os.fsync(saved.fileno())
    return {"status": "complete", "action": args.action, "connection_id": gateway.id,
            "campaign_activation": False}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("connect", "prepare-self-test", "send-self-test", "sync-self-test"))
    for name in ("business-id", "connection-id", "session-file", "vault", "key-file", "output"):
        parser.add_argument("--" + name, required=True)
    for name in ("client-file", "authorization-output", "request", "mail-id"):
        parser.add_argument("--" + name)
    args = parser.parse_args()
    UUID(args.business_id)
    UUID(args.connection_id)
    try:
        print(json.dumps(await execute(args)))
    finally:
        await db.engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (ControlError, GmailError) as error:
        raise SystemExit("Gmail action unavailable: " + error.code) from None
    except Exception:
        raise SystemExit("Gmail action failed; inspect retained private receipt. No automatic send retry.") from None
