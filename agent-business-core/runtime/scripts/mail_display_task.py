"""Current-owner enqueue/read and one fixed common display worker iteration."""
import argparse
import asyncio
import json
from pathlib import Path

from customer_profile_admin import read_request

from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.mail_view import task_service
from pinet_core.tasks import worker


async def owner_action(action, session_file, request=None, task_id=None):
    path = Path(session_file)
    if (not path.is_absolute() or not path.is_file() or path.stat().st_size > 65536
            or any(p.is_symlink() for p in (path, *path.parents))):
        raise ValueError("private_session_required")
    token = json.loads(path.read_text("utf-8"))["access_token"]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        if action == "enqueue":
            return {**await task_service.enqueue(tx, session, request), "model_dispatch_performed": False}
        value = await task_service.read(tx, session, task_id)
        return {"task_id": value["task"]["task_id"], "status": value["task"]["status"],
            "failure_code": value["task"]["failure_code"], "mail_id": value["mail_id"],
            "execution": value["execution"], "model_dispatch_performed": False}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("enqueue", "read", "run-one"))
    parser.add_argument("--session-file")
    parser.add_argument("--input", help="Private policy/mail IDs; body and tenant are server derived")
    parser.add_argument("--task-id")
    args = parser.parse_args()
    if args.action == "run-one":
        if any((args.session_file, args.input, args.task_id)):
            raise ValueError("fixed_worker_does_not_accept_browser_context")
        from pinet_core.mail_view.task_contract import KIND
        performed = await worker.execute_once(kind=KIND)
        result = {"state": "task_processed" if performed else "no_admitted_task", "task_processed": performed}
    else:
        if not args.session_file or (args.action == "enqueue" and (not args.input or args.task_id)) or (
                args.action == "read" and (not args.task_id or args.input)):
            raise ValueError("exact_owner_request_required")
        result = await owner_action(args.action, args.session_file,
            read_request(args.input) if args.input else None, args.task_id)
    print(json.dumps({**result, "channel_activation": "not_performed"}))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except ControlError as error:
        raise SystemExit("Display task unavailable: "+error.code) from None
    except Exception:
        raise SystemExit("Display task failed; inspect retained source/policy/task evidence. No automatic paid retry.") from None
