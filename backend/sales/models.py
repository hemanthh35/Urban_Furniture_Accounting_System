from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

SALES_ORDER_STATUSES = ("draft", "invoiced")
CUSTOMER_INVOICE_STATUSES = ("unpaid", "paid")


class SalesOrder(Base):
    """Step 1 of the sales flow: 'select Customer, Product, Quantity, Unit Price,
    Tax'. Same idea as PurchaseOrder - just a commitment to sell, no ledger impact
    until it becomes a CustomerInvoice."""

    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id"), nullable=True)
    order_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="draft")

    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price_cents = Column(Integer, nullable=False)
    tax_percent = Column(Integer, nullable=False, default=0)  # e.g. 18 for 18% GST

    sales_order = relationship("SalesOrder", back_populates="items")


class CustomerInvoice(Base):
    """Step 2 of the sales flow: 'Generate Invoice from SO and receive payment'.
    This is the real financial transaction - creating a CustomerInvoice posts the
    Debit Debtors / Credit Sales Income journal entry. amount_cents is the SO
    total including tax, copied here so the invoice is self-contained."""

    __tablename__ = "customer_invoices"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False, unique=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="unpaid")
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
