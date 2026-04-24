from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..models.user import User
from ..schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from ..services.expense_service import expense_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/{business_id}/", response_model=List[ExpenseOut])
async def list_expenses(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await expense_service.list_expenses(db, business_id)


@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    body: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await expense_service.create_expense(db, body)


@router.patch("/{expense_id}/", response_model=ExpenseOut)
async def update_expense(
    expense_id: str,
    body: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await expense_service.update_expense(db, expense_id, body)


@router.delete("/{expense_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await expense_service.delete_expense(db, expense_id)
