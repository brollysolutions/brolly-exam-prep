from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


# create_async_engine does not open a connection eagerly (asyncpg connects
# lazily on first use), so importing this module never requires a live
# database. Attempt/result routes open their sessions on demand.
engine: AsyncEngine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

async_session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    """One database session per request; practice routes commit their atomic writes."""
    async with async_session_maker() as session:
        yield session
