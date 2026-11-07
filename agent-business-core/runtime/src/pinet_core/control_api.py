"""Bounded control/customer/public API with no legacy workers or channel surfaces."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from .control.routes import router as control_router
from .customer.routes import router as customer_router
from .db import db
from .public_projects.routes import router as public_projects_router


@asynccontextmanager
async def lifespan(app):
    try:
        async with db.registry() as tx:
            role = (await tx.execute(text(
                "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"
            ))).one()
            if role.rolsuper or role.rolbypassrls:
                raise RuntimeError("Application must use a restricted RLS role")
        yield
    finally:
        await db.engine.dispose()


app = FastAPI(title="Pinet account control", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(control_router)
app.include_router(customer_router)
app.include_router(public_projects_router)
