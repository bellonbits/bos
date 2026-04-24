from pydantic import BaseModel, Field
from typing import Any, Literal


class SyncPushItem(BaseModel):
    entity_type: Literal["products", "sales", "sale_items", "inventory_movements", "expenses"]
    entity_id: str
    operation: Literal["create", "update", "delete"]
    payload: dict[str, Any]
    client_updated_at: int


class SyncPushResponse(BaseModel):
    entity_id: str
    status: Literal["accepted", "conflict", "error"]
    conflict: bool = False
    server_version: dict[str, Any] | None = None
    error: str | None = None


class SyncPullResponse(BaseModel):
    entities: list[dict[str, Any]]
    server_time: int
    has_more: bool = False
