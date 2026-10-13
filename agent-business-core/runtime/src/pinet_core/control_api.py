"""Minimal control/account API. New customer/public features are opt-in local-only."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from .acquisition.control_routes import router as acquisition_control_router
from .acquisition.routes import acquisition_router
from .acquisition.task_routes import router as acquisition_task_router
from .acquisition.work_routes import owner_router as acquisition_work_owner_router
from .acquisition.work_routes import router as acquisition_work_router
from .agent_preparation.routes import router as agent_preparation_router
from .business_discovery.routes import router as business_discovery_router
from .content_completion.routes import router as content_completion_router
from .content_work.routes import router as content_work_router
from .control.routes import router as control_router
from .creation.routes import router as creation_router
from .creation_registration.routes import router as creation_registration_router
from .customer.routes import router as customer_router
from .customer_agents.routes import router as customer_agents_router
from .customer_profile.routes import router as customer_profile_router
from .customer_text.routes import router as customer_text_router
from .db import db
from .director.routes import router as director_read_router
from .public_projects.routes import router as public_router
from .tasks.operations import router as operations_router
from .tasks.routes import router as task_router
from .workspace_read.routes import router as workspace_read_router
from .workspace_topics.routes import router as workspace_topics_router
from .xbot_bridge.routes import router as xbot_bridge_router


@asynccontextmanager
async def lifespan(app):
    async with db.registry() as tx:
        role = (
            await tx.execute(text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"))
        ).one()
        if role.rolsuper or role.rolbypassrls:
            raise RuntimeError("Application must use a restricted RLS role")
    from .acquisition import normal as acquisition_normal

    await acquisition_normal.start(app, db)
    from .acquisition import work_config as acquisition_work

    await acquisition_work.start(app, db)
    from .director import read as director_read

    await director_read.start(app, db)
    try:
        yield
    finally:
        await db.engine.dispose()


app = FastAPI(title="Pinet owner control", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(control_router)
app.include_router(acquisition_control_router)
app.include_router(acquisition_router())
app.include_router(acquisition_work_router)
app.include_router(acquisition_work_owner_router)
app.include_router(acquisition_task_router)
app.include_router(task_router)
app.include_router(operations_router)
app.include_router(director_read_router)
app.include_router(customer_router)
app.include_router(workspace_read_router)
app.include_router(workspace_topics_router)
app.include_router(customer_agents_router)
app.include_router(xbot_bridge_router)
app.include_router(creation_router)
app.include_router(business_discovery_router)
app.include_router(creation_registration_router)
app.include_router(customer_profile_router)
app.include_router(customer_text_router)
app.include_router(content_work_router)
app.include_router(content_completion_router)
app.include_router(agent_preparation_router)
app.include_router(public_router)
