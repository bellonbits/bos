import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from ..models.business import Business
from ..schemas.business import BusinessCreate, BusinessUpdate, BusinessOut

class BusinessService:
    @staticmethod
    def get_now_ms():
        return int(datetime.now(timezone.utc).timestamp() * 1000)

    async def create_business(self, db: AsyncSession, data: BusinessCreate, owner_id: str) -> Business:
        # Enforce Subscription Limit for Free Tier (1 Business Profile)
        # Note: All new users are 'free', so they can create 1 business.
        businesses = await self.get_user_businesses(db, owner_id)
        if len(businesses) >= 1:
            # Let's check the tier. Wait, the user's tier is bound to the individual business?
            # Our schema ties subscription_tier to Business. So for creating a *new* business,
            # we check if any existing business has standard/premium. Or we just strictly say
            # Free tier defaults on creating business. We could assume the user pays per business 
            # or per account. It's tied to Business here!
            # If they already have 1 business, we block creating a second one unless that business 
            # is upgraded. Let's make it simple: if they have any business that is "free", block it if count >= 1.
            # Usually it's tied to the user, but since the model has it on Business...
            if any(b.subscription_tier == "free" for b in businesses):
                raise HTTPException(status_code=403, detail="Free tier is limited to 1 Business Profile. Please upgrade an existing profile to create more.")

        business = Business(
            id=str(uuid.uuid4()),
            name=data.name,
            owner_id=owner_id,
            phone=data.phone,
            location=data.location,
            business_type=data.business_type,
            currency=data.currency,
            subscription_tier="free",
            is_active=True,
            created_at=self.get_now_ms(),
            updated_at=self.get_now_ms(),
        )
        db.add(business)
        await db.commit()
        await db.refresh(business)
        return business

    async def get_business(self, db: AsyncSession, business_id: str, owner_id: str) -> Business:
        result = await db.execute(
            select(Business).where(Business.id == business_id, Business.owner_id == owner_id)
        )
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        return business

    async def get_user_businesses(self, db: AsyncSession, owner_id: str) -> list[Business]:
        result = await db.execute(
            select(Business).where(Business.owner_id == owner_id, Business.is_active == True)
        )
        return list(result.scalars().all())

    async def update_business(self, db: AsyncSession, business_id: str, data: BusinessUpdate, owner_id: str) -> Business:
        business = await self.get_business(db, business_id, owner_id)
        
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(business, field, value)
            
        business.updated_at = self.get_now_ms()
        await db.commit()
        await db.refresh(business)
        return business

business_service = BusinessService()
