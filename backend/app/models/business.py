from sqlalchemy import String, BigInteger, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    location: Mapped[str | None] = mapped_column(String(300))
    business_type: Mapped[str] = mapped_column(String(50), default="retail")
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="businesses")  # type: ignore[name-defined]
    products: Mapped[list["Product"]] = relationship(back_populates="business")  # type: ignore[name-defined]
    sales: Mapped[list["Sale"]] = relationship(back_populates="business")  # type: ignore[name-defined]
