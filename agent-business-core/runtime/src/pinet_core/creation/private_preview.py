"""Explicit local private host binding and fenced native intake recovery, without models."""
import asyncio
import hashlib
import json
import re
from datetime import timedelta
from pathlib import Path
from uuid import UUID

from sqlalchemy import select, text

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError, scope, token_hash
from ..customer_text.adapter import source_current
from ..customer_text.service import customer_session
from ..models import new_id, utcnow
from ..source_observation import SourceObservationError, git_source_observation
from ..tasks.codex_transport import RunnerError
from . import private_native_continuity as continuity
from .accepted_material import accepted_material
from .models import Job, PrivateIntakeReceipt, PrivateIntakeRequest, Revision
from .private_preview_wire import PrivateIntakeView
from .service import ACTIVE, binding, current_actor, digest

REQUESTS = "control_creation_private_intake_requests"
RECEIPTS = "control_creation_private_intake_receipts"


def private_host(creation_id):
    # Merely computing this value grants nothing. Only a validated explicit row binds it.
    return UUID(creation_id).hex + ".preview.invalid"


def enabled():
    cfg = settings()
    if (cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or not cfg.customer_enabled or not cfg.creation_enabled
            or not re.fullmatch("[a-f0-9]{40}", cfg.control_source_revision)):
        raise ControlError(503, "private_intake_unavailable")


async def guard():
    enabled()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")


def native_sources():
    from . import studio
    try:
        _, script, _, environment = studio.configuration()
        public = Path(environment["STUDIO_PUBLIC_CORE_DIR"])
        source = git_source_observation(public).head
        network = Path(environment["STUDIO_NETWORK_SETTINGS"])
        if not re.fullmatch("[a-f0-9]{40}", source) or script.is_symlink() or network.is_symlink():
            raise ControlError(503, "source_unavailable")
        return {"public_source_revision": source, "importer_sha256": hashlib.sha256(script.read_bytes()).hexdigest(),
            "network_sha256": hashlib.sha256(network.read_bytes()).hexdigest()}
    except (OSError, SourceObservationError, RunnerError):
        raise ControlError(503, "source_unavailable") from None


async def schema_ready(tx):
    return bool(await tx.scalar(text("""SELECT count(*)=2 AND bool_and(relrowsecurity AND relforcerowsecurity)
      FROM pg_class WHERE oid IN(to_regclass('control_creation_private_intake_requests'),
        to_regclass('control_creation_private_intake_receipts'))"""))) and bool(await tx.scalar(text("""
      SELECT count(*)=4 FROM pg_trigger WHERE tgname IN('private_intake_request_immutable',
        'private_intake_receipt_immutable','private_intake_request_fence','private_intake_receipt_fence')
        AND tgrelid IN(to_regclass('control_creation_private_intake_requests'),
          to_regclass('control_creation_private_intake_receipts')) AND tgenabled<>'D'
      AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('control_memberships')
        AND tgname='private_intake_membership_lock' AND tgenabled<>'D')""")))


def stored(row):
    value = row.context
    try:
        if (not isinstance(value, dict) or digest(value) != row.context_sha256
                or value["version"] != "creation-private-intake-binding.v1"
                or value["creation_id"] != row.creation_id or value["session_id"] != row.session_id
                or {key: value[key] for key in binding(row)} != binding(row)
                or value["accepted"]["revision_id"] != row.revision_id
                or value["accepted"]["accepted_revision"] != row.accepted_revision
                or row.request_fingerprint != digest({"creation_id": row.creation_id,
                    "accepted_revision": row.accepted_revision, "candidate_sha256": value["accepted"]["candidate_sha256"],
                    "idempotency_key": row.idempotency_key})
                or value["native_host"] != private_host(row.creation_id)
                or not re.fullmatch("[a-f0-9]{40}", value["source_revision"])):
            raise ValueError("invalid_binding")
        if "continuity" in value:
            continuity.checked_marker(value["continuity"])
        return value
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_private_intake_source") from None


