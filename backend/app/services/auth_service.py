import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from fastapi import HTTPException, status

from ..models.user import User
from ..models.business import Business
from ..models.sale import Sale, SaleItem
from ..models.expense import Expense
from ..models.product import Product
from ..models.inventory import InventoryMovement
from ..schemas.user import UserCreate, UserLogin, TokenResponse, UserOut, UserUpdate
from ..middleware.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)

class AuthService:
    @staticmethod
    def get_now_ms():
        return int(datetime.now(timezone.utc).timestamp() * 1000)

    async def register(self, db: AsyncSession, data: UserCreate) -> TokenResponse:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            id=str(uuid.uuid4()),
            email=data.email,
            name=data.name,
            phone=data.phone,
            password_hash=hash_password(data.password),
            role="owner",
            is_active=True,
            created_at=self.get_now_ms(),
            updated_at=self.get_now_ms(),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return self.build_token_response(user)

    async def login(self, db: AsyncSession, data: UserLogin) -> TokenResponse:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated")

        return self.build_token_response(user)

    async def refresh_tokens(self, db: AsyncSession, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return self.build_token_response(user)

    async def update_user(self, db: AsyncSession, user_id: str, data: UserUpdate) -> User:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(user, k, v)
        user.updated_at = self.get_now_ms()
        await db.commit()
        await db.refresh(user)
        return user

    async def delete_account(self, db: AsyncSession, user_id: str) -> None:
        biz_result = await db.execute(select(Business.id).where(Business.owner_id == user_id))
        business_ids = [row[0] for row in biz_result.fetchall()]

        if business_ids:
            sale_result = await db.execute(select(Sale.id).where(Sale.business_id.in_(business_ids)))
            sale_ids = [row[0] for row in sale_result.fetchall()]
            if sale_ids:
                await db.execute(sql_delete(SaleItem).where(SaleItem.sale_id.in_(sale_ids)))
            await db.execute(sql_delete(InventoryMovement).where(InventoryMovement.business_id.in_(business_ids)))
            await db.execute(sql_delete(Sale).where(Sale.business_id.in_(business_ids)))
            await db.execute(sql_delete(Expense).where(Expense.business_id.in_(business_ids)))
            await db.execute(sql_delete(Product).where(Product.business_id.in_(business_ids)))
            await db.execute(sql_delete(Business).where(Business.owner_id == user_id))

        await db.execute(sql_delete(User).where(User.id == user_id))
        await db.commit()

    def build_token_response(self, user: User) -> TokenResponse:
        token_data = {"sub": user.id, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserOut.model_validate(user),
        )

auth_service = AuthService()
