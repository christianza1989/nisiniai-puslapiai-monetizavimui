from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from sqlalchemy import select, text

from . import (
    calibration,
    knowledge,
    knowledge_index,
    lead_import,
    memory,
    onboarding,
    policy,
    routing,
    service,
)
from .config import settings
from .contracts import (
    Candidate,
    ContactInput,
    Knowledge,
    KnowledgeRevocation,
    PolicyUpdate,
    RoutingUpdate,
    Start,
    Strict,
    ToolCall,
    UsageReceipt,
    WorkerEvent,
)
from .control.routes import router as control_router
from .creation.routes import router as creation_router
from .customer.routes import router as customer_router
from .db import db
from .facebook.routes import router as facebook_router
from .models import Artifact, CostReservation, Event, PolicyRevision, new_id, utcnow
from .order_tests import Confirmation, QuoteInput
from .public_projects.routes import router as public_router
from .security import digest, operator_auth, signed_edge, worker_auth
from .tasks.operations import router as operations_router
from .tasks.routes import router as task_router


@asynccontextmanager
async def lifespan(app):
    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        if role.rolsuper or role.rolbypassrls:
            raise RuntimeError("Application must use a restricted RLS role")
    routing.active = routing.Coordinator(settings())
    try:
        yield
    finally:
        await routing.active.close()
        routing.active = None
        await db.engine.dispose()


app = FastAPI(title="Pinet business core", lifespan=lifespan)
app.include_router(facebook_router)
app.include_router(control_router)
app.include_router(task_router)
app.include_router(operations_router)
app.include_router(customer_router)
app.include_router(creation_router)
app.include_router(public_router)


@app.post("/operator/sites/{site_id}/order-tests", dependencies=[Depends(operator_auth)])
async def order_test_prepare(site_id: str, value: QuoteInput):
    from . import order_tests
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await order_tests.prepare(tx, item, value)


@app.post("/operator/sites/{site_id}/order-tests/{case_id}/confirm", dependencies=[Depends(operator_auth)])
async def order_test_confirm(site_id: str, case_id: str, value: Confirmation):
    from . import mailbox, order_tests
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        result = await order_tests.confirm(tx, item, case_id, value)
    if result.get("mail_id") and settings().environment == "local" and settings().lab_mail_enabled:
        result["mail_delivery"] = await mailbox.send_test(item.id, result["mail_id"])
    return result


@app.get("/operator/mail-ui", response_class=HTMLResponse)
async def mail_ui():
    # Static login shell contains no mailbox data or credentials.
    return (Path(__file__).parent / "mail_console.html").read_text(encoding="utf-8")


@app.get("/operator/mail/sites", dependencies=[Depends(operator_auth)])
async def mail_sites():
    from .models import Business
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business).order_by(Business.site_id)))
    return {"sites": [{"site_id": item.site_id, "canonical_host": item.canonical_host} for item in sites]}


@app.get("/operator/sites/{site_id}/mail", dependencies=[Depends(operator_auth)])
async def mail_list(site_id: str):
    from . import mailbox
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return {"messages": await mailbox.listing(tx)}


@app.post("/operator/sites/{site_id}/mail", dependencies=[Depends(operator_auth)])
async def mail_prepare(site_id: str, request: Request):
    from pydantic import ValidationError

    from . import mailbox
    try:
        value = mailbox.DraftInput.model_validate(await request.json())
    except (ValueError, ValidationError):
        raise HTTPException(422, "invalid_mail_draft") from None
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return mailbox.public(await mailbox.prepare(tx, item, value), detail=True)


@app.get("/operator/sites/{site_id}/mail/{message_id}", dependencies=[Depends(operator_auth)])
async def mail_detail(site_id: str, message_id: str):
    from . import mailbox
    from .models import MailMessage
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        message = await tx.get(MailMessage, message_id)
        if not message:
            raise HTTPException(404, "mail_unavailable")
        return mailbox.public(message, detail=True)


@app.post("/operator/sites/{site_id}/mail/{message_id}/send-test", dependencies=[Depends(operator_auth)])
async def mail_send_test(site_id: str, message_id: str):
    from . import mailbox
    return await mailbox.send_test((await service.business(site_id)).id, message_id)


