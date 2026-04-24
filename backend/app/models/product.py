from sqlalchemy import String, BigInteger, Float, Integer, ForeignKey, Boolean, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100))
    barcode: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5)
    unit: Mapped[str] = mapped_column(String(50), default="piece")
    category: Mapped[str | None] = mapped_column(String(100))
    image_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    business: Mapped["Business"] = relationship(back_populates="products")  # type: ignore[name-defined]
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="product")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_products_business_active", "business_id", "is_active"),
        Index("ix_products_barcode", "barcode"),
        Index("ix_products_updated", "updated_at"),
    )
