from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from core.database import Base

# Only 3 roles exist per the problem statement: Admin, Invoicing User (accountant),
# and Contact (a customer/vendor logging in to see their own invoices/bills).
ROLES = ("admin", "accountant", "contact")


class User(Base):
    """A login account. contact_id is only set for role="contact" users - it points
    at the Contact record they're allowed to see, so they never see anyone else's
    invoices/bills."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
