from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..models.user import User
from ..schemas.business import BusinessCreate, BusinessUpdate, BusinessOut
from ..services.business_service import business_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/businesses", tags=["businesses"])

@router.post("/", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await business_service.create_business(db, body, current_user.id)

@router.get("/", response_model=List[BusinessOut])
async def list_businesses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await business_service.get_user_businesses(db, current_user.id)

@router.get("/{business_id}", response_model=BusinessOut)
async def get(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await business_service.get_business(db, business_id, current_user.id)

@router.patch("/{business_id}/", response_model=BusinessOut)
async def update(
    business_id: str,
    body: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await business_service.update_business(db, business_id, body, current_user.id)
