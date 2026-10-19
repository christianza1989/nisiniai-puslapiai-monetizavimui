import hashlib
import json
import re

from fastapi import APIRouter, Depends, Request
from pydantic import ValidationError
from sqlalchemy import select, text

from ..config import settings
from ..control.routes import ControlError, SafeRoute, local_guard, scope
from ..control.routes import envelope as core_envelope
from .models import Project
from .projection import project_view


def public_guard(request: Request):
    local_guard(request)
    if not settings().public_projects_enabled or settings().control_mode != "local" or settings().environment == "production":
        raise ControlError(403, "public_projects_unavailable")


router = APIRouter(prefix="/public/v1/projects", route_class=SafeRoute, dependencies=[Depends(public_guard)])


def envelope(request, data):
    result = core_envelope(request, data)
    result["contract_version"] = "public_portfolio.v1"
    return result


async def rows(slug=None):
    async with scope() as tx:
        await tx.execute(text("SELECT set_config('pinet.public_read', 'yes', true)"))
        query = select(Project).order_by(Project.slug)
        if slug:
            query = query.where(Project.slug == slug)
        # Never silently return a truncated catalogue; the publishing helper enforces the bounded scope too.
        items = list(await tx.scalars(query.limit(101)))
        if len(items) > 100:
            raise ControlError(503, "public_inventory_limit")
        try:
            return [project_view(i) for i in items]
        except (ValueError, ValidationError):
            raise ControlError(503, "invalid_public_source") from None


@router.get("")
async def listing(request: Request):
    items = await rows()
    snapshot = hashlib.sha256(json.dumps(items, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return envelope(request, {"items": items, "snapshot_id": snapshot})


@router.get("/{slug}")
async def detail(slug: str, request: Request):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", slug):
        raise ControlError(400, "invalid_request")
    items = await rows(slug)
    if not items:
        raise ControlError(404, "not_found")
    return envelope(request, items[0])
