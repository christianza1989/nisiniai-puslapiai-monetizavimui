"""Opt-in API lifecycle for the existing worker loop, not a second executor."""
import asyncio

from ..config import settings
from ..tasks import worker
from . import service


async def start(app):
    cfg = settings()
    if not cfg.workspace_team_runner_enabled:
        return None
    service.guard()
    # Only explicitly configured local/test actors; actor admission is checked again per task.
    if not await worker.handler_for("workspace.team_turn").actors():
        raise RuntimeError("Workspace team runner has no admitted actors")
    return asyncio.create_task(worker.loop(), name="maintained-workspace-task-worker")


async def stop(task):
    if task is not None:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
