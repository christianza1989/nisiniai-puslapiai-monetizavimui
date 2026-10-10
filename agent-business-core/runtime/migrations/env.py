import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.config import settings
from pinet_core.control import models as control_models  # noqa: F401
from pinet_core.facebook import models as facebook_models  # noqa: F401
from pinet_core.models import Base


def run(connection):
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def online():
    engine = create_async_engine(settings().admin_database_url)
    async with engine.connect() as connection:
        await connection.run_sync(run)
    await engine.dispose()


asyncio.run(online())
