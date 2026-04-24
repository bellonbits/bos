import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from ..models.product import Product
from ..models.business import Business
from ..schemas.product import ProductCreate, ProductUpdate

class ProductService:
    @staticmethod
    def get_now_ms():
        return int(datetime.now(timezone.utc).timestamp() * 1000)

    async def list_products(self, db: AsyncSession, business_id: str, q: str | None = None) -> list[Product]:
        query = select(Product).where(Product.business_id == business_id, Product.is_active == True)
        if q:
            query = query.where(Product.name.ilike(f"%{q}%"))
        result = await db.execute(query.order_by(Product.name))
        return list(result.scalars().all())

    async def create_product(self, db: AsyncSession, data: ProductCreate) -> Product:
        # Enforce 50 limit for Free Tier
        business_res = await db.execute(select(Business).where(Business.id == data.business_id))
        business = business_res.scalar_one_or_none()
        
        if business and business.subscription_tier == "free":
            count_res = await db.execute(select(func.count()).select_from(Product).where(Product.business_id == data.business_id, Product.is_active == True))
            product_count = count_res.scalar() or 0
            if product_count >= 50:
                raise HTTPException(status_code=403, detail="Free tier is limited to 50 products. Please upgrade to Standard for unlimited products.")

        product = Product(
            id=str(uuid.uuid4()),
            **data.model_dump(),
            created_at=self.get_now_ms(),
            updated_at=self.get_now_ms(),
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return product

    async def get_product(self, db: AsyncSession, product_id: str) -> Product:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def update_product(self, db: AsyncSession, product_id: str, data: ProductUpdate) -> Product:
        product = await self.get_product(db, product_id)
        
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
            
        product.updated_at = self.get_now_ms()
        await db.commit()
        await db.refresh(product)
        return product

    async def delete_product(self, db: AsyncSession, product_id: str) -> None:
        product = await self.get_product(db, product_id)
        product.is_active = False
        product.updated_at = self.get_now_ms()
        await db.commit()

product_service = ProductService()
