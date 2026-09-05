from sqlalchemy import Column, Date, ForeignKey, Integer, String

from core.database import Base


class StockMovement(Base):
    """A positive movement adds stock; a negative movement removes stock."""

    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    source_type = Column(String(30), nullable=False)  # vendor_bill | customer_invoice
    source_id = Column(Integer, nullable=False)
    movement_date = Column(Date, nullable=False)
    quantity_delta = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)
