import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from .config import get_settings

settings = get_settings()

# Vercel / any serverless runtime — no persistent connection pool
_SERVERLESS = os.getenv("APP_ENV") in ("production", "serverless") or os.getenv("VERCEL")

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    **({"poolclass": NullPool} if _SERVERLESS else {
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
    }),
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
