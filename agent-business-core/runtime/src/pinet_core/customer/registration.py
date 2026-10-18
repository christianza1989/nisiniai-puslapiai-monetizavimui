"""Reviewed external-business registration, independent of legacy voice profiles.

Not mounted in HTTP. The existing Intake decision owns account/grant validation;
the caller must commit both the mapping and that decision in one transaction.
"""
import re
from uuid import UUID

from sqlalchemy import select

from ..control.bootstrap import registered_business, registration_lock
from ..models import Business
from ..public_projects.admin import administrative
from .admin import decide
from .models import Intake
from .service import host


async def register_intake(tx, *, environment, intake_id, site_id, note, evidence_reference):
    """Register a reviewed pending claim and approve it atomically.

    An approved/consumed intake is deliberately not retried: inspect its stored
    decision. This operation never reassigns a grant, enables a channel, creates
    a legacy Creation/Profile, or treats control of a hostname as ownership.
    """
    await administrative(tx, environment)
    intake_id = str(UUID(str(intake_id)))
    if not isinstance(site_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", site_id) or len(site_id) > 80:
        raise ValueError("Explicit stable site ID required")
    intake = await tx.scalar(select(Intake).where(Intake.id == intake_id,
        Intake.environment_id == environment).with_for_update())
    if (not intake or intake.kind != "claim" or intake.status not in {"awaiting_evidence", "awaiting_review"}
            or not intake.canonical_host):
        raise ValueError("Pending external business claim with a canonical host required")
    canonical_host = host(intake.canonical_host)
    if canonical_host != intake.canonical_host:
        raise ValueError("Exact normalized intake hostname required")
    # Share the maintained bootstrap writer's global identity barrier and mapper.
    # The customer path adds reviewed Intake admission, not a second registry.
    await registration_lock(tx)
    existing = await tx.scalar(select(Business).where(Business.canonical_host == canonical_host))
    by_site = await tx.scalar(select(Business).where(Business.site_id == site_id))
    if ((existing is not None and existing.site_id != site_id)
            or (by_site is not None and by_site.canonical_host != canonical_host)):
        raise ValueError("Existing site/host mapping conflict")
    created = by_site is None
    business = await registered_business(tx, site_id=site_id, canonical_host=canonical_host, allow_new=True)
    # Same transaction: an invalid owner/evidence or existing grant rolls back
    # the new mapping as well. Never copy the ownership checks into this layer.
    result = await decide(tx, environment=environment, intake_id=intake_id, approve=True,
        note=note, evidence_reference=evidence_reference, business_id=business.id)
    return {**result, "site_id": site_id, "canonical_host": canonical_host,
        "business_registered": created, "runtime_activation": "not_performed"}
