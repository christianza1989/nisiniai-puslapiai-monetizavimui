"""Current owner/RLS scope, canonical relationships and read-only keyset pages."""
import base64
import json
from dataclasses import dataclass
from datetime import datetime

from pydantic import ValidationError
from sqlalchemy import and_, case, func, literal, or_, select

from ..business_discovery.models import BuildApproval, Discovery, DiscoveryJob, Report
from ..business_discovery.service import report_view
from ..config import settings
from ..control.models import BusinessGrant, User
from ..control.routes import ControlError, identifier, open_cursor, seal_cursor
from ..creation.models import Artifact, Creation, Job
from ..creation.service import artifact_integrity, artifact_view, current_actor, digest
from ..creation_registration.models import Registration
from ..creation_registration.service import stored_material
from ..models import Business, utcnow
from .wire import ArtifactDocument, Page, ReportDocument


@dataclass
class Scope:
    selection: dict
    binding: dict
    discoveries: list
    creations: list
    businesses: dict
    associations: dict
    snapshot: str


def constraints(model, expected):
    return [getattr(model, key) == value for key, value in expected.items()]


def latest_registrations(rows):
    """Select latest identity before inspecting revocation; never resurrect an older row."""
    latest = {}
    for row in sorted(rows, key=lambda row: row.accepted_revision, reverse=True):
        latest.setdefault(row.creation_id, row)
    return list(latest.values())


