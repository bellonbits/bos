from pydantic import BaseModel, ConfigDict
from typing import Optional


class ExpenseCreate(BaseModel):
    business_id: str
    category: str
    description: Optional[str] = None
    amount: float
    receipt_url: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    receipt_url: Optional[str] = None


class ExpenseOut(BaseModel):
    id: str
    business_id: str
    category: str
    description: Optional[str] = None
    amount: float
    receipt_url: Optional[str] = None
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)
