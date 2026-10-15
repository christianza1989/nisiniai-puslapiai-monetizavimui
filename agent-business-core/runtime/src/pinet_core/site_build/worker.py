"""Target one approved case through the maintained creation and native GUIDE workers."""
from ..content_work import worker as guides
from ..creation import worker as creations
from . import service


async def tick(creation_id, *, creation_role_runner=None, intake_runner=None, guide_role_runner=None, writer=None):
    result = await service.advance(creation_id)
    if result["phase"] == "business_draft" and result["state"] == "queued":
        ran = await creations.execute_once(creation_id=creation_id,
                                          role_runner=creation_role_runner, intake_runner=intake_runner)
    elif result["phase"] == "initial_content" and result["state"] == "queued":
        ran = await guides.execute_once(creation_id=creation_id, role_runner=guide_role_runner, writer=writer)
    else:
        return {**result, "executed": False}
    return {**await service.advance(creation_id), "executed": ran}
