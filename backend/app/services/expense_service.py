import time
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException

from ..models.expense import Expense
from ..schemas.expense import ExpenseCreate, ExpenseUpdate


class ExpenseService:
    async def list_expenses(
        self, db: AsyncSession, business_id: str, limit: int = 100
    ) -> list[Expense]:
        q = (
            select(Expense)
            .where(Expense.business_id == business_id)
            .order_by(desc(Expense.created_at))
            .limit(limit)
        )
        return list((await db.execute(q)).scalars().all())

    async def create_expense(self, db: AsyncSession, data: ExpenseCreate) -> Expense:
        now = int(time.time() * 1000)
        expense = Expense(
            id=str(uuid.uuid4()),
            business_id=data.business_id,
            category=data.category,
            description=data.description,
            amount=data.amount,
            receipt_url=data.receipt_url,
            created_at=now,
            updated_at=now,
        )
        db.add(expense)
        await db.commit()
        await db.refresh(expense)
        return expense

    async def update_expense(
        self, db: AsyncSession, expense_id: str, data: ExpenseUpdate
    ) -> Expense:
        result = await db.execute(select(Expense).where(Expense.id == expense_id))
        expense = result.scalar_one_or_none()
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(expense, k, v)
        expense.updated_at = int(time.time() * 1000)
        await db.commit()
        await db.refresh(expense)
        return expense

    async def delete_expense(self, db: AsyncSession, expense_id: str) -> None:
        result = await db.execute(select(Expense).where(Expense.id == expense_id))
        expense = result.scalar_one_or_none()
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        await db.delete(expense)
        await db.commit()


expense_service = ExpenseService()
