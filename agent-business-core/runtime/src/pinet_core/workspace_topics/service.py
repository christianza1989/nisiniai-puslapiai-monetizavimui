"""Private topic/text persistence. No worker, provider, quota, agent or dispatch dependency."""
import base64
import hashlib
import json
import re
from contextlib import asynccontextmanager

from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from ..business_discovery.models import Discovery
from ..config import settings
from ..control.models import BusinessGrant, Membership, Portfolio, User
from ..control.routes import ControlError, identifier, open_cursor, seal_cursor
from ..creation.models import Creation
from ..creation.service import binding, current_actor, digest
from ..customer.models import Account
from ..models import new_id, utcnow
from .models import Message, Receipt, Topic
from .wire import (
    MAX_CLOCK,
    Anchor,
    History,
    MessageResult,
    MessageView,
    MetadataResult,
    MetadataSnapshot,
    ReceiptView,
    Topics,
    TopicView,
)

PAIRS = "fk_workspace_receipt_message_pair,fk_workspace_message_receipt_pair"


def guard():
    cfg = settings()
    if (not cfg.control_enabled or not cfg.customer_enabled or not cfg.workspace_topics_enabled
            or cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise ControlError(403, "workspace_topics_unavailable")
    if not re.fullmatch("[a-f0-9]{40}", cfg.control_source_revision) or len(cfg.control_cursor_secret) < 24:
        raise ControlError(503, "source_unavailable")


async def schema_ready(tx):
    ready = await tx.scalar(text("""SELECT
      (SELECT count(*)=3 FROM pg_class WHERE relnamespace='public'::regnamespace
        AND relname IN ('control_workspace_topics','control_workspace_topic_messages','control_workspace_topic_receipts')
        AND relrowsecurity AND relforcerowsecurity)
      AND (SELECT count(*)=3 FROM pg_constraint WHERE conname IN
        ('uq_workspace_request_key','fk_workspace_message_receipt_pair','fk_workspace_receipt_message_pair')
        AND convalidated AND (conname='uq_workspace_request_key' OR condeferrable AND condeferred))
      AND (SELECT count(*)=5 FROM pg_trigger WHERE tgname IN ('workspace_topic_update','workspace_record_immutable',
        'workspace_topic_clock','workspace_message_clock')
        AND tgrelid IN (to_regclass('control_workspace_topics'),to_regclass('control_workspace_topic_messages'),
                       to_regclass('control_workspace_topic_receipts')) AND tgenabled IN ('O','A') AND NOT tgisinternal)
      AND NOT has_table_privilege(current_user,'control_workspace_topics','DELETE')
      AND NOT has_table_privilege(current_user,'control_workspace_topic_messages','UPDATE,DELETE')
      AND NOT has_table_privilege(current_user,'control_workspace_topic_receipts','UPDATE,DELETE')"""))
    if not ready:
        raise ControlError(503, "workspace_topics_schema_unavailable")


def constraints(model, owned):
    return [getattr(model, key) == value for key, value in owned.items()]


def anchor_of(topic):
    id = (topic.portfolio_id if topic.anchor_kind == "portfolio" else
          getattr(topic, "discovery_id" if topic.anchor_kind == "discovery" else
                  "creation_id" if topic.anchor_kind == "creation" else "business_id"))
    return Anchor(kind=topic.anchor_kind, selection_id=id)


async def actor(tx, session, portfolio_id, *, lock=False):
    guard()
    portfolio_id = identifier(portfolio_id)
    user_query = select(User).where(User.id == session.user_id, User.environment_id == settings().environment, User.enabled)
    if lock:
        user_query = user_query.with_for_update()
    if not await tx.scalar(user_query.execution_options(populate_existing=True)):
        raise ControlError(401, "unauthenticated")
    await current_actor(tx, session, lock=lock)
    portfolio = await tx.scalar(select(Portfolio).where(Portfolio.id == portfolio_id,
        Portfolio.environment_id == settings().environment).execution_options(populate_existing=True))
    if not portfolio:
        raise ControlError(404, "not_found")
    membership = await tx.scalar(select(Membership.id).where(Membership.user_id == session.user_id,
        Membership.organization_id == portfolio.organization_id, Membership.environment_id == settings().environment,
        Membership.enabled, Membership.role == "owner"))
    if not membership:
        raise ControlError(404, "not_found")
    owned = {"user_id": session.user_id, "organization_id": portfolio.organization_id,
             "portfolio_id": portfolio_id, "environment_id": settings().environment}
    if lock:
        # Runtime has no UPDATE privilege on membership/portfolio/grant: never widen it for row locks.
        # User/session/account locks plus current SQL/RLS and deferred topic checks fence acceptance.
        account = await tx.scalar(select(Account).where(Account.user_id == session.user_id,
            Account.environment_id == settings().environment, Account.verified_at.is_not(None)).with_for_update(read=True))
        if not account:
            raise ControlError(404, "not_found")
    await schema_ready(tx)
    return owned


async def anchor_authority(tx, owned, anchor, *, grant_id=None, lock=False):
    kind, id = anchor.kind, str(anchor.selection_id)
    values = {"anchor_kind": kind, "discovery_id": None, "creation_id": None, "business_id": None, "grant_id": None}
    if kind == "portfolio":
        if id != owned["portfolio_id"]:
            raise ControlError(404, "not_found")
        return values
    if kind in {"discovery", "creation"}:
        model = Discovery if kind == "discovery" else Creation
        stmt = select(model).where(model.id == id, *constraints(model, owned)).execution_options(populate_existing=True)
        if lock:
            stmt = stmt.with_for_update(read=True)
        row = await tx.scalar(stmt)
        if not row:
            raise ControlError(404, "not_found")
        values[kind + "_id"] = id
    else:
        stmt = select(BusinessGrant).where(BusinessGrant.business_id == id, BusinessGrant.enabled,
            BusinessGrant.portfolio_id == owned["portfolio_id"], BusinessGrant.organization_id == owned["organization_id"],
            BusinessGrant.environment_id == owned["environment_id"]).execution_options(populate_existing=True)
        if grant_id is not None:
            stmt = stmt.where(BusinessGrant.id == grant_id)
        grant = await tx.scalar(stmt)
        if not grant:
            raise ControlError(404, "not_found")
        values.update(business_id=id, grant_id=grant.id)
    return values


async def owned_topic(tx, session, portfolio_id, topic_id, *, lock=False):
    owned = await actor(tx, session, portfolio_id, lock=lock)
    stmt = select(Topic).where(Topic.id == identifier(topic_id), *constraints(Topic, owned))
    row = await tx.scalar(stmt.execution_options(populate_existing=True))
    if not row:
        raise ControlError(404, "not_found")
    await anchor_authority(tx, owned, anchor_of(row), grant_id=row.grant_id, lock=lock)
    if lock:
        row = await tx.scalar(stmt.with_for_update().execution_options(populate_existing=True))
        if not row:
            raise ControlError(404, "not_found")
    return row


def project(model, **value):
    try:
        return model(**value).model_dump(mode="json")
    except (ValueError, ValidationError):
        raise ControlError(503, "source_unavailable") from None


def topic_view(topic):
    return project(TopicView, topic_id=topic.id, portfolio_id=topic.portfolio_id, anchor=anchor_of(topic),
        title=topic.title, pinned=topic.pinned, archived_at=topic.archived_at, metadata_revision=topic.metadata_revision,
        message_sequence=topic.message_sequence, created_at=topic.created_at, updated_at=topic.updated_at,
        execution="not_connected", can_store_message=topic.archived_at is None and topic.message_sequence < MAX_CLOCK, can_dispatch=False)


def metadata_snapshot(topic):
    return project(MetadataSnapshot, **{key: value for key, value in topic_view(topic).items()
        if key in MetadataSnapshot.model_fields})


def message_view(message):
    return project(MessageView, message_id=message.id, topic_id=message.topic_id, sequence=message.sequence,
        author_type="user", author_user_id=message.author_user_id, content=message.content,
        content_sha256=message.content_sha256, stored_source_revision=message.stored_source_revision,
        created_at=message.created_at, dispatch_state="stored_without_dispatch")


async def receipt_view(tx, receipt):
    message = None
    if receipt.message_id:
        message = await tx.scalar(select(Message).where(Message.id == receipt.message_id, Message.receipt_id == receipt.id,
            Message.topic_id == receipt.topic_id, *constraints(Message, binding(receipt))))
        if not message:
            raise ControlError(503, "source_unavailable")
    data = project(ReceiptView, receipt_id=receipt.id, topic_id=receipt.topic_id, idempotency_key=receipt.idempotency_key,
        operation=receipt.operation, accepted_metadata=receipt.accepted_metadata, message_id=receipt.message_id,
        message_sequence=message.sequence if message else None, content_sha256=message.content_sha256 if message else None,
        accepted_source_revision=receipt.accepted_source_revision, accepted_at=receipt.created_at)
    return data, message


async def response(tx, session, portfolio_id, receipt):
    topic = await owned_topic(tx, session, portfolio_id, receipt.topic_id)
    data, message = await receipt_view(tx, receipt)
    if message:
        result = project(MessageResult, receipt=data, message=message_view(message))
    else:
        result = project(MetadataResult, receipt=data, current_topic=topic_view(topic))
    await owned_topic(tx, session, portfolio_id, topic.id)
    return result


def request_fingerprint(operation, portfolio_id, value, topic_id=None):
    # Current token/session/source/internal clocks are evidence, never caller material.
    return digest({"operation": operation, "portfolio_id": str(portfolio_id), "topic_id": topic_id,
                   "input": value.model_dump(mode="json")})


async def replay(tx, session, portfolio_id, key, fingerprint, topic_id=None):
    row = await tx.scalar(select(Receipt).where(Receipt.user_id == session.user_id,
        Receipt.environment_id == settings().environment, Receipt.idempotency_key == str(key)))
    if not row:
        return None
    if row.fingerprint != fingerprint or row.portfolio_id != portfolio_id or topic_id and row.topic_id != topic_id:
        raise ControlError(409, "idempotency_conflict")
    return await response(tx, session, portfolio_id, row)


@asynccontextmanager
async def acceptance(tx):
    try:
        async with tx.begin_nested():
            yield
    except IntegrityError as error:
        # A currently hidden old receipt still occupies the user's request namespace.
        # Reconcile no private row; report the named permanent conflict after savepoint rollback.
        queue, seen = [error], set()
        while queue:
            item = queue.pop()
            if id(item) in seen:
                continue
            seen.add(id(item))
            if (getattr(item, "sqlstate", None) == "23505"
                    and getattr(item, "constraint_name", None) == "uq_workspace_request_key"):
                raise ControlError(409, "idempotency_conflict") from None
            queue.extend(x for x in (getattr(item, "orig", None), item.__cause__, item.__context__) if x is not None)
        raise


async def create(tx, session, portfolio_id, value):
    # SafeRoute catches errors into responses; savepoint makes parent/receipt acceptance atomic.
    async with acceptance(tx):
        owned = await actor(tx, session, portfolio_id, lock=True)
        anchor = await anchor_authority(tx, owned, value.anchor, lock=True)
        fingerprint = request_fingerprint("create", owned["portfolio_id"], value)
        previous = await replay(tx, session, owned["portfolio_id"], value.idempotency_key, fingerprint)
        if previous is not None:
            return previous
        now = utcnow()
        topic = Topic(id=new_id(), **owned, **anchor, title=value.title, pinned=False, archived_at=None,
            metadata_revision=1, message_sequence=0, created_source_revision=settings().control_source_revision,
            created_at=now, updated_at=now)
        tx.add(topic)
        await tx.flush()
        receipt = Receipt(id=new_id(), **owned, topic_id=topic.id, idempotency_key=str(value.idempotency_key),
            fingerprint=fingerprint, operation="create", authorizing_session_id=session.id,
            accepted_source_revision=settings().control_source_revision, accepted_metadata=metadata_snapshot(topic),
            message_id=None, created_at=now)
        tx.add(receipt)
        await tx.flush()
        return await response(tx, session, owned["portfolio_id"], receipt)


async def controls(tx, session, portfolio_id, topic_id, value):
    async with acceptance(tx):
        topic = await owned_topic(tx, session, portfolio_id, topic_id, lock=True)
        fingerprint = request_fingerprint("set_metadata", topic.portfolio_id, value, topic.id)
        previous = await replay(tx, session, topic.portfolio_id, value.idempotency_key, fingerprint, topic.id)
        if previous is not None:
            return previous
        if topic.metadata_revision != value.expected_metadata_revision:
            raise ControlError(409, "topic_revision_conflict")
        if topic.metadata_revision >= MAX_CLOCK:
            raise ControlError(409, "topic_capacity_reached")
        now = utcnow()
        topic.title, topic.pinned = value.title, value.pinned
        topic.archived_at = (topic.archived_at or now) if value.archived else None
        topic.metadata_revision += 1
        topic.updated_at = now
        await tx.flush()
        receipt = Receipt(id=new_id(), **binding(topic), topic_id=topic.id, idempotency_key=str(value.idempotency_key),
            fingerprint=fingerprint, operation="set_metadata", authorizing_session_id=session.id,
            accepted_source_revision=settings().control_source_revision, accepted_metadata=metadata_snapshot(topic),
            message_id=None, created_at=now)
        tx.add(receipt)
        await tx.flush()
        return await response(tx, session, topic.portfolio_id, receipt)


async def append(tx, session, portfolio_id, topic_id, value):
    async with acceptance(tx):
        topic = await owned_topic(tx, session, portfolio_id, topic_id, lock=True)
        fingerprint = request_fingerprint("append_message", topic.portfolio_id, value, topic.id)
        previous = await replay(tx, session, topic.portfolio_id, value.idempotency_key, fingerprint, topic.id)
        if previous is not None:
            return previous
        if topic.archived_at:
            raise ControlError(409, "topic_archived")
        if topic.message_sequence >= MAX_CLOCK:
            raise ControlError(409, "topic_capacity_reached")
        now, message_id, receipt_id = utcnow(), new_id(), new_id()
        topic.message_sequence += 1
        topic.updated_at = now
        receipt = Receipt(id=receipt_id, **binding(topic), topic_id=topic.id,
            idempotency_key=str(value.idempotency_key), fingerprint=fingerprint, operation="append_message",
            authorizing_session_id=session.id, accepted_source_revision=settings().control_source_revision,
            accepted_metadata=None, message_id=message_id, created_at=now)
        message = Message(id=message_id, **binding(topic), topic_id=topic.id, receipt_id=receipt_id,
            sequence=topic.message_sequence, author_user_id=session.user_id, content=value.content,
            content_sha256=hashlib.sha256(value.content.encode()).hexdigest(),
            stored_source_revision=settings().control_source_revision, created_at=now)
        tx.add(receipt)
        await tx.flush()
        tx.add(message)
        await tx.flush()
        await tx.execute(text(f"SET CONSTRAINTS {PAIRS} IMMEDIATE"))
        await tx.execute(text(f"SET CONSTRAINTS {PAIRS} DEFERRED"))
        return await response(tx, session, topic.portfolio_id, receipt)


async def read(tx, session, portfolio_id, topic_id):
    row = await owned_topic(tx, session, portfolio_id, topic_id)
    value = topic_view(row)
    final = await owned_topic(tx, session, portfolio_id, topic_id)
    if topic_view(final) != value:
        raise ControlError(409, "snapshot_expired")
    return value


def topic_key(row):
    return row.pinned, row.created_at, row.id


def metadata_material(rows):
    return [[row.id, row.anchor_kind, row.discovery_id, row.creation_id, row.business_id, row.grant_id,
             row.title, row.pinned, row.archived_at.isoformat() if row.archived_at else None, row.metadata_revision,
             row.created_at.isoformat()] for row in rows]


def query_checks(limit, query):
    if type(limit) is not int or not 1 <= limit <= 50 or len(query) > 100 or any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in query):
        raise ControlError(400, "invalid_request")