def result(row, receipt):
    if not receipt:
        return None
    if (binding(receipt) != binding(row) or receipt.recovery_id != row.id or receipt.run_id != row.run_id
            or receipt.state not in {"private_draft_imported", "failed"}
            or digest(receipt.intake) != receipt.intake_sha256
            or (receipt.state == "failed") != (receipt.failure_code is not None)
            or (receipt.state == "failed") != (receipt.intake is None)):
        raise ControlError(503, "invalid_private_intake_source")
    captured = stored(row)
    if receipt.state == "private_draft_imported" and "continuity" in captured:
        continuity.check_recorded(receipt.intake, captured["continuity"], captured)
    return receipt.intake


async def latest(tx, creation):
    return await tx.scalar(select(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == creation.id)
        .order_by(PrivateIntakeRequest.created_at.desc(), PrivateIntakeRequest.id.desc()).limit(1)
        .execution_options(populate_existing=True))


async def terminal(tx, row):
    return await tx.scalar(select(PrivateIntakeReceipt).where(PrivateIntakeReceipt.recovery_id == row.id)
        .execution_options(populate_existing=True))


async def retained_anchor(tx, creation, captured, marker=None):
    """Resolve immutable historical evidence, never reuse its old authority.

    Initial v1 rows remain exact. An additive marker pins an original successful
    non-continuity receipt; renewals never form a recursive chain of snapshots.
    Current owner/source/accepted context is independently captured by the caller.
    """
    if marker is not None:
        continuity.checked_marker(marker)
        row = await tx.get(PrivateIntakeRequest, marker["recovery_id"], populate_existing=True)
    else:
        row = await tx.scalar(select(PrivateIntakeRequest).join(PrivateIntakeReceipt,
            PrivateIntakeReceipt.recovery_id == PrivateIntakeRequest.id).where(
                PrivateIntakeRequest.creation_id == creation.id,
                PrivateIntakeRequest.revision_id == captured["accepted"]["revision_id"],
                PrivateIntakeReceipt.state == "private_draft_imported",
                ~PrivateIntakeRequest.context.has_key("continuity"))  # noqa: W601
            .order_by(PrivateIntakeRequest.created_at.desc(), PrivateIntakeRequest.id.desc()).limit(1)
            .execution_options(populate_existing=True))
    if row is None:
        if marker is not None:
            raise ControlError(409, "private_intake_anchor_stale")
        return None
    previous = stored(row)
    receipt = await terminal(tx, row)
    intake = result(row, receipt)
    origin = continuity.checked_sources(previous["native_sources"])
    execution = continuity.checked_sources(captured["native_sources"])
    upgraded = origin != execution
    if upgraded and (previous["source_revision"] == captured["source_revision"]
            or origin["network_sha256"] != execution["network_sha256"]):
        raise ControlError(409, "private_intake_anchor_stale")
    def stable(value):
        # Native drift is admitted only by the explicit, exact v2 proof below.
        return {k: v for k, v in value.items() if k not in {"source_revision", "session_id", "continuity", "native_sources"}}
    if (binding(row) != binding(creation) or "continuity" in previous or row.revision_id != captured["accepted"]["revision_id"]
            or stable(previous) != stable(captured) or not receipt or receipt.state != "private_draft_imported"
            or not isinstance(intake, dict) or intake.get("version") != "customer-content-intake.v1"
            or intake.get("state") != "private-draft-imported" or intake.get("creationId") != creation.id
            or intake.get("acceptedRevision") != captured["accepted"]["accepted_revision"]
            or intake.get("sourceHash") != captured["accepted"]["candidate_sha256"]
            or intake.get("canonicalHost") != captured["native_host"]
            or intake.get("importerHash") != origin["importer_sha256"]):
        raise ControlError(409, "private_intake_anchor_stale")
    observed = {"version": continuity.MARKER_VERSION, "recovery_id": row.id, "receipt_id": receipt.id,
        "context_sha256": row.context_sha256, "intake_sha256": receipt.intake_sha256,
        "manifest_sha256": continuity.manifest_hash(intake), "observer_sha256": continuity.observer_sha256()}
    if upgraded:
        observed.update(version=continuity.UPGRADE_MARKER_VERSION, origin_source_revision=previous["source_revision"],
            execution_source_revision=captured["source_revision"], origin_native_sources=origin,
            execution_native_sources=execution)
    continuity.checked_marker(observed)
    if marker is not None and observed != marker:
        raise ControlError(409, "private_intake_anchor_stale")
    return observed, intake


