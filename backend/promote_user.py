import asyncio
import sys
from sqlalchemy import select
from app.database import engine, SessionLocal
from app.models.user import User

async def promote_user(email: str):
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User with email {email} not found.")
            return
            
        user.role = "admin"
        await db.commit()
        print(f"Successfully promoted {email} to admin role.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_user.py <email>")
        sys.exit(1)
        
    email = sys.argv[1]
    asyncio.run(promote_user(email))
