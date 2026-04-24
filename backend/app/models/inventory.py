from sqlalchemy import String, BigInteger, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)  # sale | restock | adjustment | loss
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_before: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(36))
    reference_type: Mapped[str | None] = mapped_column(String(30))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    __table_args__ = (
        Index("ix_inv_product_created", "product_id", "created_at"),
        Index("ix_inv_type", "movement_type"),
        Index("ix_inv_reference", "reference_id"),
    )
