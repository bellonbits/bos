from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..services.analytics_service import analytics_service
from ..services.ai_service import ai_service
from ..services.business_service import business_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/{business_id}/daily/")
async def daily_summary(
    business_id: str,
    date: str | None = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_daily_summary(db, business_id, date)

@router.get("/{business_id}/weekly/")
async def weekly_summary(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_weekly_revenue(db, business_id)

@router.get("/{business_id}/loss-detection/")
async def detect_stock_anomalies(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.detect_anomalies(db, business_id)

@router.get("/{business_id}/ai-insights/")
async def get_ai_business_insights(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce standard/premium limits
    business = await business_service.get_business(db, business_id, current_user.id)
    if business.subscription_tier == "free":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="AI Business Insights are only available on Standard and Premium tiers.")
        
    return await ai_service.generate_business_insights(db, business_id)
