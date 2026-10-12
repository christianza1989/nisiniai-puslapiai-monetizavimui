"""Private sidecar for immutable consultation read provenance, no prompt/history."""

import json

from fastapi import APIRouter, Depends, Request, Response

from ..config import settings
from ..control.routes import ControlError, SafeRoute, authenticated, identifier
from ..models import utcnow
from ..tasks.service import get_task, grant_for
from .interfaces import AvailabilityEnvelope, ContextEnvelope
from .read import ADAPTER_REVISION, CAPTURE, WORK, binding, receipt_for

router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


def envelope(request, response, data, model):
    response.headers["Cache-Control"] = "private, no-store"
    value = {
        "contract_version": "director-read.v1",
        "source_revision": settings().control_source_revision,
        "observed_at": utcnow().isoformat(),
        "request_id": request.state.control_request_id,
        "data": data,
    }
    return model.model_validate_json(json.dumps(value)).model_dump(mode="json")


@router.get("/businesses/{business_id}/director-read")
async def available(
    business_id: str, request: Request, response: Response, context=Depends(authenticated, scope="function")
):
    if request.url.query:
        raise ControlError(400, "invalid_request")
    _, session = context
    business_id = identifier(business_id)
    await grant_for(context[0], business_id, session.user_id)
    # A source feature is distinct from connected permissions, worker health and current data.
    return envelope(
        request,
        response,
        {
            "business_id": business_id,
            "configured": settings().director_acquisition_enabled,
            "read_only": True,
            "interactive_cli_tools": False,
            "adapter_revision": ADAPTER_REVISION,
            "tools": [CAPTURE, WORK],
            "worker_health": "unknown",
        },
        AvailabilityEnvelope,
    )


@router.get("/tasks/{task_id}/director-context")
async def context(
    task_id: str, request: Request, response: Response, context=Depends(authenticated, scope="function")
):
    if request.url.query:
        raise ControlError(400, "invalid_request")
    tx, _ = context
    task = await get_task(tx, identifier(task_id))
    from .read import requires_context, run_for

    run = await run_for(tx, task)
    if not await requires_context(tx, task, run):
        return envelope(
            request, response, {"task_id": task.id, "run_id": task.run_id, "context": None}, ContextEnvelope
        )
    bound = await binding(tx, task)
    if bound is None:
        raise ControlError(403, "director_context_unavailable")
    receipt = await receipt_for(tx, task, bound)
    # Only source/hash and canonical tool results; original question/history/instruction stay private.
    return envelope(
        request,
        response,
        {
            "task_id": task.id,
            "run_id": run.id,
            "context": {
                "source_revision": task.source_revision,
                "input_sha256": receipt.input_sha256,
                "created_at": receipt.created_at.isoformat(),
                "tools": receipt.data["context"]["server_tools"],
            },
        },
        ContextEnvelope,
    )
