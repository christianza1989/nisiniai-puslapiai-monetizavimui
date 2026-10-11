"""Authenticated current capture snapshot; browser cannot select site/env/adapter."""

from fastapi import APIRouter, Depends, Request

from ..control.routes import ControlError, SafeRoute, authenticated, envelope, identifier
from ..db import db
from .normal import read_snapshot

router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


@router.get("/businesses/{business_id}/acquisition")
async def acquisition_snapshot(
    business_id: str, request: Request, context=Depends(authenticated, scope="function")
):
    if request.url.query:
        raise ControlError(400, "invalid_request")
    _, session = context
    snapshot = await read_snapshot(
        request.app, db, business_id=identifier(business_id), user_id=session.user_id, session_id=session.id
    )
    return envelope(request, snapshot.model_dump(mode="json"))
