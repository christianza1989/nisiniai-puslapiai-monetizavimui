"""Ordinary customer HTTP plus restricted-role persistence; dedicated isolated QA DB, provider0."""
import asyncio
import hashlib
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, logged, verified  # noqa: F401
from test_workspace_read_pg import count_domain, seed

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.models import Business, utcnow
from pinet_core.workspace_topics import service
from pinet_core.workspace_topics.models import Message, Receipt, Topic


@pytest.fixture
async def topics(customers, monkeypatch):  # noqa: F811
    monkeypatch.setattr(settings(), "workspace_topics_enabled", True)
    customers["topics_business_ids"] = []
    try:
        yield customers
    finally:
        # Exact random test namespace only; native provenance parents are retained until children are gone.
        async with AsyncSession(customers["admin"]) as tx, tx.begin():
            await tx.execute(delete(Topic).where(Topic.environment_id == customers["environment"]))
            if customers["topics_business_ids"]:
                await tx.execute(delete(BusinessGrant).where(BusinessGrant.environment_id == customers["environment"]))
                await tx.execute(delete(Business).where(Business.id.in_(customers["topics_business_ids"])))


def base(me):
    return "/customer/v2/portfolios/"+me["portfolios"][0]["portfolio_id"]+"/workspace-topics"


async def create(c, auth, me, *, key=None, title="Sintetinė privati tema"):
    body = {"idempotency_key": key or str(uuid4()), "title": title,
            "anchor": {"kind": "portfolio", "selection_id": me["portfolios"][0]["portfolio_id"]}}
    response = await c["client"].post(base(me), headers=auth, json=body)
    assert response.status_code == 200, response.text
    return response.json()["data"], body


async def append(c, auth, me, id, content="Sintetinė savininko žinutė.", key=None):
    body = {"idempotency_key": key or str(uuid4()), "content": content}
    response = await c["client"].post(base(me)+"/"+id+"/messages", headers=auth, json=body)
    assert response.status_code == 200, response.text
    return response.json()["data"], body


async def controls(c, auth, me, view, *, title=None, pinned=False, archived=False):
    body = dict(idempotency_key=str(uuid4()), expected_metadata_revision=view["metadata_revision"],
                title=title or view["title"], pinned=pinned, archived=archived)
    response = await c["client"].post(base(me)+"/"+view["topic_id"]+"/controls", headers=auth, json=body)
    assert response.status_code == 200, response.text
    return response.json()["data"], body


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return {model.__tablename__: await tx.scalar(select(func.count()).select_from(model).where(
            model.environment_id == c["environment"])) for model in (Topic, Receipt, Message)}


async def test_topic_text_is_persisted_without_dispatch_and_replays_after_renewal(topics, monkeypatch):
    c = topics
    identity, auth, me = await verified(c)
    result, body = await create(c, auth, me)
    view = result["current_topic"]
    assert view["metadata_revision"] == 1 and view["message_sequence"] == 0
    assert view["execution"] == "not_connected" and view["can_dispatch"] is False
    repeated = await c["client"].post(base(me), headers=auth, json=body)
    assert repeated.json()["data"]["receipt"] == result["receipt"]
    accepted, message = await append(c, auth, me, view["topic_id"])
    assert accepted["message"]["author_user_id"] == me["user_id"]
    assert accepted["message"]["dispatch_state"] == "stored_without_dispatch"
    assert accepted["message"]["sequence"] == 1
    await c["client"].post("/operator/v2/auth/logout", headers=auth)
    renewed = await logged(c, identity)
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    replay = await c["client"].post(base(me)+"/"+view["topic_id"]+"/messages", headers=renewed, json=message)
    assert replay.status_code == 200, replay.text
    assert replay.json()["source_revision"] == "b"*40
    assert replay.json()["data"] == accepted
    assert await counts(c) == {Topic.__tablename__: 1, Receipt.__tablename__: 2, Message.__tablename__: 1}


