import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from fastapi import HTTPException

from ..models.product import Product
from ..models.sale import Sale, SaleItem
from ..schemas.sync import SyncPushItem, SyncPushResponse, SyncPullResponse

class SyncService:
    @staticmethod
    def get_now_ms():
        return int(datetime.now(timezone.utc).timestamp() * 1000)

    async def push_item(self, db: AsyncSession, item: SyncPushItem, user_id: str) -> SyncPushResponse:
        handler = self.ENTITY_HANDLERS.get(item.entity_type)
        if not handler:
            raise HTTPException(status_code=400, detail=f"Unknown entity type: {item.entity_type}")

        # Bind the handler to 'self' correctly
        return await handler(self, db, item, user_id)

    async def pull_items(self, db: AsyncSession, since: int, business_id: str | None) -> SyncPullResponse:
        entities: List[Dict[str, Any]] = []

        # 1. Fetch Products
        products_q = select(Product).where(Product.updated_at > since)
        if business_id:
            products_q = products_q.where(Product.business_id == business_id)
        products = (await db.execute(products_q)).scalars().all()

        for p in products:
            entities.append({
                "entity_type": "products",
                "entity_id": p.id,
                "operation": "update",
                "payload": self._product_to_dict(p),
                "updated_at": p.updated_at,
            })

        # 2. Fetch Sales
        sales_q = select(Sale).where(Sale.created_at > since)
        if business_id:
            sales_q = sales_q.where(Sale.business_id == business_id)
        sales = (await db.execute(sales_q)).scalars().all()

        for s in sales:
            entities.append({
                "entity_type": "sales",
                "entity_id": s.id,
                "operation": "create",
                "payload": self._sale_to_dict(s),
                "updated_at": s.created_at,
            })

        return SyncPullResponse(
            entities=entities,
            server_time=self.get_now_ms(),
            has_more=False,
        )

    # ─── Individual Entity Handlers ──────────────────────────────────────────

    async def _handle_product(self, db: AsyncSession, item: SyncPushItem, user_id: str) -> SyncPushResponse:
        result = await db.execute(select(Product).where(Product.id == item.entity_id))
        existing = result.scalar_one_or_none()

        p = item.payload

        if existing:
            # Last-write-wins conflict resolution
            if existing.updated_at > item.client_updated_at:
                return SyncPushResponse(
                    entity_id=item.entity_id,
                    status="conflict",
                    conflict=True,
                    server_version=self._product_to_dict(existing),
                )
            
            # Client version is newer, update server
            for field in ["name", "price", "cost_price", "stock_quantity", "low_stock_threshold", "unit", "category", "is_active"]:
                if field in p:
                    setattr(existing, field, p[field])
            existing.updated_at = p.get("updated_at", self.get_now_ms())
        else:
            new_product = Product(
                id=item.entity_id,
                business_id=p["business_id"],
                name=p["name"],
                sku=p.get("sku"),
                barcode=p.get("barcode"),
                description=p.get("description"),
                price=p["price"],
                cost_price=p.get("cost_price", 0),
                stock_quantity=p.get("stock_quantity", 0),
                low_stock_threshold=p.get("low_stock_threshold", 5),
                unit=p.get("unit", "piece"),
                category=p.get("category"),
                is_active=p.get("is_active", True),
                created_at=p["created_at"],
                updated_at=p["updated_at"],
            )
            db.add(new_product)

        await db.commit()
        return SyncPushResponse(entity_id=item.entity_id, status="accepted")

    async def _handle_sale(self, db: AsyncSession, item: SyncPushItem, user_id: str) -> SyncPushResponse:
        # Sales are immutable (idempotent insert)
        result = await db.execute(select(Sale).where(Sale.id == item.entity_id))
        if result.scalar_one_or_none():
            return SyncPushResponse(entity_id=item.entity_id, status="accepted")

        p = item.payload
        sale = Sale(
            id=item.entity_id,
            business_id=p["business_id"],
            cashier_id=p.get("cashier_id"),
            total_amount=p["total_amount"],
            discount_amount=p.get("discount_amount", 0),
            tax_amount=p.get("tax_amount", 0),
            payment_method=p.get("payment_method", "cash"),
            mpesa_code=p.get("mpesa_code"),
            mpesa_phone=p.get("mpesa_phone"),
            notes=p.get("notes"),
            created_at=p["created_at"],
            updated_at=p["updated_at"],
        )
        db.add(sale)

        # Handle items and stock deduction
        for si in p.get("items", []):
            db.add(SaleItem(
                id=si["id"],
                sale_id=item.entity_id,
                product_id=si["product_id"],
                product_name=si["product_name"],
                quantity=si["quantity"],
                unit_price=si["unit_price"],
                cost_price=si.get("cost_price", 0),
                subtotal=si["subtotal"],
                created_at=si["created_at"],
            ))

            # Atomic stock deduction
            await db.execute(
                text("""
                    UPDATE products
                    SET stock_quantity = GREATEST(0, stock_quantity - :qty),
                        updated_at     = :now
                    WHERE id = :product_id AND business_id = :business_id
                """),
                {"qty": si["quantity"], "now": self.get_now_ms(),
                 "product_id": si["product_id"], "business_id": p["business_id"]},
            )

        await db.commit()
        return SyncPushResponse(entity_id=item.entity_id, status="accepted")

    # ─── Serializers ──────────────────────────────────────────────────────────

    def _product_to_dict(self, p: Product) -> Dict[str, Any]:
        return {
            "id": p.id, "business_id": p.business_id, "name": p.name,
            "sku": p.sku, "barcode": p.barcode, "description": p.description,
            "price": p.price, "cost_price": p.cost_price, "stock_quantity": p.stock_quantity,
            "low_stock_threshold": p.low_stock_threshold, "unit": p.unit, "category": p.category,
            "is_active": p.is_active, "created_at": p.created_at, "updated_at": p.updated_at,
        }

    def _sale_to_dict(self, s: Sale) -> Dict[str, Any]:
        return {
            "id": s.id, "business_id": s.business_id, "total_amount": s.total_amount,
            "discount_amount": s.discount_amount, "payment_method": s.payment_method,
            "mpesa_code": s.mpesa_code, "created_at": s.created_at, "updated_at": s.updated_at,
        }

    @property
    def ENTITY_HANDLERS(self) -> Dict[str, Callable]:
        return {
            "products": self._handle_product,
            "sales": self._handle_sale,
        }

sync_service = SyncService()
