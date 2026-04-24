from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..models.user import User
from ..schemas.product import ProductCreate, ProductUpdate, ProductOut
from ..services.product_service import product_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/{business_id}", response_model=List[ProductOut])
async def list_products(
    business_id: str,
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.list_products(db, business_id, q)

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.create_product(db, body)

@router.patch("/{product_id}/", response_model=ProductOut)
async def update(
    product_id: str,
    body: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.update_product(db, product_id, body)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product(db, product_id)