async def test_one_request_namespace_archive_replay_and_metadata_cas(topics):
    c = topics
    _, auth, me = await verified(c)
    created, create_body = await create(c, auth, me)
    view = created["current_topic"]
    path = base(me)+"/"+view["topic_id"]
    conflict = await c["client"].post(path+"/messages", headers=auth,
        json={"idempotency_key": create_body["idempotency_key"], "content": "Kita operacija."})
    assert conflict.status_code == 409 and conflict.json()["code"] == "idempotency_conflict"
    saved, body = await append(c, auth, me, view["topic_id"])
    archived, archive_body = await controls(c, auth, me, view, archived=True)
    assert archived["current_topic"]["metadata_revision"] == 2
    assert archived["current_topic"]["can_store_message"] is False
    before = await counts(c)
    denied = await c["client"].post(path+"/messages", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Nauja žinutė uždarytoje temoje."})
    assert denied.status_code == 409 and denied.json()["code"] == "topic_archived"
    replay = await c["client"].post(path+"/messages", headers=auth, json=body)
    assert replay.status_code == 200 and replay.json()["data"] == saved
    stale = await c["client"].post(path+"/controls", headers=auth,
        json=archive_body | {"idempotency_key": str(uuid4()), "title": "Pasenusi redakcija"})
    assert stale.status_code == 409 and stale.json()["code"] == "topic_revision_conflict"
    assert await counts(c) == before
    restored, _ = await controls(c, auth, me, archived["current_topic"], title="Atkurta tema", pinned=True)
    assert restored["current_topic"]["metadata_revision"] == 3
    assert restored["current_topic"]["message_sequence"] == 1


async def test_private_scope_foreign_reads_and_forged_author_are_refused(topics):
    c = topics
    _, a, me = await verified(c)
    _, b, other = await verified(c)
    created, _ = await create(c, a, me)
    id = created["current_topic"]["topic_id"]
    for auth, path in ((b, base(me)+"/"+id), (a, base(other)+"/"+id), (b, base(other)+"/"+id)):
        r = await c["client"].get(path, headers=auth)
        assert r.status_code == 404
    rejected = await c["client"].post(base(me)+"/"+id+"/messages", headers=a,
        json={"idempotency_key": str(uuid4()), "content": "Suklastotas autorius.", "author_type": "coordinator"})
    assert rejected.status_code == 400
    async with scope(user=other["user_id"]) as tx:
        assert not list(await tx.scalars(select(Topic).where(Topic.id == id)))
        assert not list(await tx.scalars(select(Receipt).where(Receipt.topic_id == id)))


async def test_metadata_list_and_history_have_independent_cutoffs(topics):
    c = topics
    _, auth, me = await verified(c)
    older, _ = await create(c, auth, me, title="Pirmoji sintetinė tema")
    newer, _ = await create(c, auth, me, title="Antroji sintetinė tema")
    view = newer["current_topic"]
    for index in range(3):
        await append(c, auth, me, view["topic_id"], f"Sintetinė žinutė {index+1}.")
    first = (await c["client"].get(base(me)+"?limit=1", headers=auth)).json()["data"]
    assert first["items"][0]["topic_id"] == view["topic_id"]
    response = await c["client"].get(base(me)+"/"+view["topic_id"]+"/messages?limit=1", headers=auth)
    assert response.status_code == 200, response.text
    history = response.json()["data"]
    assert history["items"][0]["sequence"] == 3 and history["cutoff_sequence"] == 3
    await append(c, auth, me, view["topic_id"], "Ketvirta žinutė nekeičia metaduomenų rikiavimo.")
    second = await c["client"].get(base(me), headers=auth, params={"limit": 1, "cursor": first["next_cursor"]})
    assert second.status_code == 200 and second.json()["data"]["items"][0]["topic_id"] == older["current_topic"]["topic_id"]
    await controls(c, auth, me, view, title="Pervadinta tema", pinned=True)
    changed = await c["client"].get(base(me), headers=auth, params={"limit": 1, "cursor": first["next_cursor"]})
    assert changed.status_code == 409
    previous = await c["client"].get(base(me)+"/"+view["topic_id"]+"/messages", headers=auth,
        params={"limit": 1, "cursor": history["next_cursor"]})
    assert previous.status_code == 200 and previous.json()["data"]["cutoff_sequence"] == 3
    assert previous.json()["data"]["items"][0]["sequence"] == 2


async def test_late_safe_route_error_rolls_back_parent_receipt_and_message(topics, monkeypatch):
    c = topics
    _, auth, me = await verified(c)
    created, _ = await create(c, auth, me)
    view = created["current_topic"]
    before = await counts(c)
    async def fail(*args, **kwargs):
        raise ControlError(503, "source_unavailable")
    monkeypatch.setattr(service, "response", fail)
    r = await c["client"].post(base(me), headers=auth, json={"idempotency_key": str(uuid4()),
        "title": "Atšauktinas įrašas", "anchor": view["anchor"]})
    assert r.status_code == 503
    r = await c["client"].post(base(me)+"/"+view["topic_id"]+"/messages", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Atšauktina žinutė."})
    assert r.status_code == 503 and await counts(c) == before
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Topic, view["topic_id"])).message_sequence == 0


async def test_runtime_role_cannot_mutate_history_or_advance_clock_without_message(topics):
    c = topics
    _, auth, me = await verified(c)
    created, _ = await create(c, auth, me)
    id = created["current_topic"]["topic_id"]
    accepted, _ = await append(c, auth, me, id)
    with pytest.raises(ProgrammingError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(Message).where(Message.id == accepted["message"]["message_id"]).values(content="Changed"))
    with pytest.raises(ProgrammingError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(delete(Topic).where(Topic.id == id))
    with pytest.raises(Exception, match="exact committed message"):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(Topic).where(Topic.id == id).values(message_sequence=2, updated_at=utcnow()))
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Topic, id)).message_sequence == 1


