"""Persist fixed canonical observations outside the long verifier transaction."""
import json

from sqlalchemy import select, text

from ..business_discovery.models import BuildApproval
from ..config import settings
from ..content_work.service import archived
from ..control.routes import ControlError, identifier, scope, token_hash
from ..creation.routes import owned
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..customer_text.service import customer_session
from ..models import new_id, utcnow
from . import service as builds
from .models import FoundationReceipt
from .receipt_wire import Check, FoundationView, ReceiptView


async def schema_ready(tx):
    return bool(await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_class
      WHERE oid=to_regclass('control_site_foundation_receipts') AND relrowsecurity AND relforcerowsecurity)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('control_site_foundation_receipts')
        AND conname='fk_foundation_receipt_session' AND convalidated AND confdeltype='r')
      AND (SELECT count(*)=2 FROM pg_trigger WHERE tgrelid=to_regclass('control_site_foundation_receipts')
        AND tgname IN('foundation_receipt_immutable','foundation_receipt_fence') AND tgenabled<>'D')""")))


def material(scope_value):
    """Only the observer's current login may differ from immutable Foundation pins."""
    value = scope_value.model_dump(mode="json")
    value.pop("session_id")
    return value


def stored(row):
    from . import foundation
    from .foundation_wire import FoundationScope
    try:
        expected = FoundationScope.model_validate_json(json.dumps(row.scope))
        observation = foundation.parse_observation(row.observation, expected)
        request = Check.model_validate_json(json.dumps({"accepted_revision": row.accepted_revision,
            "command": row.command, "idempotency_key": row.idempotency_key}))
        if (expected.fingerprint() != row.scope_sha256 or digest(row.observation) != row.observation_sha256
                or request_fingerprint(row.creation_id, request) != row.request_fingerprint
                or row.state != observation.state or str(expected.creation_id) != row.creation_id
                or str(expected.approval_id) != row.approval_id or str(expected.accepted.revision_id) != row.revision_id
                or str(expected.session_id) != row.session_id or expected.accepted.accepted_revision != row.accepted_revision
                or {key: str(getattr(expected, key)) for key in binding(row)} != binding(row)):
            raise ValueError("native_receipt_binding_required")
        return expected, observation
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_foundation_evidence") from None


def receipt_view(row):
    expected, observed = stored(row)
    return ReceiptView.model_validate_json(json.dumps({
        "receipt_id": row.id, "idempotency_key": row.idempotency_key, "command": row.command,
        "creation_id": row.creation_id, "accepted_revision": row.accepted_revision,
        "checked_at": (observed.completion.checked_at if observed.completion else row.created_at).isoformat(),
        "state": observed.state, "blockers": observed.blockers,
        "release_id": str(observed.release.release_id) if observed.release else None,
        "package_sha256": observed.release.package_sha256 if observed.release else None,
        "execution_source_revision": expected.sources.execution_source_revision,
        "public_source_revision": expected.sources.public_source_revision, "synthetic": observed.synthetic,
        "calibration_status": "UNVERIFIED", "channel_activation": "not_performed", "deployment": "not_performed",
    })).model_dump(mode="json")


async def latest(tx, creation):
    return await tx.scalar(select(FoundationReceipt).where(FoundationReceipt.creation_id == creation.id)
        .order_by(FoundationReceipt.created_at.desc(), FoundationReceipt.id.desc()).limit(1)
        .execution_options(populate_existing=True))


def private_local_scope(expected, creation):
    """Only S37's exact no-domain identity may satisfy local draft preparation."""
    from ..creation.private_preview import private_host
    cfg = settings()
    return (cfg.control_mode == "local" and cfg.environment == "local"
        and expected.environment_id == "local" and creation.canonical_host is None
        and str(expected.creation_id) == creation.id
        and expected.accepted.canonical_host == private_host(str(expected.creation_id)))


async def current(tx, session, creation, row):
    """Current owner and bytes; no provider/HTTP verification or permission effect."""
    from . import foundation
    expected, observation = stored(row)
    if (observation.state != "verified-local" or expected.language_review_mode != "required"
            or row.accepted_revision != creation.current_revision
            or observation.synthetic and not settings().environment.startswith("test-")
                and not private_local_scope(expected, creation)):
        return False
    actual = await foundation.capture(tx, session, creation.id)
    if material(expected) != material(actual):
        return False

    async def authorized():
        try:
            await current_actor(tx, session, creation.portfolio_id)
            await tx.refresh(creation)
            return bool(creation.current_revision == actual.accepted.accepted_revision
                and creation.status not in ACTIVE and not creation.active_job_id and not await archived(tx, creation))
        except ControlError:
            return False

    try:
        retained = await foundation.check_retained(expected, observation, still_authorized=authorized)
    except ControlError as error:
        if error.status == 409:
            return False
        raise
    if retained.state != "retained-current":
        return False
    # The file probe does not renew historical Session authority; this fresh one is fenced again.
    await foundation.verify(tx, actual)
    return True


