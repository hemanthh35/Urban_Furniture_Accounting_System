from sqlalchemy import Column, Integer, String
from core.database import Base

# A Contact can be a Customer, a Vendor, or Both (the same real-world business or
# person can buy from us AND sell to us - the problem statement's own examples,
# Rahul Sharma as Vendor and Nimesh Pathak as Customer, are two separate contacts,
# but the "Both" type exists for cases where one contact plays both roles).
CONTACT_TYPES = ("Customer", "Vendor", "Both")


class Contact(Base):
    """Master data: everyone we buy from or sell to. Exact fields from the problem
    statement - Name, Type, Email, Mobile, Address (City, State, Pincode), Profile
    Image. Nothing extra added."""

    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)  # Customer | Vendor | Both
    email = Column(String(255), nullable=True)
    mobile = Column(String(32), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    profile_image = Column(String(512), nullable=True)  # stored as a URL/path, not raw bytes