async def test_reciprocal_fk_refuses_independent_or_swapped_message_receipt_pair(topics):
    c = topics
    _, auth, me = await verified(c)
    created, _ = await create(c, auth, me)
    id = created["current_topic"]["topic_id"]
    pid = me["portfolios"][0]
    owned = dict(user_id=me["user_id"], organization_id=pid["organization_id"], portfolio_id=pid["portfolio_id"],
                 environment_id=c["environment"])
    receipt_id, wrong_message_id, actual_message_id = (str(uuid4()) for _ in range(3))
    with pytest.raises(IntegrityError):
        async with scope(user=me["user_id"]) as tx:
            session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
            await tx.execute(update(Topic).where(Topic.id == id).values(message_sequence=1, updated_at=utcnow()))
            tx.add(Receipt(id=receipt_id, **owned, topic_id=id, idempotency_key=str(uuid4()), fingerprint="a"*64,
                operation="append_message", authorizing_session_id=session.id, accepted_source_revision="a"*40,
                accepted_metadata=None, message_id=wrong_message_id, created_at=utcnow()))
            await tx.flush()
            content = "Sintetinis FK bandymas."
            tx.add(Message(id=actual_message_id, **owned, topic_id=id, receipt_id=receipt_id, sequence=1,
                author_user_id=me["user_id"], content=content, content_sha256=hashlib.sha256(content.encode()).hexdigest(),
                stored_source_revision="a"*40, created_at=utcnow()))
            await tx.flush()
    async with AsyncSession(c["admin"]) as tx:
        assert (await tx.get(Topic, id)).message_sequence == 0


async def native_business(c, me):
    """Only enabled relationship metadata; deliberately no foundation/intake/runtime admission."""
    portfolio = me["portfolios"][0]
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        business = Business(id=str(uuid4()), site_id="customer-qa-"+c["environment"]+uuid4().hex,
                            canonical_host=uuid4().hex+".example.test")
        tx.add(business)
        await tx.flush()
        grant = BusinessGrant(id=str(uuid4()), business_id=business.id, environment_id=c["environment"],
            portfolio_id=portfolio["portfolio_id"], organization_id=portfolio["organization_id"],
            display_name="Sintetinis metaduomenų ryšys", evidence_revision="a"*40, enabled=True)
        tx.add(grant)
        c["topics_business_ids"].append(business.id)
        return business.id, grant.id


async def test_native_anchors_do_not_rebind_private_children_or_dispatch_legacy_jobs(topics):
    c = topics
    _, auth, me = await verified(c)
    _, foreign_auth, foreign = await verified(c)
    records = await seed(c, auth, me, shared_uuid=True)
    other = await seed(c, foreign_auth, foreign)
    bid, _ = await native_business(c, me)
    before = await count_domain(c)
    ids = []
    for kind, selection in (("discovery", records["discovery"]), ("creation", records["creation"]), ("business", bid)):
        response = await c["client"].post(base(me), headers=auth, json={"idempotency_key": str(uuid4()),
            "anchor": {"kind": kind, "selection_id": selection}, "title": "Sintetinė susieta tema"})
        assert response.status_code == 200, response.text
        view = response.json()["data"]["current_topic"]
        assert view["anchor"] == {"kind": kind, "selection_id": selection}
        ids.append(view["topic_id"])
        await append(c, auth, me, view["topic_id"])
    assert len(set(ids)) == 3 and await count_domain(c) == before
    for kind, selection in (("discovery", other["discovery"]), ("creation", other["creation"]), ("business", bid)):
        denied = await c["client"].post(base(foreign if kind == "business" else me),
            headers=foreign_auth if kind == "business" else auth, json={"idempotency_key": str(uuid4()),
                "anchor": {"kind": kind, "selection_id": selection}, "title": "Svetima tema"})
        assert denied.status_code == 404
    # A shared legacy UUID retains distinct typed anchors; the stored topic cannot change anchor.
    async with scope(user=me["user_id"]) as tx:
        with pytest.raises(Exception, match="Immutable workspace topic anchor"):
            async with tx.begin_nested():
                await tx.execute(update(Topic).where(Topic.id == ids[0]).values(anchor_kind="creation",
                    discovery_id=None, creation_id=records["creation"], metadata_revision=2, updated_at=utcnow()))


