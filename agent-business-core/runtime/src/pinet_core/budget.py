"""Explicit declared ceilings, not invented prices or proof of provider billing."""
from fastapi import HTTPException
from sqlalchemy import select, text

from .config import settings
from .models import CostReservation, utcnow


async def reserve(tx, business_id, authority, action_key, amount):
    cfg = settings()
    if amount <= 0 or cfg.global_daily_budget_microusd <= 0 or authority.daily_budget_microusd <= 0:
        raise HTTPException(503, "cost_budget_not_configured")
    await tx.execute(text("SELECT pg_advisory_xact_lock(724930)"))
    previous = await tx.scalar(select(CostReservation).where(CostReservation.action_key == action_key))
    if previous:
        if previous.business_id != business_id or previous.environment_id != cfg.environment or previous.reserved_microusd != amount:
            raise HTTPException(409, "cost_reservation_conflict")
        return previous
    midnight = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rows = (await tx.scalars(select(CostReservation).where(CostReservation.environment_id == cfg.environment,
                                                          CostReservation.created_at >= midnight))).all()
    total = sum(max(row.reserved_microusd, row.observed_microusd or 0) for row in rows)
    own = sum(max(row.reserved_microusd, row.observed_microusd or 0) for row in rows if row.business_id == business_id)
    if total + amount > cfg.global_daily_budget_microusd or own + amount > authority.daily_budget_microusd:
        raise HTTPException(429, "cost_budget_exhausted")
    row = CostReservation(business_id=business_id, environment_id=cfg.environment,
                          action_key=action_key, reserved_microusd=amount)
    tx.add(row)
    await tx.flush()
    return row


async def allow_analysis(business_id, action_key):
    from . import policy
    from .db import db
    cfg = settings()
    async with db.transaction(business_id, cfg.environment) as tx:
        await policy.lock(tx, business_id, cfg.environment)
        authority, _ = await policy.read(tx)
        if authority.paused or not authority.enabled:
            return False
        try:
            await reserve(tx, business_id, authority, action_key, cfg.analysis_cost_ceiling_microusd)
            return True
        except HTTPException:
            return False


async def record_analysis(business_id, action_key, amount):
    from . import policy
    from .contracts import PolicyUpdate
    from .db import db

    cfg = settings()
    async with db.transaction(business_id, cfg.environment) as tx:
        await policy.lock(tx, business_id, cfg.environment, exclusive=True)
        await tx.execute(text("SELECT pg_advisory_xact_lock(724930)"))
        row = await tx.scalar(select(CostReservation).where(CostReservation.business_id == business_id,
            CostReservation.environment_id == cfg.environment, CostReservation.action_key == action_key).with_for_update())
        if not row:
            raise ValueError("model_reservation_missing")
        row.observed_microusd = max(row.observed_microusd or 0, amount)
        if amount > row.reserved_microusd:
            authority, revision = await policy.read(tx)
            await policy.update(tx, business_id, cfg.environment, PolicyUpdate(base_revision=revision,
                policy=authority.model_copy(update={"paused": True}), reason="Post-call model cost exceeded reservation"))
