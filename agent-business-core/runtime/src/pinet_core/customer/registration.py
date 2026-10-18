"""Reviewed external-business registration, independent of legacy voice profiles.

Not mounted in HTTP. The existing Intake decision owns account/grant validation;
the caller must commit both the mapping and that decision in one transaction.
"""
import re
from uuid import UUID

from sqlalchemy import or_, select, text

from ..models import Business, new_id
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
    # Identity is global, unlike account grants. Lock both keys in stable order
    # so concurrent environments cannot create ambiguous site/host mappings.
    for key in sorted(("business-registration:site:" + site_id, "business-registration:host:" + canonical_host)):
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"), {"key": key})
    rows = list(await tx.scalars(select(Business).where(or_(Business.site_id == site_id,
        Business.canonical_host == canonical_host)).with_for_update()))
    if rows and (len(rows) != 1 or rows[0].site_id != site_id or rows[0].canonical_host != canonical_host):
        raise ValueError("Existing site/host mapping conflict")
    created = not rows
    if created:
        business = Business(id=new_id(), site_id=site_id, canonical_host=canonical_host)
        tx.add(business)
        await tx.flush()
    else:
        business = rows[0]
    # Same transaction: an invalid owner/evidence or existing grant rolls back
    # the new mapping as well. Never copy the ownership checks into this layer.
    result = await decide(tx, environment=environment, intake_id=intake_id, approve=True,
        note=note, evidence_reference=evidence_reference, business_id=business.id)
    return {**result, "site_id": site_id, "canonical_host": canonical_host,
        "business_registered": created, "runtime_activation": "not_performed"}