async def ready(tx, session, creation):
    if session is None or not await schema_ready(tx):
        return False
    row = await latest(tx, creation)
    return bool(row and await current(tx, session, creation, row))


async def view(tx, session, creation):
    row = await latest(tx, creation) if await schema_ready(tx) else None
    state, blockers, accepted = "missing", [], False
    can_check = (creation.current_revision > 0 and creation.status not in ACTIVE and not creation.active_job_id
        and not await archived(tx, creation) and bool(await tx.scalar(select(BuildApproval.id)
            .where(BuildApproval.creation_id == creation.id))))
    if row:
        _, observed = stored(row)
        state, blockers = observed.state, observed.blockers
        if row.accepted_revision != creation.current_revision:
            state, blockers = "stale", ["foundation_context_stale"]
        elif observed.state == "verified-local":
            try:
                accepted = await current(tx, session, creation, row)
                if not accepted:
                    state, blockers = "stale", ["foundation_evidence_stale"]
            except ControlError as error:
                if error.status in {401, 403, 404}:
                    raise
                state, blockers = ("unavailable" if error.status == 503 else "stale"), [error.code]
    await current_actor(tx, session, creation.portfolio_id)
    return FoundationView.model_validate_json(json.dumps({
        "creation_id": creation.id, "current_revision": creation.current_revision, "observed_at": utcnow().isoformat(),
        "state": state, "foundation_status": "LOCAL_DELIVERY_CHECKS_PASS" if accepted else "UNVERIFIED",
        "agent_foundation_ready": accepted, "can_check": bool(can_check and await schema_ready(tx)),
        "latest": receipt_view(row) if row else None, "blockers": blockers,
        "calibration_status": "UNVERIFIED", "channel_activation": "not_performed", "deployment": "not_performed",
    })).model_dump(mode="json")


def request_fingerprint(creation_id, value):
    return digest({"creation_id": creation_id, **value.model_dump(mode="json")})


async def replay(tx, key, fingerprint):
    row = await tx.scalar(select(FoundationReceipt).where(FoundationReceipt.idempotency_key == key))
    if row and row.request_fingerprint != fingerprint:
        raise ControlError(409, "idempotency_conflict")
    return row


async def check(token, creation_id, value):
    """A request selects only a native revision/command; all proof and paths are server bound."""
    from . import foundation
    builds.enabled()
    identity, key = identifier(creation_id), str(value.idempotency_key)
    fingerprint = request_fingerprint(identity, value)
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, identity)
        if not await schema_ready(tx):
            raise ControlError(503, "foundation_schema_unavailable")
        old = await replay(tx, key, fingerprint)
        if old:
            result = receipt_view(old)
            await current_actor(tx, session, creation.portfolio_id)
            return result
        if value.accepted_revision != creation.current_revision:
            raise ControlError(409, "stale_revision")
        expected = await foundation.capture(tx, session, identity)

    async def authorized():
        try:
            async with scope(token=token_hash(token)) as tx:
                current_session = await customer_session(tx, token)
                if current_session.id != str(expected.session_id):
                    return False
                await foundation.verify(tx, expected)
                return True
        except ControlError:
            return False

    observed = await foundation.observe(expected, command=value.command, still_authorized=authorized)
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, identity, lock=True)
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
            {"key": f"foundation-receipt:{settings().environment}:{session.user_id}:{key}"})
        old = await replay(tx, key, fingerprint)
        if old:
            return receipt_view(old)
        if session.id != str(expected.session_id):
            raise ControlError(401, "unauthenticated")
        await foundation.verify(tx, expected)
        row = FoundationReceipt(id=new_id(), creation_id=identity, approval_id=str(expected.approval_id),
            revision_id=str(expected.accepted.revision_id), accepted_revision=expected.accepted.accepted_revision,
            session_id=session.id, idempotency_key=key, command=value.command, request_fingerprint=fingerprint,
            scope_sha256=expected.fingerprint(), observation_sha256=digest(observed.model_dump(mode="json")),
            state=observed.state, scope=expected.model_dump(mode="json"), observation=observed.model_dump(mode="json"),
            **binding(creation))
        tx.add(row)
        await tx.flush()
        await foundation.verify(tx, expected)
        return receipt_view(row)
