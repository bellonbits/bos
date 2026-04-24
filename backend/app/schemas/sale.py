from pydantic import BaseModel, ConfigDict
from typing import List

class SaleItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    cost_price: float = 0.0
    subtotal: float
    created_at: int

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemOut(SaleItemBase):
    id: str
    sale_id: str

    model_config = ConfigDict(from_attributes=True)

class SaleBase(BaseModel):
    business_id: str
    cashier_id: str | None = None
    total_amount: float
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    payment_method: str = "cash"
    mpesa_code: str | None = None
    mpesa_phone: str | None = None
    notes: str | None = None

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]

class SaleOut(SaleBase):
    id: str
    created_at: int
    updated_at: int
    items: List[SaleItemOut]

    model_config = ConfigDict(from_attributes=True)
