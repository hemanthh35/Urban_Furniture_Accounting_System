from sqlalchemy import Column, Integer, String, ForeignKey
from core.database import Base

ANALYTIC_ACCOUNT_TYPES = ("Income", "Expenses")


class AnalyticAccount(Base):
    """A tag for grouping income/expenses by project or department (e.g. 'Retail
    Store', 'Online Sales') - separate from the Chart of Accounts, which groups by
    accounting type instead. Exact fields from the problem statement."""

    __tablename__ = "analytic_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)  # Income | Expenses


class Budget(Base):
    """A planned amount for one analytic account over one period. planned_amount and
    analytic_account_id come from the problem statement's own description of Budget
    ("defining the budget period, planned amount, and the relevant analytic account")
    even though the short Fields list only names 3 of these - without a planned
    amount there'd be nothing for the Budget Report to actually report against."""

    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    period = Column(String(100), nullable=False)  # e.g. "2026-Q1" - kept as free text, no date-range math required by the spec
    responsible_person = Column(String(255), nullable=True)
    planned_amount_cents = Column(Integer, nullable=False)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id"), nullable=False)
