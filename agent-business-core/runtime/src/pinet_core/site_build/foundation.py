"""Fixed native evidence bridge; the caller owns final persistence/admission."""
import asyncio
import hashlib
import json
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy import literal_column, select

from ..business_discovery.models import BuildApproval
from ..business_discovery.service import approved_build_context
from ..config import settings
from ..content_completion.service import read_current_node
from ..content_work.service import archived
from ..control.models import Session, User
from ..control.routes import ControlError, identifier
from ..creation import language_mode, studio
from ..creation.adapter import ROOT
from ..creation.models import Job, Revision
from ..creation.routes import owned
from ..creation.service import ACTIVE, binding, digest
from ..customer_text.adapter import source_current
from ..source_observation import SourceObservationError, git_source_observation
from ..tasks.codex_transport import RunnerError
from . import service as builds
from .foundation_wire import FoundationScope, Observation, PreparedPreview, RetainedCheck, Sources

SCRIPT = ROOT / "content-studio/scripts/customer-site-foundation.mjs"
VERIFIER = ROOT / "SKILLS/niche-site-audit/scripts/verify-site-completion.mjs"
PARSER = VERIFIER.parent / "rendered_site.py"


def sha(file):
    if not file.is_file() or file.is_symlink():
        raise ControlError(503, "foundation_bridge_unavailable")
    return hashlib.sha256(file.read_bytes()).hexdigest()


def source_pins():
    try:
        _, _, _, environment = studio.configuration()
        public = Path(environment["STUDIO_PUBLIC_CORE_DIR"])
        revision = git_source_observation(public).head
        return Sources.model_validate_json(json.dumps({
            "execution_source_revision": settings().control_source_revision,
            "public_source_revision": revision, "bridge_sha256": sha(SCRIPT),
            "verifier_sha256": sha(VERIFIER), "parser_sha256": sha(PARSER)}))
    except SourceObservationError:
        raise ControlError(503, "source_unavailable") from None
    except (OSError, ValueError, RunnerError):
        raise ControlError(503, "foundation_bridge_unavailable") from None


async def guard():
    builds.enabled()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")


def checked(expected):
    if not isinstance(expected, FoundationScope):
        raise ControlError(400, "invalid_request")
    try:
        return FoundationScope.model_validate_json(expected.model_dump_json())
    except (ValidationError, ValueError, TypeError):
        raise ControlError(400, "invalid_request") from None


async def capture(tx, session, creation_id):
    """Current observation, not implicit approval-session renewal or source adoption."""
    from .authority_observation import active
    observed = active(tx)
    await guard()
    # One fresh RLS snapshot at this checkpoint; independent ownership/native
    # checks below and the later capture remain fresh and unchanged.
    session = await tx.scalar(select(Session)
        .join(User, User.id == Session.user_id)
        .where(Session.id == session.id, Session.user_id == session.user_id,
            Session.environment_id == settings().environment,
            User.environment_id == settings().environment, User.enabled,
            literal_column("current_setting('pinet.control_user',true)") == Session.user_id,
            literal_column("current_setting('pinet.environment',true)") == settings().environment)
        .execution_options(populate_existing=True))
    if session is None:
        raise ControlError(401, "unauthenticated")
    creation = (await observed.owned(session, identifier(creation_id)) if observed
        else await owned(tx, session, identifier(creation_id)))
    await tx.refresh(creation)
    if creation.status in ACTIVE or creation.active_job_id or await archived(tx, creation):
        raise ControlError(409, "foundation_revision_unavailable")
    approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == creation.id)
        .execution_options(populate_existing=True))
    if not approval or binding(approval) != binding(creation):
        raise ControlError(409, "build_approval_unavailable")
    if observed:
        await observed.material(creation)
    await observed.approved(creation) if observed else await approved_build_context(tx, creation)
    proof, current = await read_current_node(tx, session, creation)
    revision = await tx.get(Revision, proof["revision_id"], populate_existing=True)
    job = await tx.get(Job, revision.job_id) if revision else None
    if not job or not isinstance(job.usage, dict) or not isinstance(current, dict):
        raise ControlError(503, "invalid_content_completion_source")
    from ..creation.private_preview import selected_intake
    _, intake = await selected_intake(tx, creation, revision, job)
    mappings = (intake or {}).get("pageMappings", [])
    by_path = {row["path"]: row["pageId"] for row in mappings}
    try:
        required = {by_path[page["path"]] for page in revision.payload["pages"]}
        required.update(builds.initial_pages(revision.payload, intake))
        # Native supporting pages may be added by the maintained editorial workflow.
        required.update(p["pageId"] for p in current["pages"] if p["type"] not in {"guide", "article"})
        expected = FoundationScope.model_validate_json(json.dumps({**binding(creation),
            "session_id": session.id, "creation_id": creation.id, "approval_id": approval.id,
            "approval_fingerprint": approval.fingerprint, "approval_session_id": approval.session_id,
            "discovery_id": approval.discovery_id, "report_id": approval.report_id,
            "report_revision": approval.report_revision, "report_sha256": approval.report_sha256,
            "accepted": proof, "sources": (await asyncio.to_thread(source_pins)).model_dump(mode="json"),
            "language_review_mode": language_mode.mode(),
            "site_context_sha256": current["expectedSiteHash"],
            "page_snapshot_sha256": digest(sorted(current["pages"], key=lambda p: p["pageId"])),
            "required_page_ids": sorted(required)}))
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_foundation_source") from None
    await guard()
    await observed.owned(session, creation.id) if observed else await owned(tx, session, creation.id)
    await tx.refresh(creation)
    if (creation.current_revision != expected.accepted.accepted_revision
            or creation.status in ACTIVE or creation.active_job_id or await archived(tx, creation)):
        raise ControlError(409, "foundation_context_stale")
    if not await tx.scalar(select(User.id).where(User.id == session.user_id, User.enabled)):
        raise ControlError(401, "unauthenticated")
    if await asyncio.to_thread(source_pins) != expected.sources or language_mode.mode() != expected.language_review_mode:
        raise ControlError(503, "source_unavailable")
    return expected