async def resolve(tx, session, portfolio_id, kind, selection_id):
    portfolio_id, selection_id = identifier(portfolio_id), identifier(selection_id)
    if kind not in {"portfolio", "discovery", "creation", "business"}:
        raise ControlError(400, "invalid_request")
    if not await tx.scalar(select(User.id).where(User.id == session.user_id, User.enabled)):
        raise ControlError(401, "unauthenticated")
    portfolio = await current_actor(tx, session, portfolio_id)
    expected = {"user_id": session.user_id, "environment_id": settings().environment,
                "organization_id": portfolio.organization_id, "portfolio_id": portfolio_id}
    ds = select(Discovery).where(*constraints(Discovery, expected))
    cs = select(Creation).where(*constraints(Creation, expected))
    rs = select(Registration).where(*constraints(Registration, expected))
    gs = select(BusinessGrant).where(BusinessGrant.portfolio_id == portfolio_id,
        BusinessGrant.organization_id == portfolio.organization_id,
        BusinessGrant.environment_id == settings().environment)
    # Latest is resolved BEFORE filtering business, grant or revocation. An older
    # relationship can never reappear when a newer identity is unavailable.
    latest = select(Registration.creation_id, func.max(Registration.accepted_revision).label("revision")).where(
        *constraints(Registration, expected)).group_by(Registration.creation_id).subquery()
    rs = rs.join(latest, and_(Registration.creation_id == latest.c.creation_id,
                            Registration.accepted_revision == latest.c.revision))
    if kind == "portfolio":
        if selection_id != portfolio_id:
            raise ControlError(404, "not_found")
        creations = list(await tx.scalars(cs.execution_options(populate_existing=True)))
        discoveries = list(await tx.scalars(ds.execution_options(populate_existing=True)))
    elif kind == "business":
        grant = await tx.scalar(gs.where(BusinessGrant.business_id == selection_id, BusinessGrant.enabled)
                               .execution_options(populate_existing=True))
        if not grant:
            raise ControlError(404, "not_found")
        rs = rs.where(Registration.business_id == selection_id, Registration.grant_id == grant.id)
        candidates = list(await tx.scalars(rs.execution_options(populate_existing=True)))
        creations = list(await tx.scalars(cs.where(Creation.id.in_([row.creation_id for row in candidates]))
                                          .execution_options(populate_existing=True)))
        ids = [row.id for row in creations]
        discoveries = list(await tx.scalars(ds.join(BuildApproval, and_(
            Discovery.id == BuildApproval.discovery_id, Discovery.linked_creation_id == BuildApproval.creation_id))
            .where(*constraints(BuildApproval, expected), BuildApproval.creation_id.in_(ids))
            .execution_options(populate_existing=True)))
    elif kind == "creation":
        creation = await tx.scalar(cs.where(Creation.id == selection_id).execution_options(populate_existing=True))
        if not creation:
            raise ControlError(404, "not_found")
        creations = [creation]
        discoveries = list(await tx.scalars(ds.join(BuildApproval, and_(
            Discovery.id == BuildApproval.discovery_id, Discovery.linked_creation_id == BuildApproval.creation_id))
            .where(*constraints(BuildApproval, expected), BuildApproval.creation_id == selection_id)
            .execution_options(populate_existing=True)))
    else:
        discovery = await tx.scalar(ds.where(Discovery.id == selection_id).execution_options(populate_existing=True))
        if not discovery:
            raise ControlError(404, "not_found")
        discoveries = [discovery]
        creations = list(await tx.scalars(cs.join(BuildApproval, Creation.id == BuildApproval.creation_id)
            .where(*constraints(BuildApproval, expected), BuildApproval.discovery_id == selection_id,
                   Creation.id == discovery.linked_creation_id).execution_options(populate_existing=True)))
    cids, dids = [row.id for row in creations], [row.id for row in discoveries]
    registrations = list(await tx.scalars(rs.where(Registration.creation_id.in_(cids))
                         .execution_options(populate_existing=True)))
    grants = list(await tx.scalars(gs.where(BusinessGrant.id.in_([row.grant_id for row in registrations]))
                                  .execution_options(populate_existing=True)))
    if kind == "business" and grant.id not in {row.id for row in grants}:
        grants.append(grant)
    grant_map = {row.id: row for row in grants}
    business_rows = list(await tx.scalars(select(Business).where(
        Business.id.in_([row.business_id for row in registrations]))))
    business_map = {row.id: row for row in business_rows}
    creation_map = {row.id: row for row in creations}
    approvals = list(await tx.scalars(select(BuildApproval).where(*constraints(BuildApproval, expected),
                    BuildApproval.discovery_id.in_(dids), BuildApproval.creation_id.in_(cids))))
    links = {(row.discovery_id, row.creation_id) for row in approvals}
    valid_links = {(d.id, d.linked_creation_id) for d in discoveries
                   if d.linked_creation_id in creation_map and (d.id, d.linked_creation_id) in links}
    businesses, associations, evidence = {}, {}, []
    for registration in registrations:
        grant = grant_map.get(registration.grant_id)
        if digest(stored_material(registration)) != registration.fingerprint:
            raise ControlError(503, "source_unavailable")
        business = business_map.get(registration.business_id)
        if (not grant or grant.business_id != registration.business_id or not business
                or (business.site_id, business.canonical_host) != (registration.site_id, registration.canonical_host)):
            raise ControlError(503, "source_unavailable")
        state = ("revoked" if registration.revoked_at else "grant_revoked" if not grant.enabled else
                 "stale_saved" if registration.accepted_revision != creation_map[registration.creation_id].current_revision
                 else "latest_saved")
        associations[registration.creation_id] = state
        if state in {"latest_saved", "stale_saved"}:
            businesses[registration.creation_id] = registration.business_id
        evidence.append([registration.id, registration.fingerprint, grant.id, grant.evidence_revision, state])
    if kind == "business":
        creations = [row for row in creations if businesses.get(row.id) == selection_id]
        ids = {row.id for row in creations}
        discoveries = [row for row in discoveries if any((row.id, cid) in valid_links for cid in ids)]
        valid_links = {(did, cid) for did, cid in valid_links if cid in ids}
    parent_businesses = {("creation", cid): bid for cid, bid in businesses.items()}
    topic_associations = {("creation", cid): state for cid, state in associations.items()}
    for did, cid in valid_links:
        topic_associations[("discovery", did)] = associations.get(cid, "unregistered")
        if cid in businesses:
            parent_businesses[("discovery", did)] = businesses[cid]
    selection = {"portfolio_id": portfolio_id, "kind": kind, "selection_id": selection_id}
    snapshot = digest({"selection": selection, "source": settings().control_source_revision,
        "roots": sorted([[type(row).__name__, row.id, row.current_revision, row.status,
                          row.updated_at.isoformat()] for row in [*discoveries, *creations]]),
        "links": sorted(valid_links), "registrations": sorted(evidence),
        "grants": sorted([[row.id, row.business_id, row.evidence_revision, row.enabled] for row in grants])})
    return Scope(selection, expected, discoveries, creations, parent_businesses, topic_associations, snapshot)


def query_text(value):
    if len(value) > 100 or any(ord(char) < 32 for char in value):
        raise ControlError(400, "invalid_request")
    return value.strip()


def cursor_scope(scope, collection, query):
    return digest({"version": "workspace-read.v1", "scope": scope.snapshot,
                   "collection": collection, "query": query})


