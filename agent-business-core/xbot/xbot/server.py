import hmac
import secrets
import time

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import Field

from .config import ROOT, Config
from .contracts import JobInput, PolicyUpdate, Strict
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
            # Starlette buffers and reuses this bounded request body for the downstream handler.
            if len(await request.body()) > 32_000:
                return JSONResponse({"detail": "request_too_large"}, status_code=413)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
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

    @app.get("/api/sites", dependencies=[Depends(auth)])
    async def sites():
        return {"sites": store.sites(), "treg_configured": bool(config.token), "codex_enabled": config.codex_enabled,
                "global_budget": store.budgets(), "mode": "local_coordinator",
                "core_inbound": "not_connected"}

    @app.get("/api/sites/{site}", dependencies=[Depends(auth)])
    async def dashboard(site: str):
        profile = store.profile(site)
        return {**profile, "jobs": store.jobs(site), "records": store.records(site),
                "spend": store.spending(site), "global_budget": store.budgets(),
                "worker": store.records("_coordinator", "heartbeat", 1), "totals": store.totals(site)}

    @app.put("/api/sites/{site}/policy", dependencies=[Depends(auth)])
    async def policy(site: str, data: PolicyUpdate):
        if site != data.profile.site_id:
            raise Conflict("policy_wrong_site")
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

    return app
