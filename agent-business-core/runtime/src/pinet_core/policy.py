"""Server-side authority. Model and browser claims never grant capabilities."""
from fastapi import HTTPException
from sqlalchemy import select, text

from .contracts import Policy, PolicyUpdate
from .models import BusinessPolicy, Conversation, PolicyRevision


async def lock(tx, business_id, environment_id, exclusive=False):
    # All authority-sensitive operations take this lock before a conversation row.
    # A disable waits for in-flight DB operations, then excludes subsequent calls.
    function = "pg_advisory_xact_lock" if exclusive else "pg_advisory_xact_lock_shared"
    await tx.execute(text(f"SELECT {function}(hashtextextended(:key, 0))"),
                     {"key": f"policy:{business_id}:{environment_id}"})


async def read(tx):
    row = await tx.scalar(select(BusinessPolicy))
    return (Policy.model_validate(row.payload), row.revision) if row else (Policy(), 0)


async def require(tx, simulation=False, tool=None):
    value, revision = await read(tx)
    if value.paused or (not simulation and not value.enabled):
        raise HTTPException(503, "business_paused" if value.paused else "business_disabled")
    if tool and tool not in value.allowed_tools:
        raise HTTPException(403, "tool_disabled")
    return value, revision


async def update(tx, business_id, environment_id, data: PolicyUpdate):
    from .service import finalize

    previous, revision = await read(tx)
    if data.base_revision != revision:
        raise HTTPException(409, "policy_revision_conflict")
    row = await tx.scalar(select(BusinessPolicy))
    payload = data.policy.model_dump()
    if not row:
        row = BusinessPolicy(business_id=business_id, environment_id=environment_id)
        tx.add(row)
    row.payload, row.revision = payload, revision + 1
    tx.add(PolicyRevision(business_id=business_id, environment_id=environment_id,
                         revision=revision + 1, payload={"policy": payload, "reason": data.reason,
                                                        "actor": "authenticated_operator"}))
    stopped = 0
    if data.policy.paused or (previous.enabled and not data.policy.enabled):
        sessions = (await tx.scalars(select(Conversation).where(
            Conversation.state != "finalized").order_by(Conversation.id).with_for_update())).all()
        for convo in sessions:
            await finalize(tx, convo)
            stopped += 1
    await tx.flush()
    return {"revision": row.revision, "policy": payload, "finalized_sessions": stopped}
