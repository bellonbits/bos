from pydantic import BaseModel, ConfigDict

class ProductBase(BaseModel):
    name: str
    sku: str | None = None
    barcode: str | None = None
    description: str | None = None
    price: float
    cost_price: float = 0.0
    stock_quantity: int = 0
    low_stock_threshold: int = 5
    unit: str = "piece"
    category: str | None = None
    image_url: str | None = None

class ProductCreate(ProductBase):
    business_id: str

class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    barcode: str | None = None
    description: str | None = None
    price: float | None = None
    cost_price: float | None = None
    stock_quantity: int | None = None
    low_stock_threshold: int | None = None
    unit: str | None = None
    category: str | None = None
    image_url: str | None = None
    is_active: bool | None = None

class ProductOut(ProductBase):
    id: str
    business_id: str
    is_active: bool
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)
