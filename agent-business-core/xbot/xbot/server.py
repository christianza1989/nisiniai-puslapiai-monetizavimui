import base64
import hmac
import secrets
import time

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import Field

from .config import ROOT, Config
from .contracts import JobInput, PolicyUpdate, Profile, Strict
from .service import Service
from .store import Conflict, Store


class Login(Strict):
    key: str = Field(min_length=12, max_length=200)


class ReviewInput(Strict):
    input_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    approved: bool
    reason: str = Field(min_length=5, max_length=500)


class BudgetInput(Strict):
    daily: int = Field(ge=0, le=10_000_000)
    monthly: int = Field(ge=0, le=100_000_000)


class UploadInput(Strict):
    asset_id: str = Field(max_length=120)
    alt: str = Field(min_length=5, max_length=900)


class AssetInput(Strict):
    content_base64: str = Field(min_length=1, max_length=5_333_336)
    source: str = Field(min_length=5, max_length=600)
    rights_verified: bool
    alt: str = Field(min_length=5, max_length=900)


class IntakeInput(Strict):
    interaction_id: str = Field(pattern=r"^\d{1,30}$")
    optin_evidence: str = Field(min_length=5, max_length=600)
    explicit_need: bool
    dm_requested: bool = False
    opted_out: bool = False


class CreateSite(Strict):
    site_id: str = Field(pattern=r"^[a-z][a-z0-9-]{1,63}$")
    canonical: str = Field(pattern=r"^https://[a-z0-9.-]+/?$")