@app.get('/operator/sites/{site_id}/mail/{message_id}/attachments/{index}', dependencies=[Depends(operator_auth)])
async def mail_attachment(site_id: str, message_id: str, index: int):
    from .attachments import pdf_bytes
    from .models import MailMessage
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        message = await tx.get(MailMessage, message_id)
        entries = message.payload.get('attachments', []) if message else []
        if index < 0 or index >= len(entries):
            raise HTTPException(404, 'attachment_unavailable')
        try:
            content = pdf_bytes(entries[index])
        except (KeyError, ValueError):
            raise HTTPException(404, 'attachment_unavailable') from None
    return Response(content, media_type='application/pdf', headers={
        'Content-Disposition': 'attachment; filename="saskaita.pdf"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@app.post("/operator/mail/sync", dependencies=[Depends(operator_auth)])
async def mail_sync():
    from .mail_reader import sync_replies
    try:
        return await sync_replies()
    except Exception:
        raise HTTPException(503, "mail_sync_unavailable") from None


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > 220000:
                return await JSONResponse({"detail": "request too large"}, status_code=413)(scope, receive, send)
            chunks.append(message.get("body", b""))
            if not message.get("more_body"):
                break
        first = True

        async def bounded_receive():
            nonlocal first
            if first:
                first = False
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()
        await self.app(scope, bounded_receive, send)


app.add_middleware(BodyLimit)


@app.middleware("http")
async def private_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health")
async def health():
    async with db.registry() as tx:
        await tx.execute(text("SELECT 1"))
    return {"status": "ok", "environment": settings().environment, "voice_ready": settings().voice_ready}


@app.post("/v1/sites/{site_id}/lead-import", dependencies=[Depends(signed_edge)])
async def import_leads(site_id: str, data: lead_import.Batch):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await lead_import.ingest(tx, item, data)


@app.get("/v1/sites/{site_id}/lead-import", dependencies=[Depends(signed_edge)])
async def source_checkpoint(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await lead_import.checkpoint(tx)


def session_token(request):
    value = request.headers.get("x-pinet-session", "")
    if not 30 <= len(value) <= 100:
        raise HTTPException(401, "session required")
    return value


@app.post("/v1/sites/{site_id}/sessions", dependencies=[Depends(signed_edge)])
async def start_session(site_id: str, data: Start):
    result = await service.start(await service.business(site_id), data)
    # Access is minted only for this room and this anonymous visitor. No admin grant.
    from livekit import api
    cfg = settings()
    room = f"pinet-{result['conversation_id']}"
    token = (api.AccessToken(cfg.livekit_api_key, cfg.livekit_api_secret)
             .with_identity(f"visitor-{result['conversation_id']}")
             .with_ttl(timedelta(seconds=cfg.session_seconds))
             .with_grants(api.VideoGrants(room_join=True, room=room, can_publish=True,
                                         can_subscribe=True, can_publish_data=False)).to_jwt())
    try:
        async with api.LiveKitAPI(cfg.livekit_url, cfg.livekit_api_key, cfg.livekit_api_secret) as lk:
            await lk.agent_dispatch.create_dispatch(api.CreateAgentDispatchRequest(
                room=room, agent_name="pinet-consultant", metadata=f"{site_id}:{result['conversation_id']}"))
    except Exception:
        item = await service.business(site_id)
        async with db.transaction(item.id, cfg.environment) as tx:
            convo = await service.conversation(tx, result["conversation_id"])
            await service.finalize(tx, convo)
        raise HTTPException(503, "media_unavailable") from None
    return {**result, "livekit_url": cfg.livekit_url, "room_token": token}


@app.get("/v1/sites/{site_id}/memory", dependencies=[Depends(signed_edge)])
async def memory_status(site_id: str, request: Request):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        visitor = await memory.resolve(tx, request.headers.get("x-pinet-memory", ""))
        return {"remembered": visitor is not None, "retention_days": settings().retention_days}


@app.delete("/v1/sites/{site_id}/memory", dependencies=[Depends(signed_edge)])
async def forget_device(site_id: str, request: Request):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        return await memory.forget(tx, request.headers.get("x-pinet-memory", ""))


@app.get("/v1/sites/{site_id}/sessions/{cid}", dependencies=[Depends(signed_edge)])
async def status(site_id: str, cid: str, request: Request):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid, session_token(request))
        return await service.public_status(tx, convo)


@app.post("/v1/sites/{site_id}/sessions/{cid}/contact", dependencies=[Depends(signed_edge)])
async def contact(site_id: str, cid: str, request: Request, data: ContactInput):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": f"contact:{cid}"})
        convo = await service.conversation(tx, cid, session_token(request))
        return await service.submit_contact(tx, convo, data)


@app.post("/v1/sites/{site_id}/sessions/{cid}/end", dependencies=[Depends(signed_edge)])
async def end(site_id: str, cid: str, request: Request):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid, session_token(request))
        await service.finalize(tx, convo)
    return {"state": "finalized"}


@app.post("/v1/sites/{site_id}/sessions/{cid}/knowledge", dependencies=[Depends(signed_edge)])
async def refresh_knowledge(site_id: str, cid: str, request: Request, data: Knowledge):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        await service.conversation(tx, cid, session_token(request))
        return await knowledge.register(tx, item, data)


@app.get("/operator/sites/{site_id}/knowledge", dependencies=[Depends(operator_auth)])
async def knowledge_status(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        state = await knowledge.current(tx)
        return {"revision": state.revision if state else 0, "refreshed_at": state.refreshed_at.isoformat() if state else None,
                "revoked": state.payload["revoked"] if state else [],
                "revocation_history": state.payload.get("revocation_history", []) if state else []}


@app.post('/internal/sites/{site_id}/knowledge/v2/begin', dependencies=[Depends(worker_auth)])
async def begin_index(site_id: str, data: knowledge_index.Begin):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        return await knowledge_index.begin(tx, item, data)


@app.post('/internal/sites/{site_id}/knowledge/v2/batch', dependencies=[Depends(worker_auth)])
async def index_batch(site_id: str, data: knowledge_index.Batch):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        return await knowledge_index.batch(tx, item, data)


@app.post('/internal/sites/{site_id}/knowledge/v2/commit', dependencies=[Depends(worker_auth)])
async def commit_index(site_id: str, data: knowledge_index.Commit):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        return await knowledge_index.commit(tx, item, data)


@app.post('/operator/sites/{site_id}/knowledge/v2/revoke', dependencies=[Depends(operator_auth)])
async def revoke_index(site_id: str, data: knowledge_index.Revocation):
    import re
    if any(not re.fullmatch(r'[a-f0-9]{64}', value) for value in data.revision_hashes):
        raise HTTPException(422, 'invalid_revision_hash')
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment, exclusive=True)
        return await knowledge.revoke(tx, data)


@app.get('/operator/sites/{site_id}/onboarding', dependencies=[Depends(operator_auth)])
async def onboarding_status(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await onboarding.status(tx, site_id)


@app.put('/operator/sites/{site_id}/onboarding', dependencies=[Depends(operator_auth)])
async def onboarding_update(site_id: str, data: onboarding.Readiness):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment, exclusive=True)
        return await onboarding.update(tx, item, data)


@app.post("/operator/sites/{site_id}/knowledge/revoke", dependencies=[Depends(operator_auth)])
async def revoke_knowledge(site_id: str, data: KnowledgeRevocation):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment, exclusive=True)
        return await knowledge.revoke(tx, data)


