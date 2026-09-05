from sqlalchemy import Boolean, Column, Integer, String
from core.database import Base

# What Urban Furniture buys/sells - a chair, a sofa, or a service like "assembly".
# "Combo" covers a bundle of goods+service sold as one line item.
PRODUCT_TYPES = ("Goods", "Service", "Combo")


class Product(Base):
    """Master data: exact fields from the problem statement - Product Name, Type,
    Sales Price, Cost (Purchase Price), Category."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)  # Goods | Service | Combo
    sales_price_cents = Column(Integer, nullable=False)  # what we charge a customer
    cost_cents = Column(Integer, nullable=False)  # what it costs us to buy/produce
    category = Column(String(100), nullable=True)
    is_archived = Column(Boolean, nullable=False, default=False)