async def capture(tx, session, creation, *, admission=False):
    """No import precondition: the exact team acceptance is the bootstrap authority."""
    from ..business_discovery.service import approved_build_context
    from ..content_work.models import GuideJob
    from ..content_work.service import archived
    await current_actor(tx, session, creation.portfolio_id)
    await tx.refresh(creation)
    if (creation.status != "draft_ready" or creation.active_job_id or creation.canonical_host is not None
            or await archived(tx, creation) or admission and await tx.scalar(select(GuideJob.id).where(
                GuideJob.creation_id == creation.id, GuideJob.status.in_(ACTIVE)).limit(1))):
        raise ControlError(409, "private_intake_revision_unavailable")
    revision, job, proof = await accepted_material(tx, creation)
    if (job.usage or {}).get("content_intake", {}).get("state") == "private-draft-imported":
        raise ControlError(409, "private_intake_already_imported")
    expected = (job.usage or {}).get("source_context_sha256")
    context = None
    if expected is not None:
        approved = await approved_build_context(tx, creation)
        context = approved.get("sourceContext") if approved else None
        if not context or context.get("contextSha256") != expected:
            raise ControlError(409, "source_context_changed")
    return revision, {"version": "creation-private-intake-binding.v1", **binding(creation),
        "creation_id": creation.id, "session_id": session.id,
        "creation_source_revision": creation.source_revision, "accepted": proof,
        "source_revision": settings().control_source_revision, "native_host": private_host(creation.id),
        "source_context": context, "native_sources": await asyncio.to_thread(native_sources)}


async def current(tx, creation, row):
    expected = stored(row)
    if (binding(row) != binding(creation) or expected["source_revision"] != settings().control_source_revision
            or not await asyncio.to_thread(source_current)):
        return False
    session = await tx.scalar(select(Session).where(Session.id == row.session_id,
        Session.user_id == row.user_id, Session.environment_id == row.environment_id)
        .execution_options(populate_existing=True))
    if not session:
        return False
    try:
        _, observed = await capture(tx, session, creation)
        if "continuity" in expected:
            marker, _ = await retained_anchor(tx, creation, observed, expected["continuity"])
            observed = {**observed, "continuity": marker}
        return observed == expected
    except ControlError as error:
        if error.status in {401, 404, 409}:
            return False
        raise


async def selected_intake(tx, creation, revision, job):
    """The sole effective-native-host resolver. Legacy non-null semantics are exact."""
    legacy = (job.usage or {}).get("content_intake") if job else None
    if creation.canonical_host is not None:
        return creation.canonical_host, legacy
    if not revision or not job or not await schema_ready(tx):
        return None, legacy
    row = await latest(tx, creation)
    if not row or row.revision_id != revision.id or not await current(tx, creation, row):
        return None, legacy
    receipt = await terminal(tx, row)
    intake = result(row, receipt)
    if not receipt or receipt.state != "private_draft_imported":
        return None, legacy
    expected = stored(row)
    if (intake.get("canonicalHost") != expected["native_host"] or intake.get("creationId") != creation.id
            or intake.get("acceptedRevision") != revision.sequence or intake.get("sourceHash") != revision.material_hash):
        raise ControlError(503, "invalid_private_intake_source")
    return expected["native_host"], intake


