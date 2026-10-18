"""Normal-owner explicit model task submit/read; source-fixed one-task worker."""
import argparse
import asyncio
import json
from pathlib import Path

from customer_profile_admin import read_request

from pinet_core.acquisition import model_tasks
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.tasks import worker


async def owner_action(action, session_file, request=None, task_id=None):
    path = Path(session_file)
    if not path.is_absolute() or not path.is_file() or path.is_symlink() or path.stat().st_size > 65536:
        raise ValueError("private_session_required")
    session = json.loads(path.read_text("utf-8"))
    token = session["access_token"]
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        if action in {"submit", "submit-reply"}:
            row = await (model_tasks.submit_reply if action == "submit-reply" else model_tasks.submit)(tx, actor, request)
            return {"status": row.status, "task_id": row.id, "kind": row.kind,
                "model_dispatch_performed": False, "channel_activation": "not_performed"}
        value = await model_tasks.read(tx, actor, task_id)
        task, result = value["task"], value["task"]["result"] or {}
        return {"status": task["status"], "task_id": task["task_id"], "kind": task["kind"],
            "failure_code": task["failure_code"], "result_state": result.get("state"),
            "case_id": result.get("case_id"), "mail_id": result.get("mail_id"),
            "execution": value["execution"], "channel_activation": "not_performed"}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("submit", "submit-reply", "read", "run-one", "run-reply"))
    parser.add_argument("--session-file", help="Private current normal owner Session; never put token on command line")
    parser.add_argument("--input", help="Private typed input for submit")
    parser.add_argument("--task-id", help="Exact retained task ID for read")
    args = parser.parse_args()
    if args.action in {"run-one", "run-reply"}:
        if any((args.session_file, args.input, args.task_id)):
            raise ValueError("source_fixed_worker_does_not_accept_browser_context")
        from pinet_core.acquisition.model_contract import KIND, REPLY_KIND
        performed = await worker.execute_once(kind=REPLY_KIND if args.action == "run-reply" else KIND)
        result = {"status": "task_processed" if performed else "no_admitted_task",
            "task_processed": performed, "channel_activation": "not_performed"}
    else:
        if not args.session_file or (args.action in {"submit", "submit-reply"} and (not args.input or args.task_id)) or (
                args.action == "read" and (not args.task_id or args.input)):
            raise ValueError("exact_owner_request_required")
        result = await owner_action(args.action, args.session_file,
            read_request(args.input) if args.input else None, args.task_id)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except ControlError as error:
        raise SystemExit("Model task unavailable: "+error.code) from None
    except Exception:
        raise SystemExit("Model task failed; inspect exact owner/source/authorization and retained task evidence. No automatic retry.") from None
