"""Exact approved-plan continuation; no replacement writer, evaluator or READY claim."""
import asyncio
import hashlib
from uuid import UUID, uuid5

from sqlalchemy import select

from ..business_discovery.models import BuildApproval
from ..business_discovery.service import approved_build_context
from ..config import settings
from ..content_work import service as guides
from ..content_work.models import GuideJob
from ..content_work.wire import StartGuide
from ..control.models import Session
from ..control.routes import ControlError, scope
from ..creation.models import Job
from ..creation.renderer import normalize
from ..creation.routes import owned
from ..creation.service import ACTIVE
from ..creation_registration.service import accepted_proof
from ..customer_text.adapter import source_current
from . import approval_selectors, media

NAMESPACE = UUID("8351b9d1-9456-46a7-b7c5-88204aed6c65")


def enabled():
    cfg = settings()
    if (not cfg.site_build_enabled or not cfg.business_discovery_enabled
            or not cfg.customer_enabled or not cfg.creation_enabled or not cfg.creation_runner_enabled
            or cfg.control_mode != "local"
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise ControlError(503, "site_build_unavailable")


def request_id(creation_id, revision, page_id):
    return uuid5(NAMESPACE, f"{UUID(creation_id)}:{revision}:{page_id}:initial-guide.v1")


def initial_pages(payload, intake):
    """Order follows the canonical broad-before-support graph, not a fixed cadence."""
    draft = normalize(payload)
    mapped = intake["pageMappings"]
    paths = {entry["path"]: entry["pageId"] for entry in mapped}
    if len(paths) != len(mapped):
        raise ControlError(503, "invalid_content_source")
    output = []
    for item in draft["content_plan"]:
        if item["priority"] != "initial":
            continue
        path = item["path"]
        expected = "page-" + hashlib.sha256(path.encode()).hexdigest()[:24]
        if paths.get(path) != expected:
            raise ControlError(503, "invalid_content_source")
        output.append(expected)
    return output


def observation(creation_id, phase, state, *, code=None, job_id=None, page_id=None, completed=0, total=0):
    return {"creation_id": creation_id, "phase": phase, "state": state, "code": code,
            "job_id": job_id, "page_id": page_id, "completed_initial_guides": completed,
            "total_initial_guides": total, "foundation_status": "UNVERIFIED",
            "public_launch": "UNVERIFIED", "channel_activation": "not_performed"}


async def advance(creation_id):
    """Admit at most one actual shared GUIDE; never invoke a provider or retry a failure."""
    enabled()
    identity = str(UUID(creation_id))
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")
    async with scope() as registry:
        ready = await approval_selectors.ready(registry)
        if not ready:
            raise ControlError(503, "site_build_schema_unavailable")
        target = await approval_selectors.selected(registry, settings().environment, identity)
    if not target:
        return observation(identity, "approval", "blocked", code="build_approval_unavailable")
    async with scope(user=target["user_id"]) as tx:
        from ..creation.models import Creation
        from . import continuation
        continuing = None
        creation = await tx.get(Creation, identity)
        # A separately admitted current-source revision is the authority to produce
        # its new private draft. S6 requires that accepted proof and cannot renew a
        # failed base0 job. Historical approval/source/session rows stay unchanged.
        admitted = await tx.get(Job, creation.active_job_id, populate_existing=True) if (
            creation and creation.status in ACTIVE and creation.active_job_id) else None
        if admitted and admitted.status in ACTIVE and admitted.source_revision == settings().control_source_revision:
            from ..creation import execution_profiles as profiles
            from ..creation.service import authority, binding
            if admitted.creation_id != identity or binding(admitted) != binding(creation) or not await authority(tx, admitted):
                return observation(identity, "authority", "blocked", code="authorization_revoked")
            await profiles.ensure_current(tx, "creation", admitted)
            admitted_session = await tx.get(Session, admitted.session_id, populate_existing=True)
            creation = await owned(tx, admitted_session, identity, lock=True)
            if creation.active_job_id != admitted.id or creation.status not in ACTIVE:
                return observation(identity, "business_draft", "blocked", code="creation_job_stale")
            if await approved_build_context(tx, creation) is None:
                return observation(identity, "approval", "blocked", code="build_approval_unavailable")
            if await guides.archived(tx, creation):
                return observation(identity, "authority", "blocked", code="creation_archived")
            return observation(identity, "business_draft", admitted.status, job_id=admitted.id)
        if creation and await continuation.schema_ready(tx):
            continuing = await continuation.latest(tx, creation)
        approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == identity))
        session = (await tx.get(Session, continuing.session_id, populate_existing=True) if continuing
                   else await tx.get(Session, approval.session_id) if approval else None)
        if not approval or not session:
            return observation(identity, "authority", "blocked", code="authorization_revoked")
        creation = await owned(tx, session, identity, lock=True)
        if continuing and not await continuation.current(tx, creation, continuing):
            return observation(identity, "source", "blocked", code="build_continuation_stale")
        approved = await approved_build_context(tx, creation)
        if approved is None:
            return observation(identity, "approval", "blocked", code="build_approval_unavailable")
        if not continuing and (approved["source_revision"] != settings().control_source_revision
                or creation.source_revision != settings().control_source_revision):
            return observation(identity, "source", "blocked", code="site_build_source_stale")
        if await guides.archived(tx, creation):
            return observation(identity, "authority", "blocked", code="creation_archived")
        if creation.status in ACTIVE or creation.active_job_id:
            return observation(identity, "business_draft", creation.status, job_id=creation.active_job_id)
        if creation.status != "draft_ready" or not creation.current_revision:
            return observation(identity, "business_draft", "blocked",
                               code=creation.failure_code or "accepted_revision_missing")
        proof = await accepted_proof(tx, creation)
        if not continuing and proof["accepted_source_revision"] != settings().control_source_revision:
            return observation(identity, "source", "blocked", code="site_build_source_stale")
        revision = await guides.current_revision(tx, creation, creation.current_revision)
        import_job = await tx.get(Job, revision.job_id)
        from ..creation.private_preview import selected_intake
        _, intake = await selected_intake(tx, creation, revision, import_job)
        pages = initial_pages(revision.payload, intake)
        jobs = list(await tx.scalars(select(GuideJob).where(GuideJob.creation_id == identity,
            GuideJob.accepted_revision == creation.current_revision).order_by(GuideJob.sequence)))
        active = [job for job in jobs if job.status in ACTIVE]
        if active:
            await guides.expire(tx, active[0])
            return observation(identity, "initial_content", active[0].status,
                code=active[0].failure_code, job_id=active[0].id, page_id=active[0].page_id, total=len(pages))
        # Only a trusted, exact-case existing artifact receipt can enter this
        # path. No media inbox means no provider and no change to GUIDE policy.
        # Never mutate media while any GUIDE prepare/apply can be in flight.
        attached = await media.advance(tx, session, creation, proof)
        if attached:
            return observation(identity, "media_preparation", "updated",
                               page_id=attached["page_id"], total=len(pages))
        completed = 0
        for page_id in pages:
            matching = [job for job in jobs if job.page_id == page_id]
            if matching:
                job = matching[-1]
                if job.status != "succeeded":
                    return observation(identity, "initial_content", "blocked",
                        code=job.failure_code or job.status, job_id=job.id, page_id=page_id,
                        completed=completed, total=len(pages))
                result = await guides.projection(tx, job)
                if (not job.result or not result["output_sha256"] or result["page_observation"] is None
                        or job.source_hash != proof["candidate_sha256"]):
                    raise ControlError(503, "invalid_content_source")
                completed += 1
                continue
            value = StartGuide(accepted_revision=creation.current_revision, page_id=page_id,
                               idempotency_key=request_id(identity, creation.current_revision, page_id))
            job = await guides.admit(tx, session, creation, value)
            if not await asyncio.to_thread(source_current):
                raise ControlError(503, "source_unavailable")
            await guides.current_actor(tx, session, creation.portfolio_id)
            return observation(identity, "initial_content", job.status, job_id=job.id, page_id=page_id,
                               completed=completed, total=len(pages))
        # Actual private writes do not certify source/media/editorial/release/render/SEO.
        return observation(identity, "page_quality", "blocked", code="media_editorial_renderer_pending",
                           completed=completed, total=len(pages))
