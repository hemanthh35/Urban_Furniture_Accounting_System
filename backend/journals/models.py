from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

# The 4 journal types named in the problem statement - just a label for grouping,
# doesn't drive any calculation itself.
JOURNAL_TYPES = ("Sales", "Purchase", "Bank", "Cash")


class Journal(Base):
    """Groups similar transactions (Sales Journal, Purchase Journal, Bank Journal,
    Cash Journal). Exact fields from the problem statement - Journal Name, Type,
    Default Accounts (kept as a single optional default account here, to stay
    simple - the actual debit/credit accounts used on every entry are always the
    fixed pair for that transaction type, not looked up from this field)."""

    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)  # Sales | Purchase | Bank | Cash
    default_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)


class JournalEntry(Base):
    """One real accounting transaction (e.g. 'Invoice #12 raised'). Exact fields
    from the problem statement - Journal, Date, Reference. The actual debit/credit
    amounts live on JournalEntryLine below, since one transaction always touches
    at least 2 accounts (double-entry)."""

    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journals.id"), nullable=False)
    date = Column(Date, nullable=False)
    reference = Column(String(255), nullable=True)  # e.g. "INV-12", "BILL-7"

    lines = relationship("JournalEntryLine", back_populates="entry", cascade="all, delete-orphan")


class JournalEntryLine(Base):
    """One row of a journal entry: one account, and either a debit or a credit
    amount (never both). Exact fields from the problem statement - Account, Debit,
    Credit. A JournalEntry is only valid if its lines' debits sum equals its
    credits sum - that's the double-entry rule."""

    __tablename__ = "journal_entry_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    debit_cents = Column(Integer, nullable=False, default=0)
    credit_cents = Column(Integer, nullable=False, default=0)

    entry = relationship("JournalEntry", back_populates="lines")
