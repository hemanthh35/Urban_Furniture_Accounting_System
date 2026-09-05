from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

PURCHASE_ORDER_STATUSES = ("draft", "billed", "cancelled")
VENDOR_BILL_STATUSES = ("unpaid", "partial", "paid")


class PurchaseOrder(Base):
    """Step 1 of the purchase flow: 'select Vendor, Product, Quantity, Unit Price'
    per the problem statement. Doesn't touch the ledger by itself - it's just a
    commitment to buy, not yet a financial transaction. status flips to 'billed'
    once it's been converted into a VendorBill (see below), so it can't be
    converted twice."""

    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id"), nullable=True)
    order_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="draft")

    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price_cents = Column(Integer, nullable=False)
    tax_percent = Column(Integer, nullable=False, default=0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")


class VendorBill(Base):
    """Step 2 of the purchase flow: 'Convert PO to Bill, record invoice date, due
    date, and register payment'. This is the actual financial transaction - creating
    a VendorBill is what posts the Debit Purchase Expense / Credit Creditors journal
    entry (see journals/posting.py). amount_cents is the PO's total, copied here so
    the bill is a self-contained record even if the PO's items change later."""

    __tablename__ = "vendor_bills"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, unique=True)
    bill_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    subtotal_cents = Column(Integer, nullable=False, default=0)
    tax_cents = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="unpaid")
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)

    lines = relationship("VendorBillLine", back_populates="bill", cascade="all, delete-orphan")


class VendorBillLine(Base):
    __tablename__ = "vendor_bill_lines"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bill_id = Column(Integer, ForeignKey("vendor_bills.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price_cents = Column(Integer, nullable=False)
    tax_percent = Column(Integer, nullable=False, default=0)

    bill = relationship("VendorBill", back_populates="lines")