async def verify(tx, scope):
    """Recheck current ownership and every native/source pin; grants no new authority."""
    expected = checked(scope)
    session = await tx.scalar(select(Session).where(Session.id == str(expected.session_id),
        Session.user_id == str(expected.user_id), Session.environment_id == expected.environment_id)
        .execution_options(populate_existing=True))
    if not session:
        raise ControlError(401, "unauthenticated")
    actual = await capture(tx, session, str(expected.creation_id))
    if actual != expected:
        raise ControlError(409, "foundation_context_stale")


def parse_observation(value, scope):
    expected = checked(scope)
    try:
        result = Observation.model_validate_json(json.dumps(value))
        if (result.scope_sha256 != expected.fingerprint() or result.sources != expected.sources
                or result.site_context_sha256 != expected.site_context_sha256
                or result.page_snapshot_sha256 != expected.page_snapshot_sha256
                or result.required_page_ids != expected.required_page_ids
                or result.synthetic != (expected.environment_id.startswith("test-")
                    or expected.accepted.canonical_host.endswith((".example", ".test", ".invalid", ".localhost")))):
            raise ValueError("expected_scope_required")
        return result
    except (ValueError, TypeError, ValidationError):
        raise ControlError(503, "invalid_foundation_evidence") from None


async def observe(scope, *, command="candidate", still_authorized):
    """Call outside the caller's DB transaction, then final verify before persistence."""
    expected = checked(scope)
    if command not in {"candidate", "verify-local"}:
        raise ControlError(400, "invalid_request")
    await guard()
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    try:
        node, _, artifacts, environment = studio.configuration()
    except RunnerError:
        raise ControlError(503, "foundation_bridge_unavailable") from None
    directory = artifacts / "customer-content" / str(expected.creation_id) / f"revision-{expected.accepted.accepted_revision}"
    payload = {"command": command, "scope": expected.model_dump(mode="json"),
        "creationId": str(expected.creation_id), "acceptedRevision": expected.accepted.accepted_revision,
        "sourceHash": expected.accepted.candidate_sha256, "canonicalHost": expected.accepted.canonical_host,
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    try:
        value = await studio._execute([node, SCRIPT], payload, environment, still_authorized, 180)
    except RunnerError as error:
        if error.code == "authorization_revoked":
            raise ControlError(401, "unauthenticated") from None
        if error.code in {"foundation_source_unavailable", "foundation_source_stale"}:
            raise ControlError(503, "source_unavailable") from None
        raise ControlError(503, "foundation_bridge_unavailable") from None
    result = parse_observation(value, expected)
    await guard()
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    if not await still_authorized():
        raise ControlError(401, "unauthenticated")
    return result


def parse_prepared_preview(value, scope):
    expected = checked(scope)
    try:
        result = PreparedPreview.model_validate_json(json.dumps(value))
        if (result.scope_sha256 != expected.fingerprint() or result.sources != expected.sources
                or result.site_context_sha256 != expected.site_context_sha256
                or result.page_snapshot_sha256 != expected.page_snapshot_sha256
                or result.required_page_ids != expected.required_page_ids
                or result.synthetic != (expected.environment_id.startswith("test-")
                    or expected.accepted.canonical_host.endswith((".example", ".test", ".invalid", ".localhost")))):
            raise ValueError("expected_scope_required")
        return result
    except (ValueError, TypeError, ValidationError):
        raise ControlError(503, "invalid_prepared_preview") from None


async def prepare_preview(scope, *, still_authorized):
    """Prepare only. Caller captures a real Session scope and freshly verifies it.

    Reuse receipts.check's token-scope capture/verify callback. No authority is
    inferred from a proof, and this operation neither serves nor certifies it.
    """
    expected = checked(scope)
    await guard()
    if not await still_authorized():
        raise ControlError(401, "unauthenticated")
    if (expected.environment_id != settings().environment
            or language_mode.mode() != expected.language_review_mode):
        raise ControlError(409, "foundation_context_stale")
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    try:
        node, _, artifacts, environment = studio.configuration()
        directory = artifacts / "customer-content" / str(expected.creation_id) / f"revision-{expected.accepted.accepted_revision}"
        payload = {"command": "prepare-preview", "scope": expected.model_dump(mode="json"),
            "creationId": str(expected.creation_id), "acceptedRevision": expected.accepted.accepted_revision,
            "sourceHash": expected.accepted.candidate_sha256, "canonicalHost": expected.accepted.canonical_host,
            "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
        value = await studio._execute([node, SCRIPT], payload, environment, still_authorized, 180)
    except RunnerError as error:
        if error.code == "authorization_revoked":
            raise ControlError(401, "unauthenticated") from None
        if error.code in {"foundation_source_unavailable", "foundation_source_stale"}:
            raise ControlError(503, "source_unavailable") from None
        if error.code in {"foundation_preview_content_blocked", "foundation_context_stale"}:
            raise ControlError(409, error.code) from None
        raise ControlError(503, "foundation_bridge_unavailable") from None
    result = parse_prepared_preview(value, expected)
    await guard()
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    if (expected.environment_id != settings().environment
            or language_mode.mode() != expected.language_review_mode):
        raise ControlError(409, "foundation_context_stale")
    if not await still_authorized():
        raise ControlError(401, "unauthenticated")
    return result


async def check_retained(scope, observation, *, still_authorized):
    """Read-only retained bytes/current pins; no HTTP, export, rewrite or admission."""
    expected = checked(scope)
    value = observation.model_dump(mode="json") if isinstance(observation, Observation) else observation
    recorded = parse_observation(value, expected)
    if recorded.state != "verified-local":
        raise ControlError(409, "foundation_evidence_unverified")
    await guard()
    if (expected.environment_id != settings().environment
            or language_mode.mode() != expected.language_review_mode):
        raise ControlError(409, "foundation_context_stale")
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    try:
        node, _, artifacts, environment = studio.configuration()
    except RunnerError:
        raise ControlError(503, "foundation_bridge_unavailable") from None
    directory = artifacts / "customer-content" / str(expected.creation_id) / f"revision-{expected.accepted.accepted_revision}"
    payload = {"command": "check-retained", "scope": expected.model_dump(mode="json"),
        "observation": recorded.model_dump(mode="json"), "creationId": str(expected.creation_id),
        "acceptedRevision": expected.accepted.accepted_revision, "sourceHash": expected.accepted.candidate_sha256,
        "canonicalHost": expected.accepted.canonical_host, "artifactsRoot": str(artifacts),
        "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    try:
        raw = await studio._execute([node, SCRIPT], payload, environment, still_authorized, 20)
        result = RetainedCheck.model_validate_json(json.dumps(raw))
        if (result.scope_sha256 != expected.fingerprint() or result.sources != expected.sources
                or result.observation_sha256 != digest(recorded.model_dump(mode="json"))
                or result.synthetic != recorded.synthetic):
            raise ValueError("retained_receipt_mismatch")
    except RunnerError as error:
        if error.code == "authorization_revoked":
            raise ControlError(401, "unauthenticated") from None
        if error.code == "foundation_invalid_evidence":
            raise ControlError(409, "invalid_foundation_evidence") from None
        if error.code in {"foundation_source_unavailable", "foundation_source_stale"}:
            raise ControlError(503, "source_unavailable") from None
        raise ControlError(503, "foundation_bridge_unavailable") from None
    except (ValueError, TypeError, ValidationError):
        raise ControlError(503, "invalid_foundation_evidence") from None
    await guard()
    if await asyncio.to_thread(source_pins) != expected.sources:
        raise ControlError(503, "source_unavailable")
    if (expected.environment_id != settings().environment
            or language_mode.mode() != expected.language_review_mode):
        raise ControlError(409, "foundation_context_stale")
    if not await still_authorized():
        raise ControlError(401, "unauthenticated")
    return result
