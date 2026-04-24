from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from ..models.user import User
from ..models.business import Business
from ..models.product import Product
from ..models.sale import Sale
from typing import Dict, List, Any

class AdminService:
    async def get_system_stats(self, db: AsyncSession) -> Dict[str, Any]:
        # User counts
        users_count = await db.execute(select(func.count(User.id)))
        total_users = users_count.scalar() or 0
        
        # Business counts
        biz_count = await db.execute(select(func.count(Business.id)))
        total_businesses = biz_count.scalar() or 0
        
        # Tier breakdown
        free_tier = await db.execute(select(func.count(Business.id)).where(Business.subscription_tier == "free"))
        standard_tier = await db.execute(select(func.count(Business.id)).where(Business.subscription_tier == "standard"))
        premium_tier = await db.execute(select(func.count(Business.id)).where(Business.subscription_tier == "premium"))
        
        # Revenue stats
        revenue_sum = await db.execute(select(func.sum(Sale.total_amount)))
        total_revenue = revenue_sum.scalar() or 0
        
        # Recent users
        recent_users_res = await db.execute(select(User).order_by(desc(User.created_at)).limit(5))
        recent_users = recent_users_res.scalars().all()
        
        return {
            "total_users": total_users,
            "total_businesses": total_businesses,
            "total_revenue": total_revenue,
            "tiers": {
                "free": free_tier.scalar() or 0,
                "standard": standard_tier.scalar() or 0,
                "premium": premium_tier.scalar() or 0,
            },
            "recent_users": [
                {"id": u.id, "email": u.email, "name": u.name, "created_at": u.created_at} 
                for u in recent_users
            ]
        }

    async def list_all_users(self, db: AsyncSession) -> List[Dict[str, Any]]:
        result = await db.execute(select(User).order_by(desc(User.created_at)))
        users = result.scalars().all()
        return [
            {
                "id": u.id, 
                "email": u.email, 
                "name": u.name, 
                "role": u.role, 
                "is_active": u.is_active, 
                "created_at": u.created_at,
                "business_count": len(u.businesses)
            } for u in users
        ]

    async def list_all_businesses(self, db: AsyncSession) -> List[Dict[str, Any]]:
        result = await db.execute(select(Business).order_by(desc(Business.created_at)))
        businesses = result.scalars().all()
        return [
            {
                "id": b.id,
                "name": b.name,
                "owner_email": b.owner.email,
                "tier": b.subscription_tier,
                "type": b.business_type,
                "created_at": b.created_at
            } for b in businesses
        ]

    async def update_user_role(self, db: AsyncSession, user_id: str, role: str) -> bool:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return False
        user.role = role
        await db.commit()
        return True

admin_service = AdminService()
