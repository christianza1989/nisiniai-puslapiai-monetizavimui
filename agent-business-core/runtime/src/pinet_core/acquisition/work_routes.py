"""Normal purpose-specific capture ingress. No draft/decision supplied by browser."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError
from sqlalchemy import func, select, text

from ..control.models import Session, User
from ..control.routes import ControlError, SafeRoute, authenticated, envelope, identifier
from ..db import db
from ..models import Business, Case
from ..tasks.service import grant_for
from .correspondence import seal
from .interfaces import Scope
from .ledger import LedgerError, apply_scope, conditions, scope_values
from .module_models import ModuleBinding
from .work_config import MAX_BODY_BYTES, clock_seconds, ready, verify_request
from .work_interfaces import InboundCapture, ThreadSummary, WorkCounts, WorkSnapshot, WorkWatermark
from .work_models import ContactPolicy, CorrespondenceThread, MailBinding, WorkReceipt

router = APIRouter()
owner_router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


@router.post("/integrations/acquisition-work/v1/sites/{site_id}/inbound-capture")
async def inbound_capture(site_id: str, request: Request):
    try:
        registration = ready(request.app)
    except ControlError:
        return JSONResponse({"detail": "acquisition_work_disabled"}, status_code=503)
    if request.url.query:
        return JSONResponse({"detail": "invalid_acquisition_work_target"}, status_code=404)
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            return JSONResponse({"detail": "callback_body_too_large"}, status_code=413)
        chunks.append(chunk)
    raw = b"".join(chunks)
    try:
        value = InboundCapture.model_validate_json(raw)
        signed = [name.lower() for name, _ in request.scope["headers"] if name.lower().startswith(b"x-acq-")]
        if len(signed) != len(set(signed)) or site_id != value.scope.site_id:
            raise ValueError()
        verify_request(registration, dict(request.headers), request.url.path, raw, clock_seconds(), value)
    except ValidationError:
        return JSONResponse({"detail": "invalid_inbound_payload"}, status_code=422)
    except ValueError:
        return JSONResponse({"detail": "inbound_auth_denied"}, status_code=401)
    try:
        receipt = await request.app.state.acquisition_correspondence.receive(value, raw)
        return Response(
            receipt.body,
            status_code=receipt.status,
            media_type="application/json",
            headers={"Cache-Control": "no-store"},
        )
    except LedgerError as exc:
        return JSONResponse(
            {"detail": exc.code}, status_code=exc.status, headers={"Cache-Control": "no-store"}
        )


async def read_snapshot(app, database, *, business_id, user_id, session_id):
    """One current owner-authorized projection for portal and future director tool.

    Counts are all-time synthetic captures, explicitly distinct from real inbox or
    outbound sends. Old CaptureLedgerSnapshot.v1 retains its missing null fields.
    """
    registration = ready(app)
    from ..config import settings

    cfg = settings()
    async with database.registry() as tx:
        await tx.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        await tx.execute(
            text(
                "SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true),set_config('pinet.business',:b,true)"
            ),
            {"e": cfg.environment, "u": user_id, "b": business_id},
        )
        observed = await tx.scalar(text("SELECT transaction_timestamp()"))
        session, user = await tx.get(Session, session_id), await tx.get(User, user_id)
        if (
            not session
            or session.user_id != user_id
            or session.revoked_at
            or session.expires_at <= observed
            or not user
            or not user.enabled
        ):
            raise ControlError(401, "unauthenticated")
        grant = await grant_for(tx, business_id, user_id)
        module, business = (
            await tx.get(ModuleBinding, (business_id, cfg.environment)),
            await tx.get(Business, business_id),
        )
        if (
            not module
            or not business
            or module.organization_id != grant.organization_id
            or module.site_id != business.site_id
            or "acquisition.correspondence.read" not in module.permissions
        ):
            raise ControlError(403, "acquisition_correspondence_read_denied")
        # Reading preserved correspondence/rights requests is a separate purpose;
        # admission stop/expiry only stops marketing work, never erases its inbox.
        scope = Scope(
            business_id=business_id,
            site_id=business.site_id,
            environment_id=cfg.environment,
            environment_class="test",
        )
        if not any(
            entry.scope == scope and entry.adapter_id == module.adapter_id for entry in registration.entries
        ):
            raise ControlError(503, "acquisition_correspondence_not_connected")
        await apply_scope(tx, scope, module.adapter_id)
        values = scope_values(scope, module.adapter_id)
        threads = list(
            await tx.scalars(
                select(CorrespondenceThread)
                .where(*conditions(CorrespondenceThread, values))
                .order_by(CorrespondenceThread.created_at.desc(), CorrespondenceThread.thread_id.desc())
                .limit(101)
            )
        )

        async def count(model, *extra):
            return await tx.scalar(
                select(func.count()).select_from(model).where(*conditions(model, values), *extra)
            )

        counts = WorkCounts(
            outbound_captured=await count(MailBinding, MailBinding.direction == "outbound"),
            inbound_captured=await count(MailBinding, MailBinding.direction == "inbound"),
            held_recipients=await count(ContactPolicy, ContactPolicy.state == "hold"),
            stopped_recipients=await count(ContactPolicy, ContactPolicy.state == "stopped"),
            operator_privacy_cases=await tx.scalar(
                select(func.count())
                .select_from(CorrespondenceThread)
                .join(
                    Case,
                    (Case.id == CorrespondenceThread.case_id)
                    & (Case.business_id == CorrespondenceThread.business_id)
                    & (Case.environment_id == CorrespondenceThread.environment_id),
                )
                .where(
                    *conditions(CorrespondenceThread, values),
                    Case.payload["privacy_request"]["status"].astext == "operator_required",
                )
            ),
        )
        receipt_count = await count(WorkReceipt)
        last = await tx.scalar(
            select(WorkReceipt)
            .where(*conditions(WorkReceipt, values))
            .order_by(
                WorkReceipt.created_at.desc(), WorkReceipt.operation.desc(), WorkReceipt.request_id.desc()
            )
            .limit(1)
        )
        watermark = WorkWatermark(
            committed_receipts=receipt_count,
            sha256=seal(
                [
                    "acquisition-work-watermark.v1",
                    values,
                    receipt_count,
                    [last.operation, last.request_id, last.body_sha256, last.created_at.isoformat()]
                    if last
                    else None,
                ]
            ),
        )
        status = (
            "stopped"
            if not module.enabled
            else "expired"
            if module.expires_at <= observed
            else "pending"
            if module.approved_at > observed
            else "source_changed"
            if module.source_revision != cfg.control_source_revision
            else "configured"
        )
        return WorkSnapshot(
            scope=scope,
            adapter_id=module.adapter_id,
            observed_at=observed,
            marketing_configuration=status,
            counts=counts,
            watermark=watermark,
            threads=tuple(
                ThreadSummary(
                    thread_id=thread.thread_id,
                    case_id=thread.case_id,
                    revision=thread.revision,
                    last_inbound_id=thread.last_inbound_id,
                )
                for thread in threads[:100]
            ),
            truncated=len(threads) > 100,
        )


@owner_router.get("/businesses/{business_id}/acquisition-correspondence")
async def correspondence_snapshot(
    business_id: str, request: Request, context=Depends(authenticated, scope="function")
):
    if request.url.query:
        raise ControlError(400, "invalid_request")
    _, session = context
    value = await read_snapshot(
        request.app, db, business_id=identifier(business_id), user_id=session.user_id, session_id=session.id
    )
    return envelope(request, value.model_dump(mode="json"))
