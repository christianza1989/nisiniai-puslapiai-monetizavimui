"""Append-only explicit adoption of unchanged native material by a current owner."""
import asyncio
import json

from sqlalchemy import select, text

from ..business_discovery.models import BuildApproval
from ..business_discovery.service import approved_build_context
from ..content_work.service import archived
from ..control.models import Session
from ..control.routes import ControlError
from ..creation import language_mode
from ..creation.models import Job, Revision
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..creation_registration.service import accepted_proof
from ..models import new_id
from .continuation_models import BuildContinuation
from .continuation_wire import ContinuationState, ContinuationView, Resume

TABLE = "control_site_build_continuations"


async def schema_ready(tx, *, admission=False):
    ready = bool(await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_class
      WHERE oid=to_regclass('control_site_build_continuations') AND relrowsecurity AND relforcerowsecurity)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('control_site_build_continuations')
        AND conname='fk_build_continuation_session' AND convalidated AND confdeltype='r')
      AND (SELECT count(*)=2 FROM pg_trigger WHERE tgrelid=to_regclass('control_site_build_continuations')
        AND tgname IN('build_continuation_immutable','build_continuation_fence') AND tgenabled<>'D')""")))
    if ready and admission:
        return bool(await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_trigger
          WHERE tgrelid=to_regclass('control_site_build_continuations')
          AND tgname='build_continuation_actor_fence' AND tgenabled<>'D' AND tgdeferrable AND tginitdeferred)""")))
    return ready


def fingerprint(creation_id, value):
    return digest({"creation_id": creation_id, **value.model_dump(mode="json")})


async def capture(tx, session, creation):
    from . import foundation, service
    await foundation.guard()
    await current_actor(tx, session, creation.portfolio_id)
    await tx.refresh(creation)
    if creation.status != "draft_ready" or creation.active_job_id or await archived(tx, creation):
        raise ControlError(409, "build_continuation_unavailable")
    approved = await approved_build_context(tx, creation)
    approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == creation.id)
        .execution_options(populate_existing=True))
    if not approved or not approval:
        raise ControlError(409, "build_approval_unavailable")
    proof = await accepted_proof(tx, creation)
    revision = await tx.get(Revision, proof["revision_id"])
    job = await tx.get(Job, revision.job_id) if revision else None
    try:
        from ..creation.private_preview import selected_intake
        _, intake = await selected_intake(tx, creation, revision, job)
        pages = service.initial_pages(revision.payload, intake)
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_content_source") from None
    result = {"version": "native-build-continuation.v1", **binding(creation), "creation_id": creation.id,
        "session_id": session.id, "creation_source_revision": creation.source_revision,
        "approval_id": approval.id, "approval_fingerprint": approval.fingerprint,
        "approval_session_id": approval.session_id, "report_id": approval.report_id,
        "report_revision": approval.report_revision, "report_sha256": approval.report_sha256,
        "report_source_revision": approved["source_revision"], "accepted": proof,
        "sources": (await asyncio.to_thread(foundation.source_pins)).model_dump(mode="json"),
        "language_review_mode": language_mode.mode(), "initial_page_ids": pages}
    await current_actor(tx, session, creation.portfolio_id)
    await tx.refresh(creation)
    if (creation.current_revision != proof["accepted_revision"] or creation.status in ACTIVE
            or creation.active_job_id or await archived(tx, creation)):
        raise ControlError(409, "stale_revision")
    await foundation.guard()
    if (await asyncio.to_thread(foundation.source_pins)).model_dump(mode="json") != result["sources"]:
        raise ControlError(503, "source_unavailable")
    return result


def stored(row):
    value = row.context
    try:
        request = Resume.model_validate_json(json.dumps({"accepted_revision": row.accepted_revision,
            "idempotency_key": row.idempotency_key}))
        if (not isinstance(value, dict) or value["version"] != "native-build-continuation.v1"
                or fingerprint(row.creation_id, request) != row.request_fingerprint
                or digest(value) != row.context_sha256 or value["creation_id"] != row.creation_id
                or value["session_id"] != row.session_id or value["approval_id"] != row.approval_id
                or value["accepted"]["revision_id"] != row.revision_id
                or value["accepted"]["accepted_revision"] != row.accepted_revision
                or {key: value[key] for key in binding(row)} != binding(row)):
            raise ValueError("exact_continuation_required")
        return value
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_build_continuation") from None


async def latest(tx, creation):
    return await tx.scalar(select(BuildContinuation).where(BuildContinuation.creation_id == creation.id)
        .order_by(BuildContinuation.created_at.desc(), BuildContinuation.id.desc()).limit(1)
        .execution_options(populate_existing=True))


async def current(tx, creation, row):
    newest = await latest(tx, creation)
    if not newest or newest.id != row.id:
        return None
    value = stored(row)
    session = await tx.scalar(select(Session).where(Session.id == row.session_id,
        Session.user_id == row.user_id, Session.environment_id == row.environment_id)
        .execution_options(populate_existing=True))
    if not session:
        return None
    try:
        observed = await capture(tx, session, creation)
    except ControlError as error:
        if error.status in {401, 404, 409}:
            return None
        raise
    return session if value == observed else None


def view(row, *, is_current):
    value = stored(row)
    return ContinuationView.model_validate_json(json.dumps({
        "continuation_id": row.id, "creation_id": row.creation_id, "accepted_revision": row.accepted_revision,
        "idempotency_key": row.idempotency_key, "created_at": row.created_at.isoformat(),
        "context_sha256": row.context_sha256, "accepted_source_revision": value["accepted"]["accepted_source_revision"],
        "execution_source_revision": value["sources"]["execution_source_revision"],
        "public_source_revision": value["sources"]["public_source_revision"], "current": is_current,
        "foundation_status": "UNVERIFIED", "channel_activation": "not_performed", "deployment": "not_performed"
    })).model_dump(mode="json")


async def resume(tx, session, creation, value):
    if not await schema_ready(tx, admission=True):
        raise ControlError(503, "build_continuation_schema_unavailable")
    await current_actor(tx, session, creation.portfolio_id)
    key, request = str(value.idempotency_key), fingerprint(creation.id, value)
    old = await tx.scalar(select(BuildContinuation).where(BuildContinuation.idempotency_key == key))
    if old:
        if old.request_fingerprint != request or binding(old) != binding(creation):
            raise ControlError(409, "idempotency_conflict")
        return view(old, is_current=bool(await current(tx, creation, old)))
    if value.accepted_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    captured = await capture(tx, session, creation)
    row = BuildContinuation(id=new_id(), creation_id=creation.id, approval_id=captured["approval_id"],
        revision_id=captured["accepted"]["revision_id"], accepted_revision=value.accepted_revision,
        session_id=session.id, idempotency_key=key, request_fingerprint=request,
        context_sha256=digest(captured), context=captured, **binding(creation))
    tx.add(row)
    await tx.flush()
    return view(row, is_current=True)


async def state(tx, session, creation):
    await current_actor(tx, session, creation.portfolio_id)
    row = await latest(tx, creation) if await schema_ready(tx) else None
    output = view(row, is_current=bool(await current(tx, creation, row))) if row else None
    await current_actor(tx, session, creation.portfolio_id)
    return ContinuationState.model_validate_json(json.dumps({
        "creation_id": creation.id, "latest": output})).model_dump(mode="json")
