from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from ..models.sale import Sale


class SaleService:
    async def list_sales(
        self, db: AsyncSession, business_id: str, limit: int = 100
    ) -> list[Sale]:
        q = (
            select(Sale)
            .where(Sale.business_id == business_id)
            .order_by(desc(Sale.created_at))
            .limit(limit)
            .options(selectinload(Sale.items))
        )
        return list((await db.execute(q)).scalars().all())

    async def get_sale(self, db: AsyncSession, sale_id: str) -> Sale:
        q = (
            select(Sale)
            .where(Sale.id == sale_id)
            .options(selectinload(Sale.items))
        )
        result = await db.execute(q)
        sale = result.scalar_one_or_none()
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        return sale


sale_service = SaleService()