def cursor_anchor(cursor, session, scope, snapshot):
    after, expires = open_cursor(cursor, session, scope.selection["portfolio_id"], snapshot)
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.split(".")[0]))
        if payload["after_kind"] not in {"discovery", "creation", "discovery_task", "creation_task",
                                        "discovery_report", "creation_artifact"}:
            raise ValueError()
        time = datetime.fromisoformat(payload["after_time"])
        cutoff = datetime.fromisoformat(payload["cutoff"])
        if not time.tzinfo or not cutoff.tzinfo or time > cutoff:
            raise ValueError()
        return (time, payload["after_kind"], after), cutoff, expires
    except (ValueError, KeyError, TypeError):
        raise ControlError(400, "invalid_cursor") from None


def page_query(model, expected, parent_key, ids, kind, limit, query, title, cutoff, anchor):
    statement = select(model).where(*constraints(model, expected), getattr(model, parent_key).in_(ids),
                                   model.created_at <= cutoff)
    if model in {Report, Artifact}:
        # Group the complete allowed family before filtering/paging. Old revisions remain
        # accessible only by their explicit existing reader/history, never mistaken for latest.
        keys = [getattr(model, parent_key)] + ([Artifact.kind] if model is Artifact else [])
        latest = select(*keys, func.max(model.revision).label("latest_revision")).where(
            *constraints(model, expected), getattr(model, parent_key).in_(ids), model.created_at <= cutoff)
        latest = latest.group_by(*keys).subquery()
        on = [getattr(model, parent_key) == getattr(latest.c, parent_key), model.revision == latest.c.latest_revision]
        if model is Artifact:
            on.append(Artifact.kind == latest.c.kind)
        statement = statement.join(latest, and_(*on))
    if query:
        statement = statement.where(title.icontains(query, autoescape=True))
    if anchor:
        time, anchor_kind, after = anchor
        # Descending immutable time/typed-kind/id ordering, including collisions across legacy tables.
        statement = statement.where(or_(model.created_at < time, and_(model.created_at == time,
            or_(kind < anchor_kind, and_(kind == anchor_kind, model.id < after)))))
    return statement.order_by(model.created_at.desc(), model.id.desc()).limit(limit + 1)


def result_metadata(scope, row, kind):
    topic_kind = "discovery" if kind == "discovery_report" else "creation"
    topic_id = getattr(row, topic_kind + "_id")
    item = {"kind": kind, "id": row.id, "topic": {"kind": topic_kind,
        "topic_id": topic_id, "portfolio_id": scope.selection["portfolio_id"]}, "created_at": row.created_at}
    if kind == "discovery_report":
        report = report_view(row)
        title = next(d.title for d in scope.discoveries if d.id == topic_id)
        item.update(title=("Verslo planas · " if report["reply"]["plan"] else "Patikslinimo klausimai · ") + title,
            revision=row.revision, sha256=row.material_hash, media_type="application/json", artifact_kind="discovery_report")
    else:
        artifact_integrity(row)
        item.update(title=row.display_name, revision=row.revision, sha256=row.sha256,
                    media_type=row.media_type, artifact_kind=row.kind)
    return item


