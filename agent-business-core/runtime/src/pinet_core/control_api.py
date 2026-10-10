"""Minimal control/account API. New customer/public features are opt-in local-only."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from .content_work.routes import router as content_work_router
from .control.routes import router as control_router
from .creation.routes import router as creation_router
from .customer.routes import router as customer_router
from .db import db
from .public_projects.routes import router as public_router
from .tasks.operations import router as operations_router
from .tasks.routes import router as task_router


@asynccontextmanager
async def lifespan(app):
    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        if role.rolsuper or role.rolbypassrls:
            raise RuntimeError("Application must use a restricted RLS role")
    try:
        yield
    finally:
        await db.engine.dispose()


app = FastAPI(title="Pinet owner control", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(control_router)
app.include_router(task_router)
app.include_router(operations_router)
app.include_router(customer_router)
app.include_router(creation_router)
app.include_router(content_work_router)
app.include_router(public_router)