def decoded_cursor(value, session, portfolio_id, snapshot):
    after, expires = open_cursor(value, session, portfolio_id, snapshot)
    try:
        payload = json.loads(base64.urlsafe_b64decode(value.split(".")[0]))
        if payload["after"] != after:
            raise ValueError()
        return payload, expires
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise ControlError(400, "invalid_cursor") from None


async def topic_rows(tx, owned, anchor, state):
    statement = select(Topic).where(*constraints(Topic, owned)).execution_options(populate_existing=True)
    if anchor:
        statement = statement.where(Topic.anchor_kind == anchor.kind)
        if anchor.kind != "portfolio":
            key = "business_id" if anchor.kind == "business" else anchor.kind + "_id"
            statement = statement.where(getattr(Topic, key) == str(anchor.selection_id))
    statement = statement.where(Topic.archived_at.is_(None) if state == "active" else Topic.archived_at.is_not(None))
    return list(await tx.scalars(statement.order_by(Topic.pinned.desc(), Topic.created_at.desc(), Topic.id.desc())))


async def listing(tx, session, portfolio_id, anchor=None, *, limit=20, query="", state="active", cursor=None):
    query_checks(limit, query)
    if state not in {"active", "archived"}:
        raise ControlError(400, "invalid_request")
    owned = await actor(tx, session, portfolio_id)
    if anchor:
        await anchor_authority(tx, owned, anchor)
    rows = await topic_rows(tx, owned, anchor, state)
    snapshot = digest(["workspace-topics.v1", "topics", owned, anchor.model_dump(mode="json") if anchor else None,
                       state, query, metadata_material(rows)])
    expires = int(utcnow().timestamp()) + 300
    if cursor:
        payload, expires = decoded_cursor(cursor, session, owned["portfolio_id"], snapshot)
        # Match the accepted immutable identity; mutable message timestamps never order this list.
        after = next((row for row in rows if row.id == payload["after"]), None)
        if not after:
            raise ControlError(400, "invalid_cursor")
        rows = [row for row in rows if topic_key(row) < topic_key(after)]
    filtered = [row for row in rows if query.casefold() in row.title.casefold()]
    more, page = len(filtered) > limit, filtered[:limit]
    items = [topic_view(row) for row in page]
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, owned["portfolio_id"], settings().environment],
        "snapshot": snapshot, "expires": expires, "after": page[-1].id}) if more else None
    await actor(tx, session, owned["portfolio_id"])
    if anchor:
        await anchor_authority(tx, owned, anchor)
    final = await topic_rows(tx, owned, anchor, state)
    final_snapshot = digest(["workspace-topics.v1", "topics", owned, anchor.model_dump(mode="json") if anchor else None,
                             state, query, metadata_material(final)])
    if final_snapshot != snapshot:
        raise ControlError(409, "snapshot_expired")
    return project(Topics, portfolio_id=owned["portfolio_id"], anchor=anchor, items=items, next_cursor=next_cursor,
                   can_create_topic=True, execution="not_connected")