class UIAck(Strict):
    request_id: str
    state: str


@app.post("/v1/sites/{site_id}/sessions/{cid}/ui", dependencies=[Depends(signed_edge)])
async def ui_ack(site_id: str, cid: str, request: Request, data: UIAck):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid, session_token(request))
        payload = dict(convo.payload)
        ui = payload.get("ui")
        if not ui or ui["id"] != data.request_id or data.state not in {"shown", "dismissed"}:
            raise HTTPException(409, "UI request conflict")
        if ui["state"] == "dismissed" and data.state == "shown":
            raise HTTPException(409, "UI request already dismissed")
        payload["ui"] = {**ui, "state": data.state}
        convo.payload = payload
        await service.add_event(tx, convo, f'ui:{data.request_id}:{data.state}', 'ui_ack',
            {'request_id': data.request_id, 'state': data.state})
    return {"state": data.state}


@app.post("/internal/sites/{site_id}/simulation", dependencies=[Depends(worker_auth)])
async def simulation(site_id: str, data: Start):
    if not settings().allow_simulation or data.mode != "simulation":
        raise HTTPException(403, "local simulation only")
    return await service.start(await service.business(site_id), data, simulation=True)


class Owner(Strict):
    owner: str


@app.post("/internal/sites/{site_id}/sessions/{cid}/claim", dependencies=[Depends(worker_auth)])
async def claim(site_id: str, cid: str, data: Owner):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        convo = await service.conversation(tx, cid)
        authority, revision = await policy.require(tx, simulation=convo.payload["test"])
        if convo.state == "finalized":
            raise HTTPException(409, "finalized")
        if convo.lease_until and convo.lease_until > utcnow() and convo.owner != data.owner:
            raise HTTPException(409, "owner already active")
        if convo.owner != data.owner or not convo.lease_until or convo.lease_until <= utcnow():
            convo.epoch += 1
        convo.owner, convo.lease_until = data.owner, utcnow() + timedelta(seconds=120)
        convo.state = "active"
        return {"epoch": convo.epoch, "prompt": convo.payload["prompt"], "model": convo.payload["model"],
                'release_hash': convo.payload['release_hash'],
                "need_revision": convo.need_revision, "need": convo.payload["need"],
                "policy_revision": revision, "allowed_tools": authority.allowed_tools,
                "cost_ceiling_microusd": convo.payload.get("cost_ceiling_microusd", 0),
                "memory": await memory.recall(tx, convo)}


