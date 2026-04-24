from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..models.user import User
from ..schemas.sale import SaleOut
from ..services.sale_service import sale_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("/{business_id}/", response_model=List[SaleOut])
async def list_sales(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await sale_service.list_sales(db, business_id)


@router.get("/{business_id}/{sale_id}", response_model=SaleOut)
async def get_sale(
    business_id: str,
    sale_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await sale_service.get_sale(db, sale_id)
