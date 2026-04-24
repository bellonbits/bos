from sqlalchemy import String, BigInteger, Float, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    cashier_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_method: Mapped[str] = mapped_column(String(20), default="cash")
    mpesa_code: Mapped[str | None] = mapped_column(String(50))
    mpesa_phone: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    business: Mapped["Business"] = relationship(back_populates="sales")  # type: ignore[name-defined]
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sales_business_created", "business_id", "created_at"),
        Index("ix_sales_payment_method", "payment_method"),
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    sale_id: Mapped[str] = mapped_column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(300), nullable=False)  # snapshot at time of sale
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    sale: Mapped[Sale] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="sale_items")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_sale_items_product", "product_id"),
        Index("ix_sale_items_sale", "sale_id"),
    )
