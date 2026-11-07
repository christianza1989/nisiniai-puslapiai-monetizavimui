"""Human-reviewed local intake decisions. No customer or domain-based self-grant API."""
from sqlalchemy import select

from ..control.models import BusinessGrant, Membership, User
from ..models import Business, utcnow
from ..public_projects.admin import administrative
from .models import Account, Intake


async def decide(tx, *, environment, intake_id, approve, note, evidence_reference, business_id=None):
    await administrative(tx, environment)
    if not 10 <= len(note) <= 1000 or not 10 <= len(evidence_reference) <= 2000:
        raise ValueError("Reviewed decision note and private proof reference required")
    intake = await tx.scalar(select(Intake).where(Intake.id == intake_id, Intake.environment_id == environment).with_for_update())
    if not intake or intake.status not in {'awaiting_evidence', 'awaiting_review'}:
        raise ValueError("Pending intake required")
    user = await tx.scalar(select(User).where(User.id == intake.user_id, User.environment_id == environment).with_for_update())
    account = await tx.scalar(select(Account).where(Account.user_id == intake.user_id, Account.environment_id == environment))
    member = await tx.scalar(select(Membership).where(Membership.user_id == intake.user_id,
                            Membership.organization_id == intake.organization_id, Membership.environment_id == environment,
                            Membership.enabled, Membership.role == 'owner').with_for_update(read=True))
    if not user or not user.enabled or not account or not account.verified_at or not member:
        raise ValueError("Verified current customer ownership required")
    if approve:
        business = await tx.get(Business, business_id) if business_id else None
        if not business or intake.canonical_host and business.canonical_host != intake.canonical_host:
            raise ValueError("Explicit matching registered business UUID required")
        if await tx.scalar(select(BusinessGrant.id).where(BusinessGrant.business_id == business.id,
                                                        BusinessGrant.environment_id == environment)):
            raise ValueError("Existing grant must be separately reviewed; no automatic reassignment")
        tx.add(BusinessGrant(environment_id=environment, business_id=business.id, portfolio_id=intake.portfolio_id,
            organization_id=intake.organization_id, display_name=intake.display_name,
            stage=None, connection_status='registered', runtime_status='not_connected',
            evidence_revision=evidence_reference, enabled=True))
        intake.business_id, intake.status = business.id, 'approved'
    else:
        if business_id:
            raise ValueError("A rejected request cannot contain a business grant")
        intake.status = 'rejected'
    intake.decision_note, intake.private_review_evidence, intake.updated_at = note, evidence_reference, utcnow()
    await tx.flush()
    return {"intake_id": intake.id, "status": intake.status, "business_id": intake.business_id}
