import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from .config import get_settings

settings = get_settings()

# Vercel / any serverless runtime — no persistent connection pool
_SERVERLESS = os.getenv("APP_ENV") in ("production", "serverless") or os.getenv("VERCEL")

# Supabase transaction pooler (PgBouncer) requirements:
# 1. SSL must be enabled but cert verification disabled (Supabase uses self-signed certs in chain)
# 2. Prepared statement cache must be disabled (PgBouncer transaction mode doesn't support them)
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE
_connect_args = {"ssl": _ssl_ctx, "statement_cache_size": 0} if _SERVERLESS else {}

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args=_connect_args,
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