async def history(tx, session, portfolio_id, topic_id, *, limit=20, cursor=None):
    query_checks(limit, "")
    topic = await owned_topic(tx, session, portfolio_id, topic_id)
    snapshot = digest(["workspace-topics.v1", "messages", topic.id, binding(topic), anchor_of(topic).model_dump(mode="json"), topic.grant_id])
    cutoff, before, expires = topic.message_sequence, None, int(utcnow().timestamp())+300
    if cursor:
        payload, expires = decoded_cursor(cursor, session, topic.portfolio_id, snapshot)
        cutoff, before = payload.get("cutoff"), payload.get("before")
        if (type(cutoff) is not int or type(before) is not int or not 0 <= cutoff <= topic.message_sequence
                or not 1 <= before <= cutoff):
            raise ControlError(400, "invalid_cursor")
        accepted = await tx.scalar(select(Message.id).where(Message.id == payload["after"], Message.topic_id == topic.id,
            Message.sequence == before, *constraints(Message, binding(topic))))
        if not accepted:
            raise ControlError(400, "invalid_cursor")
    statement = select(Message).where(Message.topic_id == topic.id, Message.sequence <= cutoff,
                                     *constraints(Message, binding(topic)))
    if before is not None:
        statement = statement.where(Message.sequence < before)
    found = list(await tx.scalars(statement.order_by(Message.sequence.desc()).limit(limit+1)))
    more, page = len(found) > limit, found[:limit]
    items = [message_view(row) for row in reversed(page)]
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, topic.portfolio_id, settings().environment],
        "snapshot": snapshot, "expires": expires, "after": page[-1].id, "before": page[-1].sequence,
        "cutoff": cutoff}) if more else None
    await owned_topic(tx, session, portfolio_id, topic_id)
    return project(History, topic_id=topic.id, items=items, next_cursor=next_cursor, cutoff_sequence=cutoff)
