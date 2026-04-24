import os
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import engine, Base
from .routers import auth, business, products, sync, analytics, expenses, sales, admin

settings = get_settings()
logger = structlog.get_logger()

_SERVERLESS = os.getenv("VERCEL") or settings.app_env == "production"

# Sentry — only when DSN is configured
if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On serverless, skip create_all — use Alembic migrations instead
    if not _SERVERLESS:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    logger.info("app.startup", env=settings.app_env)
    yield
    await engine.dispose()
    logger.info("app.shutdown")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Offline-first SME Business OS API",
    docs_url="/docs" if not _SERVERLESS else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Prometheus — only in non-serverless environments ─────────────────────────
if not _SERVERLESS:
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(business.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(sync.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)
app.include_router(sales.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "version": "1.0.0"}