def create_app(config=None, store=None, service=None):
    config = config or Config.private()
    if len(config.operator_key) < 24:
        raise ValueError("strong_operator_key_required")
    store = store or Store(config.data / "xbot.sqlite")
    service = service or Service(store, config)
    app = FastAPI(title="Pinet Xbot", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.service, app.state.store = service, store
    sessions = {}

    @app.middleware("http")
    async def bound(request, call_next):
        if request.headers.get("host", "").split(":")[0] not in {"127.0.0.1", "localhost", "testserver"}:
            return JSONResponse({"detail": "loopback_host_required"}, status_code=403)
        if request.method != "GET":
            origin = request.headers.get("origin")
            if origin and origin != f"http://{request.headers.get('host')}":
                return JSONResponse({"detail": "same_origin_required"}, status_code=403)
            limit = 5_400_000 if request.url.path.endswith("/assets") else 32_000
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > limit:
                    return JSONResponse({"detail": "request_too_large"}, status_code=413)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
        )
        return response

    async def auth(request: Request):
        bearer = request.headers.get("authorization", "")
        cookie = request.cookies.get("xbot_session", "")
        if bearer and hmac.compare_digest(bearer, f"Bearer {config.operator_key}"):
            return
        if cookie and sessions.get(cookie, 0) > time.time():
            return
        raise HTTPException(401, "operator_login_required")

    @app.exception_handler(Conflict)
    async def conflict(request, error):
        return JSONResponse({"detail": str(error)}, status_code=409)

    @app.post("/session")
    async def login(data: Login):
        if not hmac.compare_digest(data.key, config.operator_key):
            raise HTTPException(401, "invalid_operator_key")
        key = secrets.token_urlsafe(32)
        sessions[key] = time.time() + 8 * 3600
        response = JSONResponse({"authenticated": True})
        response.set_cookie("xbot_session", key, httponly=True, samesite="strict", max_age=8 * 3600)
        return response

    @app.delete("/session")
    async def logout(request: Request):
        sessions.pop(request.cookies.get("xbot_session", ""), None)
        response = Response(status_code=204)
        response.delete_cookie("xbot_session")
        return response

    @app.get("/")
    async def console():
        return FileResponse(ROOT / "public/index.html")

    @app.get("/app.js")
    async def script():
        return FileResponse(ROOT / "public/app.js", media_type="application/javascript")

    @app.get("/style.css")
    async def style():
        return FileResponse(ROOT / "public/style.css", media_type="text/css")

    @app.get("/favicon.ico")
    async def favicon():
        return Response(status_code=204)

    @app.get("/api/sites", dependencies=[Depends(auth)])
    async def sites():
        return {
            "sites": store.sites(),
            "treg_configured": bool(config.token),
            "codex_enabled": config.codex_enabled,
            "global_budget": store.budgets(),
            "mode": "local_coordinator",
            "core_inbound": "not_connected",
        }

    @app.post("/api/sites", dependencies=[Depends(auth)])
    async def create_site(data: CreateSite):
        return store.update_profile(
            Profile(**data.model_dump()).model_dump(), 0, "Operator created disabled local profile"
        )

    @app.get("/api/sites/{site}", dependencies=[Depends(auth)])
    async def dashboard(site: str):
        profile = store.profile(site)
        return {
            **profile,
            "jobs": store.jobs(site),
            "records": store.records(site),
            "spend": store.spending(site),
            "global_budget": store.budgets(),
            "worker": store.records("_coordinator", "heartbeat", 1),
            "totals": store.totals(site),
        }

    @app.put("/api/sites/{site}/policy", dependencies=[Depends(auth)])
    async def policy(site: str, data: PolicyUpdate):
        if site != data.profile.site_id:
            raise Conflict("policy_wrong_site")
        if store.profile(site)["profile"].get("source_binding") or data.profile.source_binding:
            raise Conflict("core_bound_profile_requires_maintained_backend")
        return store.update_profile(data.profile.model_dump(), data.base_revision, data.reason)

    @app.put("/api/budget", dependencies=[Depends(auth)])
    async def budget(data: BudgetInput):
        return store.budgets(data.daily, data.monthly)

    @app.post("/api/sites/{site}/jobs", dependencies=[Depends(auth)])
    async def job(site: str, data: JobInput):
        return store.enqueue(site, data.kind, data.key, data.payload, data.run_at.timestamp())

    @app.post("/api/sites/{site}/jobs/{job_id}/review", dependencies=[Depends(auth)])
    async def review(site: str, job_id: str, data: ReviewInput):
        store.review(site, job_id, data.input_hash, data.approved, data.reason)
        return {"reviewed": True}

    @app.delete("/api/sites/{site}/jobs/{job_id}", dependencies=[Depends(auth)])
    async def cancel(site: str, job_id: str):
        store.cancel(site, job_id)
        return {"cancelled": True}

    @app.post("/api/sites/{site}/jobs/{job_id}/reconcile", dependencies=[Depends(auth)])
    async def reconcile(site: str, job_id: str):
        return await service.reconcile(site, job_id)

    @app.post("/api/sites/{site}/day", dependencies=[Depends(auth)])
    async def day(site: str):
        return service.schedule_day(site)

    @app.post("/api/sites/{site}/tick", dependencies=[Depends(auth)])
    async def tick(site: str):
        return await service.run_once(site)

    @app.post("/api/sites/{site}/actor", dependencies=[Depends(auth)])
    async def actor(site: str):
        return await service.bind_actor(site)

    @app.post("/api/sites/{site}/media", dependencies=[Depends(auth)])
    async def media(site: str, data: UploadInput):
        return await service.upload(site, data.asset_id, data.alt)

    @app.post("/api/sites/{site}/assets", dependencies=[Depends(auth)])
    async def asset(site: str, data: AssetInput):
        from .assets import import_asset

        try:
            blob = base64.b64decode(data.content_base64, validate=True)
        except ValueError:
            raise Conflict("invalid_image_base64") from None
        return import_asset(store, config, site, blob, data.source, data.rights_verified, data.alt)

    @app.get("/api/sites/{site}/assets/{asset_id}", dependencies=[Depends(auth)])
    async def asset_preview(site: str, asset_id: str):
        from .assets import asset_path

        store.profile(site)
        if not any(r["key"] == asset_id for r in store.records(site, "asset", 1000)):
            raise Conflict("asset_not_found")
        return FileResponse(asset_path(config, site, asset_id))

    @app.post("/api/sites/{site}/intake", dependencies=[Depends(auth)])
    async def intake(site: str, data: IntakeInput):
        original = next((r for r in store.records(site, "inbound", 1000) if r["key"] == data.interaction_id), None)
        if not original or not original["payload"].get("call_id") or not original["payload"].get("author_id"):
            raise Conflict("actual_scoped_inbound_required")
        value = {**original["payload"], **data.model_dump(exclude={"interaction_id"})}
        # Opt-out is sticky; evidence cannot silently resurrect an opted-out person.
        value["opted_out"] = value["opted_out"] or original["payload"].get("opted_out", False)
        store.record(site, "inbound", original["key"], value)
        store.record(
            site,
            "audit",
            secrets.token_hex(16),
            {"event": "inbound_classified", "source_id": original["key"], "explicit_need": data.explicit_need},
        )
        return {"classified": True, "case_created": False}

    return app
