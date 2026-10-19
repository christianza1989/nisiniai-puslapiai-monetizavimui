"""Through0012 reviewed-registration acceptance; only this fixture's synthetic rows."""
import asyncio
import os
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers as customer_fixture
from test_customer_public import intake, verified

from pinet_core.control.models import BusinessGrant, Organization, Portfolio
from pinet_core.customer.admin import decide
from pinet_core.customer.models import Account, Intake
from pinet_core.customer.registration import register_intake
from pinet_core.db import db
from pinet_core.models import Business, new_id

pytestmark = pytest.mark.skipif(os.environ.get("PINET_ACCOUNT_FOUNDATION_QA") != "retained-isolated",
    reason="Explicit dedicated retained synthetic PostgreSQL lane required")
customers = customer_fixture


@asynccontextmanager
async def scoped(p, runtime=False):
    async with AsyncSession(db.engine if runtime else p["admin"], expire_on_commit=False) as tx, tx.begin():
        await tx.execute(text("SELECT set_config('pinet.environment', :e, true), "
                              "set_config('pinet.control_user', :u, true)"),
                         {"e": p["environment"], "u": p["session"].user_id})
        yield tx


@pytest.fixture(name="attached")
async def registration_owner(customers):
    c = customers
    _, headers, me = await verified(c)
    site = "customer-qa-" + c["environment"] + "-registration"
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        business = Business(id=new_id(), site_id=site, canonical_host=uuid4().hex + ".example.test")
        tx.add(business)
        portfolio = await tx.get(Portfolio, me["portfolios"][0]["portfolio_id"])
    response = await c["client"].post("/customer/v1/business-intakes", headers=headers,
        json=intake(me, canonical_host=business.canonical_host))
    assert response.status_code == 202, response.text
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await decide(tx, environment=c["environment"], intake_id=response.json()["data"]["intake_id"],
                     approve=True, business_id=business.id, note="Synthetic fixture owner review.",
                     evidence_reference="private:test-fixture-owner-proof")
    p = {**c, "session": SimpleNamespace(user_id=me["user_id"]), "portfolio": portfolio,
         "business": business, "owned_sites": {site}}
    try:
        yield p
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Organization).where(Organization.environment_id == c["environment"]))
            await tx.execute(delete(Business).where(Business.site_id.in_(p["owned_sites"])))


async def pending(p, **changes):
    value = dict(id=new_id(), user_id=p["session"].user_id, organization_id=p["portfolio"].organization_id,
        portfolio_id=p["portfolio"].id, environment_id=p["environment"], kind="claim",
        canonical_host=uuid4().hex + ".example.test", display_name="Synthetic external registration",
        description="Synthetic owner-reviewed registration acceptance only.", idempotency_key=str(uuid4()),
        fingerprint="a"*64, status="awaiting_review")
    value.update(changes)
    async with scoped(p, runtime=False) as tx:
        tx.add(Intake(**value))
    site = "external-qa-" + uuid4().hex
    p["owned_sites"].add(site)
    return dict(environment=p["environment"], intake_id=value["id"], site_id=site,
        note="Synthetic registration review accepted.", evidence_reference="private:test-registration-proof"), value


async def operate(p, request, runtime=False):
    async with scoped(p, runtime=runtime) as tx:
        return await register_intake(tx, **request)


async def test_external_without_static_profile_uses_reviewed_owner_grant(attached):
    p = attached
    request, intake = await pending(p)
    result = await operate(p, request)
    assert result["status"] == "approved" and result["business_registered"]
    assert result["runtime_activation"] == "not_performed"
    async with scoped(p, runtime=False) as tx:
        business = await tx.get(Business, result["business_id"])
        grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.business_id == business.id,
            BusinessGrant.environment_id == p["environment"]))
        assert (business.site_id, business.canonical_host) == (request["site_id"], intake["canonical_host"])
        assert (grant.organization_id, grant.portfolio_id) == (intake["organization_id"], intake["portfolio_id"])
        assert grant.enabled and grant.runtime_status == "not_connected"
    with pytest.raises(ValueError, match="Pending external"):
        await operate(p, request)


@pytest.mark.parametrize("field", ["site_id", "canonical_host"])
async def test_global_mapping_conflict_never_reassigns(attached, field):
    p = attached
    changes = {"canonical_host": p["business"].canonical_host} if field == "canonical_host" else {}
    request, _ = await pending(p, **changes)
    if field == "site_id":
        request["site_id"] = p["business"].site_id
    with pytest.raises(ValueError, match="mapping conflict"):
        await operate(p, request)


async def test_exact_preexisting_mapping_keeps_uuid_and_uses_existing_decision(attached):
    p = attached
    request, intake = await pending(p)
    async with scoped(p, runtime=False) as tx:
        business = Business(id=new_id(), site_id=request["site_id"], canonical_host=intake["canonical_host"])
        tx.add(business)
    result = await operate(p, request)
    assert result["business_id"] == business.id and not result["business_registered"]


@pytest.mark.parametrize("reason", ["unverified", "bad_evidence", "wrong_environment", "not_claim"])
async def test_failed_review_rolls_back_new_mapping(attached, reason):
    p = attached
    request, _ = await pending(p, **({"kind": "create"} if reason == "not_claim" else {}))
    if reason == "unverified":
        async with scoped(p, runtime=False) as tx:
            await tx.execute(update(Account).where(Account.user_id == p["session"].user_id,
                Account.environment_id == p["environment"]).values(verified_at=None))
    if reason == "bad_evidence":
        request["evidence_reference"] = "short"
    if reason == "wrong_environment":
        request["environment"] = "test-other-" + uuid4().hex
    with pytest.raises(ValueError):
        await operate(p, request)
    async with scoped(p, runtime=False) as tx:
        assert not await tx.scalar(select(func.count()).select_from(Business).where(Business.site_id == request["site_id"]))


async def test_runtime_role_cannot_register_even_owned_pending_intake(attached):
    request, _ = await pending(attached)
    with pytest.raises(ValueError, match="administrative connection"):
        await operate(attached, request, runtime=True)


async def test_existing_grant_cannot_be_reassigned_by_new_intake(attached):
    p = attached
    request, _ = await pending(p, canonical_host=p["business"].canonical_host)
    request["site_id"] = p["business"].site_id
    with pytest.raises(ValueError, match="no automatic reassignment"):
        await operate(p, request)


async def test_concurrent_claims_share_one_mapping_and_only_one_grant(attached):
    p = attached
    first, intake = await pending(p)
    second, _ = await pending(p, canonical_host=intake["canonical_host"])
    second["site_id"] = first["site_id"]
    results = await asyncio.gather(operate(p, first), operate(p, second), return_exceptions=True)
    assert sum(isinstance(item, dict) for item in results) == 1
    errors = [item for item in results if isinstance(item, Exception)]
    assert len(errors) == 1 and "no automatic reassignment" in str(errors[0])
    async with scoped(p, runtime=False) as tx:
        assert await tx.scalar(select(func.count()).select_from(Business).where(Business.site_id == first["site_id"])) == 1
