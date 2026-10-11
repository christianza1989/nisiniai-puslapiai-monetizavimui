"""Disabled-by-default authenticated capture-only HTTP surface."""
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError
from sqlalchemy import text

from .interfaces import CaptureHandshake, LifecycleEvent, ResolveRequest
from .ledger import AcquisitionLedger, LedgerError
from .recipient_binding import RecipientChallengeRequest, RecipientProofRequest
from .revocation import RecipientRetirement
from .transport_auth import MAX_BODY_BYTES, WebhookGrant, verify_request

OPERATIONS = {
    'resolve-invitation': ('resolve', ResolveRequest),
    'recipient-challenge': ('recipient-challenge', RecipientChallengeRequest),
    'verify-recipient': ('verify-recipient', RecipientProofRequest),
    'events': ('events', LifecycleEvent),
    'retire-recipient': ('retire-recipient', RecipientRetirement),
    'capture-handshake': ('capture', CaptureHandshake),
}


@dataclass(frozen=True)
class CaptureRuntime:
    ledger: AcquisitionLedger
    grants: dict[str, WebhookGrant]
    clock: Callable = lambda: datetime.now(UTC)

    def __post_init__(self):
        # Deliberately no production lane in this acceptance slice.
        for key_id, grant in self.grants.items():
            if key_id != grant.key_id or grant.scope.environment_class != 'test':
                raise ValueError('capture_transport_registration_required')
            if not isinstance(grant.secret, bytes) or not 32 <= len(grant.secret) <= 1024:
                raise ValueError('capture_transport_secret_invalid')
            recipients = [key for key in self.ledger.recipient_keys.values()
                          if key.scope == grant.scope and key.adapter_id == grant.adapter_id]
            if not recipients or any(key.secret == grant.secret for key in recipients):
                raise ValueError('separate_registered_recipient_key_required')


def acquisition_router(runtime: CaptureRuntime | None = None):
    router = APIRouter()

    @router.post('/integrations/acquisition/v1/sites/{site_id}/{endpoint}')
    async def callback(site_id: str, endpoint: str, request: Request):
        if runtime is None:
            return JSONResponse({'detail': 'acquisition_disabled'}, status_code=503)
        if endpoint not in OPERATIONS or request.url.query:
            return JSONResponse({'detail': 'invalid_acquisition_target'}, status_code=404)
        try:
            # Bound actual streamed bytes, including transfer-encoded bodies.
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_BODY_BYTES:
                    return JSONResponse({'detail': 'callback_body_too_large'}, status_code=413)
                chunks.append(chunk)
            raw = b''.join(chunks)
            operation, model = OPERATIONS[endpoint]
            value = model.model_validate_json(raw)
            now = runtime.clock()
            signed_headers = [name.lower() for name, _ in request.scope['headers']
                              if name.lower().startswith(b'x-acq-')]
            if len(signed_headers) != len(set(signed_headers)) or site_id != value.scope.site_id:
                raise ValueError('callback_target_or_header_mismatch')
            verify_request(runtime.grants, dict(request.headers), 'POST', request.url.path, raw,
                           int(now.timestamp()), value.scope, value.adapter_id, operation)
        except ValidationError:
            return JSONResponse({'detail': 'invalid_acquisition_payload'}, status_code=422)
        except ValueError:
            return JSONResponse({'detail': 'acquisition_auth_denied'}, status_code=401)
        try:
            if operation == 'capture':
                return Response(value.model_dump_json(), media_type='application/json',
                                headers={'Cache-Control': 'no-store'})
            reply = await runtime.ledger.execute(operation, value, raw, now)
            return Response(reply.body, status_code=reply.status, media_type='application/json',
                            headers={'Cache-Control': 'no-store'})
        except LedgerError as exc:
            return JSONResponse({'detail': exc.code}, status_code=exc.status,
                                headers={'Cache-Control': 'no-store'})

    return router


def capture_app(runtime: CaptureRuntime):
    """Separate local acceptance host; normal API remains unmodified/disabled."""
    @asynccontextmanager
    async def lifespan(app):
        async with runtime.ledger.database.registry() as tx:
            role = (await tx.execute(text(
                'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user'))).one()
            if role.rolsuper or role.rolbypassrls:
                raise RuntimeError('Acquisition capture requires a restricted RLS role')
            immutable = await tx.scalar(text(
                "SELECT NOT has_table_privilege(current_user,'acquisition_receipts','UPDATE') "
                "AND NOT has_table_privilege(current_user,'acquisition_receipts','DELETE')"))
            tables = (await tx.execute(text(
                "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relkind='r' "
                "AND relnamespace='public'::regnamespace AND relname IN "
                "('acquisition_campaigns','acquisition_invitations','acquisition_challenges','acquisition_receipts')"))).all()
            if not immutable or len(tables) != 4 or not all(enabled and forced for enabled, forced in tables):
                raise RuntimeError('Acquisition capture requires forced RLS and immutable receipt privileges')
        yield
        await runtime.ledger.database.engine.dispose()

    app = FastAPI(title='Acquisition isolated capture acceptance', lifespan=lifespan)
    app.include_router(acquisition_router(runtime))
    return app