@app.post("/internal/sites/{site_id}/sessions/{cid}/events", dependencies=[Depends(worker_auth)])
async def event(site_id: str, cid: str, data: WorkerEvent):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid, epoch=data.epoch)
        if convo.state == "finalized":
            raise HTTPException(409, "finalized")
        saved = await service.add_event(tx, convo, data.event_key, data.kind, {"text": data.text})
        if data.kind == "coverage_gap":
            convo.payload = {**convo.payload, "coverage": "incomplete"}
        result = {"event_id": saved.id, "sequence": saved.sequence}
    if data.kind == 'client_transcript' and routing.active:
        routing.active.launch(item.id, settings().environment, cid, saved.id)
    return result


@app.post("/internal/sites/{site_id}/sessions/{cid}/tools", dependencies=[Depends(worker_auth)])
async def tools(site_id: str, cid: str, data: ToolCall):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        return await service.tool(tx, await service.conversation(tx, cid, epoch=data.epoch), data)


@app.get("/operator/sites/{site_id}/policy", dependencies=[Depends(operator_auth)])
async def get_policy(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        value, revision = await policy.read(tx)
        return {"revision": revision, "policy": value.model_dump()}


@app.get('/operator/sites/{site_id}/routing', dependencies=[Depends(operator_auth)])
async def routing_status(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        value, revision = await policy.read(tx)
    return {'revision': revision, 'enabled': value.jev_enabled,
        'configured': bool(settings().jev_api_key.get_secret_value()),
        'provider_calls_this_process': routing.active.router.calls if routing.active else 0,
        'live_voice_verified': False}


@app.put('/operator/sites/{site_id}/routing', dependencies=[Depends(operator_auth)])
async def routing_toggle(site_id: str, data: RoutingUpdate):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment, exclusive=True)
        current, _ = await policy.read(tx)
        updated = current.model_copy(update={'jev_enabled': data.enabled})
        return await policy.update(tx, item.id, settings().environment,
            PolicyUpdate(base_revision=data.base_revision, policy=updated, reason='Operator changed Jev on/off'))


@app.post("/operator/sites/{site_id}/calibration/{candidate_id}/static-check", dependencies=[Depends(operator_auth)])
async def check_candidate(site_id: str, candidate_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await calibration.static_check(tx, candidate_id)


@app.put("/operator/sites/{site_id}/policy", dependencies=[Depends(operator_auth)])
async def put_policy(site_id: str, data: PolicyUpdate):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment, exclusive=True)
        return await policy.update(tx, item.id, settings().environment, data)


@app.get("/operator/sites/{site_id}/policy/history", dependencies=[Depends(operator_auth)])
async def policy_history(site_id: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        rows = (await tx.scalars(select(PolicyRevision).order_by(PolicyRevision.revision.desc()).limit(100))).all()
        return {"revisions": [{"revision": row.revision, "created_at": row.created_at.isoformat(),
                              **row.payload} for row in rows]}


@app.get("/internal/sites/{site_id}/sessions/{cid}", dependencies=[Depends(worker_auth)])
async def worker_status(site_id: str, cid: str):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.public_status(tx, await service.conversation(tx, cid))


class EndWorker(Strict):
    epoch: int
    coverage_incomplete: bool = False


@app.post("/internal/sites/{site_id}/sessions/{cid}/usage", dependencies=[Depends(worker_auth)])
async def observed_usage(site_id: str, cid: str, data: UsageReceipt):
    item = await service.business(site_id)
    cfg = settings()
    async with db.transaction(item.id, cfg.environment) as tx:
        await policy.lock(tx, item.id, cfg.environment, exclusive=True)
        await tx.execute(text("SELECT pg_advisory_xact_lock(724930)"))
        convo = await service.conversation(tx, cid)
        if data.epoch != convo.epoch:
            raise HTTPException(409, "stale voice owner")
        if convo.state != "finalized":
            await service.conversation(tx, cid, epoch=data.epoch)
        payload = data.model_dump(mode="json")
        old = await tx.scalar(select(Event).where(Event.conversation_id == cid,
            Event.event_key == f"usage:{data.report_id}"))
        if old:
            if old.payload != payload:
                raise HTTPException(409, "usage_receipt_conflict")
            return {"recorded": True, "accounting_basis": "provider_estimate", "invoice_verified": False}
        reservation = await tx.scalar(select(CostReservation).where(CostReservation.action_key == f"voice:{cid}",
            CostReservation.business_id == item.id, CostReservation.environment_id == cfg.environment).with_for_update())
        if not reservation:
            raise HTTPException(409, "cost_reservation_missing")
        if data.total_microusd < (reservation.observed_microusd or 0):
            raise HTTPException(409, "cumulative_usage_decreased")
        reservation.observed_microusd = data.total_microusd
        await service.add_event(tx, convo, f"usage:{data.report_id}", "usage_estimate", payload)
        value, revision = await policy.read(tx)
        if data.total_microusd > reservation.reserved_microusd:
            await policy.update(tx, item.id, cfg.environment, PolicyUpdate(base_revision=revision,
                policy=value.model_copy(update={"paused": True}), reason="Observed cost exceeded declared reservation ceiling"))
        return {"recorded": True, "accounting_basis": "provider_estimate", "invoice_verified": False,
                "ceiling_exceeded": data.total_microusd > reservation.reserved_microusd}


@app.post("/internal/sites/{site_id}/sessions/{cid}/end", dependencies=[Depends(worker_auth)])
async def worker_end(site_id: str, cid: str, data: EndWorker):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid)
        if data.epoch != convo.epoch:
            raise HTTPException(409, "stale voice owner")
        if data.coverage_incomplete:
            convo.payload = {**convo.payload, "coverage": "incomplete"}
        if convo.state != "finalized":
            await service.conversation(tx, cid, epoch=data.epoch)
            await service.finalize(tx, convo)
    return {"state": "finalized"}


@app.post("/internal/sites/{site_id}/sessions/{cid}/candidate", dependencies=[Depends(worker_auth)])
async def candidate(site_id: str, cid: str, data: Candidate):
    item = await service.business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await service.conversation(tx, cid)
        quality = await tx.scalar(select(Artifact).where(Artifact.id == data.issue_artifact_id,
                                                         Artifact.conversation_id == cid, Artifact.kind == "quality"))
        if not quality or data.parent_hash != convo.payload["release_hash"]:
            raise HTTPException(409, "candidate provenance conflict")
        # Candidates are inert data. No filesystem writer, promotion or evaluator grants.
        candidate_id = new_id()
        tx.add(Artifact(id=candidate_id, business_id=item.id, environment_id=settings().environment,
                        conversation_id=cid, kind=f"candidate:{candidate_id}",
                        payload={**data.model_dump(), "hash": digest(data.instruction),
                                 "state": "proposed", "protected_evaluation_required": True}))
    return {"candidate_id": candidate_id, "state": "proposed", "activated": False}