async def read(tx, session, portfolio_id, kind, selection_id, collection, *, limit=20, cursor=None, query=""):
    if collection not in {"topics", "tasks", "results"} or type(limit) is not int or not 1 <= limit <= 50:
        raise ControlError(400, "invalid_request")
    portfolio_id, selection_id = identifier(portfolio_id), identifier(selection_id)
    query = query_text(query)
    scope = await resolve(tx, session, portfolio_id, kind, selection_id)
    snapshot = cursor_scope(scope, collection, query)
    anchor, cutoff, expires = None, utcnow(), int(utcnow().timestamp()) + 600
    if cursor:
        if len(cursor) > 2048:
            raise ControlError(400, "invalid_cursor")
        anchor, cutoff, expires = cursor_anchor(cursor, session, scope, snapshot)
    dids, cids = [row.id for row in scope.discoveries], [row.id for row in scope.creations]
    if collection == "topics":
        sources = [(Discovery, "id", dids, "discovery", Discovery.title),
                   (Creation, "id", cids, "creation", Creation.display_name)]
    elif collection == "tasks":
        # Do not index private prompt/message bodies; searchable title is the safe parent topic.
        sources = [(DiscoveryJob, "discovery_id", dids, "discovery_task", None),
                   (Job, "creation_id", cids, "creation_task", None)]
    else:
        report_title = case((Report.payload["reply"]["plan"].astext.is_not(None), literal("Verslo planas · ")),
                            else_=literal("Patikslinimo klausimai · ")) + select(Discovery.title).where(
                            Discovery.id == Report.discovery_id).scalar_subquery()
        sources = [(Report, "discovery_id", dids, "discovery_report", report_title),
                   (Artifact, "creation_id", cids, "creation_artifact", Artifact.display_name)]
    titles = {("discovery", row.id): row.title for row in scope.discoveries}
    titles.update({("creation", row.id): row.display_name for row in scope.creations})
    found = []
    for model, key, ids, item_kind, title in sources:
        if not ids:
            continue
        if query and title is None:
            topic_kind = "discovery" if item_kind.startswith("discovery") else "creation"
            ids = [item for item in ids if query.casefold() in titles[(topic_kind, item)].casefold()]
        statement = page_query(model, scope.binding, key, ids, item_kind, limit,
                               query if title is not None else "", title, cutoff, anchor)
        found.extend((row, item_kind) for row in await tx.scalars(statement))
    found.sort(key=lambda item: (item[0].created_at, item[1], item[0].id), reverse=True)
    more = len(found) > limit
    found = found[:limit]
    items = []
    for row, item_kind in found:
        topic_kind = "discovery" if item_kind.startswith("discovery") else "creation"
        topic_id = row.id if collection == "topics" else getattr(row, topic_kind + "_id")
        item = {"kind": item_kind, "id": row.id, "topic": {"kind": topic_kind,
                "topic_id": topic_id, "portfolio_id": scope.selection["portfolio_id"]}, "created_at": row.created_at}
        key = (topic_kind, topic_id)
        if collection == "topics":
            item.update(title=titles[key], stored_status=row.status, current_revision=row.current_revision,
                        updated_at=row.updated_at, parent_business_id=scope.businesses.get(key),
                        association_state=scope.associations.get(key, "unregistered"))
        elif collection == "tasks":
            item.update(title=titles[key], sequence=row.sequence, base_revision=row.base_revision,
                stored_status=row.status, finished_at=getattr(row, "finished_at", None), source_revision=row.source_revision)
        else:
            item = result_metadata(scope, row, item_kind)
        items.append(item)
    next_cursor = None
    if more:
        row, item_kind = found[-1]
        next_cursor = seal_cursor({"binding": [session.user_id, session.id, portfolio_id, settings().environment],
            "snapshot": snapshot, "expires": expires, "after": row.id, "after_kind": item_kind,
            "after_time": row.created_at.isoformat(), "cutoff": cutoff.isoformat()})
    # A saved cursor/index is never authority. Recheck after source reads before returning data.
    final = await resolve(tx, session, portfolio_id, kind, selection_id)
    if final.snapshot != scope.snapshot:
        raise ControlError(409, "snapshot_expired")
    try:
        return Page(selection=scope.selection, collection=collection, items=items,
                    next_cursor=next_cursor).model_dump(mode="json")
    except ValidationError:
        raise ControlError(503, "source_unavailable") from None


async def document(tx, session, portfolio_id, kind, selection_id, result_kind, result_id, *, revision, sha256):
    """Exact old/new result inside the currently authorized graph; never a cached authority."""
    if result_kind not in {"discovery_report", "creation_artifact"}:
        raise ControlError(400, "invalid_request")
    scope = await resolve(tx, session, portfolio_id, kind, selection_id)
    result_id = identifier(result_id)
    model, key, roots = ((Report, "discovery_id", scope.discoveries) if result_kind == "discovery_report"
                        else (Artifact, "creation_id", scope.creations))
    row = await tx.scalar(select(model).where(*constraints(model, scope.binding), model.id == result_id,
                          getattr(model, key).in_([root.id for root in roots])))
    if not row:
        raise ControlError(404, "not_found")
    metadata = result_metadata(scope, row, result_kind)
    metadata["family_basis"] = "exact_saved_revision"
    if metadata["revision"] != revision or metadata["sha256"] != sha256:
        raise ControlError(409, "result_changed")
    final = await resolve(tx, session, portfolio_id, kind, selection_id)
    if final.snapshot != scope.snapshot:
        raise ControlError(409, "snapshot_expired")
    try:
        if result_kind == "discovery_report":
            return ReportDocument(kind=result_kind, result=metadata, report=report_view(row)).model_dump(mode="json")
        return ArtifactDocument(kind=result_kind, result=metadata, artifact=artifact_view(row),
                                content=row.content).model_dump(mode="json")
    except ValidationError:
        raise ControlError(503, "source_unavailable") from None
