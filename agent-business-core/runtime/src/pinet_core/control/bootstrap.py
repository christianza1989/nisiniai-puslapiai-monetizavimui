"""Explicit admin-only, atomic/idempotent bootstrap. Domain names never confer ownership."""
import re

from sqlalchemy import select, text

from ..models import Business, new_id
from .models import BusinessGrant, Membership, Organization, Portfolio, User
from .routes import password_hash, password_matches


async def bootstrap(tx, *, environment, username, password, organization_key, organization_name,
                    portfolio_name, entries, allow_new_businesses=False):
    if environment != "local" and not environment.startswith("test-"):
        raise ValueError("local_bootstrap_only")
    if (not re.fullmatch(r"[a-z0-9][a-z0-9_.-]{0,99}", username) or not 20 <= len(password) <= 256
            or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,99}", organization_key)
            or not organization_name or len(organization_name) > 200 or not portfolio_name
            or len(portfolio_name) > 200 or len(entries) > 100):
        raise ValueError("invalid_bootstrap")
    # Serialize all bootstrap writers in this database. No distributed file lock or UUID replacement.
    await tx.execute(text("SELECT pg_advisory_xact_lock(618234819)"))
    user = await tx.scalar(select(User).where(User.environment_id == environment, User.username == username))
    if user and (not user.enabled or not password_matches(password, user.password_hash)):
        raise ValueError("credential_conflict")
    if not user:
        user = User(id=new_id(), environment_id=environment, username=username, password_hash=password_hash(password),
                    identity_issuer="pinet-local", identity_subject=new_id(), enabled=True)
        tx.add(user)
        await tx.flush()
    organization = await tx.scalar(select(Organization).where(Organization.environment_id == environment,
                                                             Organization.key == organization_key))
    if not organization:
        organization = Organization(environment_id=environment, key=organization_key, display_name=organization_name)
        tx.add(organization)
        await tx.flush()
    elif organization.display_name != organization_name:
        raise ValueError("organization_conflict")
    portfolio = await tx.scalar(select(Portfolio).where(Portfolio.environment_id == environment,
                                                       Portfolio.organization_id == organization.id))
    if not portfolio:
        portfolio = Portfolio(environment_id=environment, organization_id=organization.id, display_name=portfolio_name)
        tx.add(portfolio)
        await tx.flush()
    elif portfolio.display_name != portfolio_name:
        raise ValueError("portfolio_conflict")
    membership = await tx.scalar(select(Membership).where(Membership.environment_id == environment,
                          Membership.organization_id == organization.id, Membership.user_id == user.id))
    if not membership:
        tx.add(Membership(environment_id=environment, user_id=user.id, organization_id=organization.id,
                          role="owner", enabled=True))
    elif not membership.enabled or membership.role != "owner":
        raise ValueError("membership_conflict")
    ids, seen = [], set()
    for entry in entries:
        site, host = entry["site_id"], entry["canonical_host"]
        if (site in seen or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,59}", site)
                or not re.fullmatch(r"[a-z0-9.-]{1,253}", host)
                or not entry["display_name"] or len(entry["display_name"]) > 200
                or not re.fullmatch(r"[a-f0-9]{40}", entry["evidence_revision"])):
            raise ValueError("invalid_registry_entry")
        seen.add(site)
        business = await tx.scalar(select(Business).where(Business.site_id == site))
        if not business:
            if not allow_new_businesses or entry.get("business_id"):
                raise ValueError("business_mapping_unverified")
            business = Business(site_id=site, canonical_host=host)
            tx.add(business)
            await tx.flush()
        elif business.canonical_host != host or (entry.get("business_id") and entry["business_id"] != business.id):
            raise ValueError("business_mapping_conflict")
        grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.environment_id == environment,
                                                            BusinessGrant.business_id == business.id))
        if grant:
            if (grant.organization_id != organization.id or grant.portfolio_id != portfolio.id
                    or not grant.enabled or grant.display_name != entry["display_name"]
                    or grant.evidence_revision != entry["evidence_revision"]):
                raise ValueError("business_grant_conflict")
        else:
            # Source evidence proves registration, not deployment/runtime/activity/business stage.
            tx.add(BusinessGrant(environment_id=environment, organization_id=organization.id,
                                portfolio_id=portfolio.id, business_id=business.id, display_name=entry["display_name"],
                                evidence_revision=entry["evidence_revision"], stage=None, connection_status="registered",
                                runtime_status="not_connected", last_verified_activity_at=None, enabled=True))
        ids.append(business.id)
    await tx.flush()
    return {"user_id": user.id, "organization_id": organization.id, "portfolio_id": portfolio.id,
            "business_ids": ids, "environment": environment}
