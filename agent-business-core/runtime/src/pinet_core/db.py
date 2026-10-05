from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from .config import settings


class Database:
    def __init__(self, url=None):
        self.engine = create_async_engine(url or settings().database_url, pool_pre_ping=True)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    @asynccontextmanager
    async def transaction(self, business_id: str, environment_id: str):
        async with self.sessions() as session, session.begin():
            await session.execute(text("SELECT set_config('pinet.business', :b, true), "
                                       "set_config('pinet.environment', :e, true)"),
                                  {"b": business_id, "e": environment_id})
            yield session

    @asynccontextmanager
    async def registry(self):
        async with self.sessions() as session, session.begin():
            yield session


db = Database()
