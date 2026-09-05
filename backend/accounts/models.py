from sqlalchemy import Boolean, Column, Integer, String
from core.database import Base

# The 5 standard accounting buckets every transaction eventually lands in.
ACCOUNT_TYPES = ("Asset", "Liability", "Expense", "Income", "Capital")


class Account(Base):
    """Chart of Accounts - the master list of ledger 'buckets' (Cash, Bank, Debtors,
    Creditors, Sale Income, Purchases Expense, ...). Every JournalEntryLine points at
    one of these. Exact fields from the problem statement - Account Name, Type."""

    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    type = Column(String(20), nullable=False)  # Asset | Liability | Expense | Income | Capital
    is_archived = Column(Boolean, nullable=False, default=False)
