from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.auth import get_admin_user
from ..services.admin_service import admin_service
from ..models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await admin_service.get_system_stats(db)

@router.get("/users")
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await admin_service.list_all_users(db)

@router.get("/businesses")
async def list_businesses(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await admin_service.list_all_businesses(db)

@router.post("/users/{user_id}/role")
async def change_role(
    user_id: str,
    role: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    if role not in ["admin", "owner", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    success = await admin_service.update_user_role(db, user_id, role)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success"}