async def view(tx, session, creation):
    enabled()
    await current_actor(tx, session, creation.portfolio_id)
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id,
        Revision.sequence == creation.current_revision)) if creation.current_revision else None
    job = await tx.get(Job, revision.job_id) if revision else None
    row = await latest(tx, creation) if await schema_ready(tx) else None
    receipt = await terminal(tx, row) if row else None
    if row:
        result(row, receipt)
    is_current = bool(row and await current(tx, creation, row))
    native_host, intake = await selected_intake(tx, creation, revision, job)
    imported = bool(native_host and intake and intake.get("state") == "private-draft-imported")
    state = "private_draft_imported" if imported else "not_prepared"
    host_source = "existing_canonical_host" if native_host else "not_bound"
    attempt = None
    if row:
        captured = stored(row)
        attempt_state = receipt.state if receipt else "preparing"
        if not is_current or not receipt and row.lease_until <= utcnow():
            attempt_state = "stale"
        attempt = {"recovery_id": row.id, "idempotency_key": row.idempotency_key,
            "accepted_revision": row.accepted_revision, "candidate_sha256": captured["accepted"]["candidate_sha256"],
            "accepted_source_revision": captured["accepted"]["accepted_source_revision"],
            "source_revision": captured["source_revision"], "native_host": captured["native_host"],
            "state": attempt_state, "failure_code": receipt.failure_code if receipt else None,
            "created_at": row.created_at.isoformat(), "finished_at": receipt.created_at.isoformat() if receipt else None}
        if creation.canonical_host is None:
            state = attempt_state
            if is_current and state != "stale":
                native_host, host_source = captured["native_host"], "explicit_private_preview"
            else:
                native_host, host_source = None, "not_bound"
    can_prepare = False
    if creation.canonical_host is None and state not in {"preparing", "private_draft_imported"} and await schema_ready(tx):
        try:
            await capture(tx, session, creation, admission=True)
            can_prepare = await asyncio.to_thread(source_current)
        except ControlError as error:
            if error.status not in {401, 404, 409}:
                raise
    await current_actor(tx, session, creation.portfolio_id)
    return PrivateIntakeView.model_validate_json(json.dumps({"creation_id": creation.id,
        "current_revision": revision.sequence if revision else None, "candidate_sha256": revision.material_hash if revision else None,
        "state": state, "public_canonical_host": creation.canonical_host, "domain_authority": "UNVERIFIED",
        "native_host": native_host, "host_source": host_source, "private_preview_only": True,
        "can_prepare": can_prepare, "latest": attempt, "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED",
        "deployment": "not_performed", "channel_activation": "not_performed"})).model_dump(mode="json")


