from sqlalchemy import CheckConstraint, Column, Integer, String, Date, ForeignKey
from core.database import Base

PAYMENT_METHODS = ("Cash", "Bank", "Razorpay")


class Payment(Base):
    """Step 3 of both flows: 'register payment' against a bill or an invoice, via
    Cash, Bank, or (customer invoices only) Razorpay online checkout. Exactly one
    of vendor_bill_id / customer_invoice_id is set on any given Payment - never
    both, never neither - since a single payment always settles one specific bill
    or one specific invoice per the problem statement."""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bill_id = Column(Integer, ForeignKey("vendor_bills.id"), nullable=True)
    customer_invoice_id = Column(Integer, ForeignKey("customer_invoices.id"), nullable=True)
    method = Column(String(20), nullable=False)  # Cash | Bank | Razorpay
    amount_cents = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    # Only set for method="Razorpay" - lets the webhook find the matching Payment
    # row and lets support look up a transaction by its gateway id.
    razorpay_order_id = Column(String(64), nullable=True)
    razorpay_payment_id = Column(String(64), nullable=True)

    __table_args__ = (
        CheckConstraint("(vendor_bill_id IS NOT NULL) <> (customer_invoice_id IS NOT NULL)", name="ck_payment_one_document"),
        CheckConstraint("method IN ('Cash', 'Bank', 'Razorpay')", name="ck_payment_method"),
        CheckConstraint("amount_cents > 0", name="ck_payment_amount_positive"),
    )