async def test_revoked_grant_hides_topic_but_retains_common_idempotency_namespace(topics):
    c = topics
    _, auth, me = await verified(c)
    bid, gid = await native_business(c, me)
    body = {"idempotency_key": str(uuid4()), "anchor": {"kind": "business", "selection_id": bid},
            "title": "Privati verslo tema"}
    accepted = await c["client"].post(base(me), headers=auth, json=body)
    assert accepted.status_code == 200, accepted.text
    id = accepted.json()["data"]["current_topic"]["topic_id"]
    saved, _ = await append(c, auth, me, id)
    before = await counts(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == gid).values(enabled=False))
    try:
        assert (await c["client"].get(base(me)+"/"+id, headers=auth)).status_code == 404
        assert (await c["client"].get(base(me)+"/"+id+"/messages", headers=auth)).status_code == 404
        conflict = await c["client"].post(base(me), headers=auth, json=body | {
            "anchor": {"kind": "portfolio", "selection_id": me["portfolios"][0]["portfolio_id"]}})
        assert conflict.status_code == 409 and conflict.json()["code"] == "idempotency_conflict", conflict.text
        assert await counts(c) == before
        async with scope(user=me["user_id"]) as tx:
            assert not list(await tx.scalars(select(Message).where(Message.id == saved["message"]["message_id"])))
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == gid).values(enabled=True))
    replay = await c["client"].post(base(me), headers=auth, json=body)
    assert replay.json()["data"]["receipt"] == accepted.json()["data"]["receipt"]
    with pytest.raises(IntegrityError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(BusinessGrant).where(BusinessGrant.id == gid))


async def test_disabled_user_during_read_is_not_a_successful_empty_list(topics, monkeypatch):
    c = topics
    _, auth, me = await verified(c)
    await create(c, auth, me)
    original = service.topic_rows
    async def revoke_after_read(*args, **kwargs):
        rows = await original(*args, **kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=False))
        return rows
    monkeypatch.setattr(service, "topic_rows", revoke_after_read)
    try:
        response = await c["client"].get(base(me), headers=auth)
        assert response.status_code == 401 and response.json()["code"] == "unauthenticated"
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=True))


async def test_deferred_current_owner_guard_rolls_back_after_final_projection(topics, monkeypatch):
    c = topics
    _, auth, me = await verified(c)
    created, _ = await create(c, auth, me)
    id = created["current_topic"]["topic_id"]
    before = await counts(c)
    original = service.response
    async def revoke_after_final_projection(*args, **kwargs):
        result = await original(*args, **kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
                Membership.environment_id == c["environment"]).values(enabled=False))
        return result
    monkeypatch.setattr(service, "response", revoke_after_final_projection)
    try:
        response = await c["client"].post(base(me)+"/"+id+"/messages", headers=auth,
            json={"idempotency_key": str(uuid4()), "content": "Atšauktinos prieigos žinutė."})
        assert response.status_code == 503 and response.json()["code"] == "source_unavailable", response.text
        assert await counts(c) == before
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
                Membership.environment_id == c["environment"]).values(enabled=True))


async def test_simultaneous_appends_and_metadata_cas_remain_atomic(topics):
    c = topics
    _, auth, me = await verified(c)
    created, _ = await create(c, auth, me)
    view = created["current_topic"]
    path = base(me)+"/"+view["topic_id"]
    bodies = [{"idempotency_key": str(uuid4()), "content": f"Lygiagreti žinutė {i}."} for i in (1, 2)]
    responses = await asyncio.gather(*(c["client"].post(path+"/messages", headers=auth, json=b) for b in bodies))
    assert [r.status_code for r in responses] == [200, 200]
    assert {r.json()["data"]["message"]["sequence"] for r in responses} == {1, 2}
    body = dict(expected_metadata_revision=1, title="Lygiagretus vardas", pinned=True, archived=False)
    responses = await asyncio.gather(*(c["client"].post(path+"/controls", headers=auth,
        json=body | {"idempotency_key": str(uuid4())}) for _ in range(2)))
    assert sorted(r.status_code for r in responses) == [200, 409]
    assert await counts(c) == {Topic.__tablename__: 1, Receipt.__tablename__: 4, Message.__tablename__: 2}


async def test_feature_off_and_malformed_queries_never_accept_storage(topics, monkeypatch):
    c = topics
    _, auth, me = await verified(c)
    before = await counts(c)
    for query in ("?kind=business", "?selection_id=invalid", "?limit=0", "?limit=51", "?state=all",
                  "?q=a&q=b", "?dispatch=true"):
        response = await c["client"].get(base(me)+query, headers=auth)
        assert response.status_code == 400
    monkeypatch.setattr(settings(), "workspace_topics_enabled", False)
    response = await c["client"].post(base(me), headers=auth, json={"idempotency_key": str(uuid4()),
        "anchor": {"kind": "portfolio", "selection_id": me["portfolios"][0]["portfolio_id"]}, "title": "Neįjungta tema"})
    assert response.status_code == 403 and response.json()["code"] == "workspace_topics_unavailable"
    assert await counts(c) == before
