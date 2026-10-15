"""Fixed GET routes under existing customer auth. No state mutation or provider path."""
from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import ControlError, authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from . import service
from .wire import Collection, Digest, DocumentEnvelope, Envelope, SelectionKind

router = APIRouter(prefix="/customer/v2/portfolios", route_class=CreationRoute,
                   dependencies=[Depends(customer_guard)])


@router.get("/{portfolio_id}/workspace/{kind}/{selection_id}/{collection}", response_model=Envelope)
async def listing(portfolio_id: str, kind: SelectionKind, selection_id: str, collection: Collection,
                  request: Request, limit: int = Query(20, ge=1, le=50),
                  cursor: str | None = Query(None, min_length=1, max_length=2048),
                  q: str = Query("", max_length=100), context=Depends(authenticated, scope="function")):
    allowed = {"limit", "cursor", "q"}
    if any(key not in allowed or len(request.query_params.getlist(key)) != 1 for key in request.query_params):
        raise ControlError(400, "invalid_request")
    tx, session = context
    data = await service.read(tx, session, portfolio_id, kind, selection_id, collection,
                              limit=limit, cursor=cursor, query=q)
    result = core_envelope(request, data)
    result["contract_version"] = "workspace-read.v1"
    return result


@router.get("/{portfolio_id}/workspace/{kind}/{selection_id}/results/{result_kind}/{result_id}",
            response_model=DocumentEnvelope)
async def document(portfolio_id: str, kind: SelectionKind, selection_id: str, result_kind: str,
                   result_id: str, request: Request, revision: int = Query(..., ge=1, le=2147483647),
                   sha256: Digest = Query(...), context=Depends(authenticated, scope="function")):
    allowed = {"revision", "sha256"}
    if any(key not in allowed or len(request.query_params.getlist(key)) != 1 for key in request.query_params):
        raise ControlError(400, "invalid_request")
    tx, session = context
    data = await service.document(tx, session, portfolio_id, kind, selection_id, result_kind,
                                  result_id, revision=revision, sha256=sha256)
    result = core_envelope(request, data)
    result["contract_version"] = "workspace-read.v1"
    return result
