"""Normal-owner evidence submit/read and the existing fixed single-task worker."""

import argparse
import asyncio
import json
from pathlib import Path

from customer_profile_admin import read_request

from pinet_core.acquisition import agent_role_tasks
from pinet_core.acquisition.agent_role_contract import KIND
from pinet_core.acquisition.evidence_contract import EvidenceRequest
from pinet_core.control.routes import scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.tasks import worker


async def execute(action, *, session_file=None, request=None, task_id=None):
    if action == "run-one":
        if any((session_file, request, task_id)):
            raise ValueError("source_fixed_worker_requires_no_selected_context")
        return {"task_processed": await worker.execute_once(kind=KIND), "external_sent": False}
    if action not in {"submit", "read"} or not session_file:
        raise ValueError("normal_owner_evidence_action_required")
    if (action == "submit" and (request is None or task_id)) or (
        action == "read" and (not task_id or request is not None)
    ):
        raise ValueError("exact_owner_action_required")
    path = Path(session_file)
    if (
        not path.is_absolute()
        or not path.is_file()
        or any(p.is_symlink() for p in (path, *path.parents))
        or path.stat().st_size > 65536
    ):
        raise ValueError("private_owner_session_required")
    token = json.loads(path.read_text("utf-8"))["access_token"]
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        if action == "submit":
            value = EvidenceRequest.model_validate(request)
            task = await agent_role_tasks.submit(tx, actor, value.model_dump(mode="json"))
            return {"task_id": task.id, "status": task.status, "model_dispatch_performed": False}
        value = await agent_role_tasks.read_request(tx, actor, task_id)
        if not isinstance(value, EvidenceRequest):
            raise ValueError("exact_evidence_task_required")
        retained = await agent_role_tasks.read(tx, actor, task_id)
        return {
            "task_id": str(task_id),
            "status": retained["task"]["status"],
            "role": value.role,
            "execution": retained["execution"],
            "external_sent": False,
        }


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("submit", "read", "run-one"))
    parser.add_argument("--session-file")
    parser.add_argument("--input")
    parser.add_argument("--task-id")
    args = parser.parse_args()
    result = await execute(
        args.action,
        session_file=args.session_file,
        request=read_request(args.input) if args.input else None,
        task_id=args.task_id,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise SystemExit(
            "Evidence task unavailable; inspect retained owner/source/receipt proof. No automatic retry."
        ) from None
