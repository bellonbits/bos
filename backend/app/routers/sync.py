from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..schemas.sync import SyncPushItem, SyncPushResponse, SyncPullResponse
from ..services.sync_service import sync_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/push", response_model=SyncPushResponse)
async def push(
    body: SyncPushItem,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await sync_service.push_item(db, body, current_user.id)

@router.get("/pull", response_model=SyncPullResponse)
async def pull(
    since: int = 0,
    business_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await sync_service.pull_items(db, since, business_id)
