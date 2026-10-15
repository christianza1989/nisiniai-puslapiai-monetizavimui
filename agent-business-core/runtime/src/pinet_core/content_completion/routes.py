import re

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response

from ..control.routes import ControlError, SafeRoute, authenticated, envelope
from ..creation.routes import owned
from ..customer.service import customer_guard
from .service import current_media, current_page, projection

router = APIRouter(prefix="/customer/v2/creations", route_class=SafeRoute,
                   dependencies=[Depends(customer_guard)])


@router.get("/{creation_id}/content-completion")
async def completion(creation_id: str, request: Request,
                     accepted_revision: int | None = Query(default=None, ge=1, le=20),
                     context=Depends(authenticated, scope="function")):
    pairs = list(request.query_params.multi_items())
    if len(pairs) > 1 or any(key != "accepted_revision" for key, _ in pairs):
        raise ControlError(400, "invalid_request")
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    value = envelope(request, await projection(tx, session, creation, accepted_revision))
    value["contract_version"] = "content-completion.v1"
    return value


def page_query(request, expected):
    pairs = list(request.query_params.multi_items())
    if len(pairs) != len(expected) or {key for key, _ in pairs} != set(expected):
        raise ControlError(400, "invalid_request")


@router.get("/{creation_id}/content-pages/{page_id}")
async def page_read(creation_id: str, page_id: str, request: Request,
                    accepted_revision: int = Query(ge=1, le=20), context=Depends(authenticated, scope="function")):
    page_query(request, ["accepted_revision"])
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,79}", page_id):
        raise ControlError(400, "invalid_request")
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    value = envelope(request, await current_page(tx, session, creation, accepted_revision, page_id))
    value["contract_version"] = "content-page.v1"
    return value


@router.get("/{creation_id}/content-pages/{page_id}/media/{asset_id}")
async def media_read(creation_id: str, page_id: str, asset_id: str, request: Request,
                     accepted_revision: int = Query(ge=1, le=20),
                     expected_revision_sha256: str = Query(pattern=r"^[a-f0-9]{64}$"),
                     context=Depends(authenticated, scope="function")):
    page_query(request, ["accepted_revision", "expected_revision_sha256"])
    if any(not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,79}", key) for key in (page_id, asset_id)):
        raise ControlError(400, "invalid_request")
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    mime, raw = await current_media(tx, session, creation, accepted_revision, page_id, asset_id, expected_revision_sha256)
    return Response(raw, media_type=mime, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow", "Vary": "Authorization"})