async def prepare(token, creation_id, value, *, intake_runner=None, continuity_runner=None):
    from . import studio
    from .routes import owned
    await guard()
    key = str(value.idempotency_key)
    fingerprint = digest({"creation_id": creation_id, **value.model_dump(mode="json")})
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, creation_id, lock=True)
        if not await schema_ready(tx):
            raise ControlError(503, "private_intake_schema_unavailable")
        # Serialize a reused key even when it targets another owned Creation.
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": f"private-intake:{settings().environment}:{session.user_id}:{key}"})
        old = await tx.scalar(select(PrivateIntakeRequest).where(PrivateIntakeRequest.idempotency_key == key)
            .with_for_update().execution_options(populate_existing=True))
        if old and (old.request_fingerprint != fingerprint or binding(old) != binding(creation)
                or old.creation_id != creation.id or old.session_id != session.id):
            raise ControlError(409, "idempotency_conflict")
        revision, captured = await capture(tx, session, creation, admission=True)
        if revision.sequence != value.accepted_revision or revision.material_hash != value.candidate_sha256:
            raise ControlError(409, "stale_revision")
        newest = await latest(tx, creation)
        if old and newest and newest.id != old.id:
            raise ControlError(409, "private_intake_binding_stale")
        if old:
            if "continuity" in stored(old):
                marker, anchor_intake = await retained_anchor(tx, creation, captured, stored(old)["continuity"])
                captured = {**captured, "continuity": marker}
            if stored(old) != captured:
                raise ControlError(409, "private_intake_binding_stale")
            if await terminal(tx, old) or old.lease_until > utcnow():
                return await view(tx, session, creation)
        elif newest:
            finished = await terminal(tx, newest)
            if finished and finished.state == "private_draft_imported" and await current(tx, creation, newest):
                raise ControlError(409, "private_intake_already_imported")
        pending = await tx.scalar(select(PrivateIntakeRequest.id).where(
            PrivateIntakeRequest.creation_id == creation.id, PrivateIntakeRequest.lease_until > utcnow(),
            ~select(PrivateIntakeReceipt.id).where(PrivateIntakeReceipt.recovery_id == PrivateIntakeRequest.id).exists()).limit(1))
        if pending:
            raise ControlError(409, "private_intake_in_progress")
        if not old and newest:
            retained = await retained_anchor(tx, creation, captured)
            if retained:
                marker, anchor_intake = retained
                captured = {**captured, "continuity": marker}
        if old:
            row = old
            row.run_id, row.lease_until = new_id(), utcnow()+timedelta(seconds=90)
        else:
            row = PrivateIntakeRequest(id=new_id(), creation_id=creation.id, revision_id=revision.id,
                accepted_revision=revision.sequence, session_id=session.id, idempotency_key=key,
                request_fingerprint=fingerprint, context=captured, context_sha256=digest(captured),
                run_id=new_id(), lease_until=utcnow()+timedelta(seconds=90), **binding(creation))
            tx.add(row)
        await tx.flush()
        recovery_id, run_id, expected_session = row.id, row.run_id, session.id
        payload = revision.payload

    async def authorized():
        try:
            await guard()
            async with scope(token=token_hash(token)) as tx:
                session = await customer_session(tx, token)
                if session.id != expected_session:
                    return False
                creation = await owned(tx, session, creation_id)
                row = await tx.get(PrivateIntakeRequest, recovery_id, populate_existing=True)
                return bool(row and row.run_id == run_id and row.lease_until > utcnow()
                    and not await terminal(tx, row) and await current(tx, creation, row))
        except ControlError:
            return False

    intake, failure = None, None
    try:
        if "continuity" in captured:
            intake = await (continuity_runner or continuity.observe)(context=captured, anchor_intake=anchor_intake,
                still_authorized=authorized, seconds=20)
        else:
            options = {"source_context": captured["source_context"]} if captured["source_context"] is not None else {}
            intake = await (intake_runner or studio.import_draft)(payload, creation_id=creation_id,
                revision=value.accepted_revision, canonical_host=captured["native_host"],
                still_authorized=authorized, seconds=20, **options)
        if not isinstance(intake, dict) or intake.get("importerHash") != continuity.importer_sha256(captured):
            raise RunnerError("studio_intake_failed")
        if not await authorized():
            raise ControlError(409, "private_intake_binding_stale")
    except RunnerError as error:
        failure = error.code if re.fullmatch("[a-z0-9_]{1,80}", error.code) else "studio_intake_failed"
    await guard()
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, creation_id, lock=True)
        row = await tx.get(PrivateIntakeRequest, recovery_id, populate_existing=True)
        if (session.id != expected_session or not row or row.run_id != run_id or row.lease_until <= utcnow()
                or not await current(tx, creation, row)):
            raise ControlError(409, "private_intake_binding_stale")
        if not await terminal(tx, row):
            tx.add(PrivateIntakeReceipt(id=new_id(), recovery_id=row.id, run_id=run_id,
                state="failed" if failure else "private_draft_imported", failure_code=failure,
                intake=None if failure else intake, intake_sha256=digest(None if failure else intake), **binding(row)))
            await tx.flush()
        if not failure:
            from ..creation_registration.service import accepted_proof
            await accepted_proof(tx, creation)
        return await view(tx, session, creation)
