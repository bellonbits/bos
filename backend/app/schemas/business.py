from pydantic import BaseModel, ConfigDict

class BusinessBase(BaseModel):
    name: str
    phone: str | None = None
    location: str | None = None
    business_type: str = "retail"
    currency: str = "KES"

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    location: str | None = None
    business_type: str | None = None
    currency: str | None = None
    subscription_tier: str | None = None
    is_active: bool | None = None

class BusinessOut(BusinessBase):
    id: str
    owner_id: str
    subscription_tier: str
    is_active: bool
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)
