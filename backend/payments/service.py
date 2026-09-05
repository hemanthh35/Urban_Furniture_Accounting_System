"""Payments settle a Vendor Bill or a Customer Invoice via Cash or Bank - the
problem statement's step 3 for both the purchase and sales flows. Each one posts
the matching entry from journals/posting.py and flips the bill/invoice to paid."""

from datetime import date

from sqlalchemy.orm import Session

from core.errors import AppError
from journals.posting import post_customer_payment, post_vendor_payment
from payments.models import Payment
from purchases.service import get_vendor_bill
from sales.models import SalesOrder
from sales.service import get_customer_invoice


def list_payments(db: Session, vendor_bill_id: int | None = None, customer_invoice_id: int | None = None) -> list[Payment]:
    query = db.query(Payment)
    if vendor_bill_id is not None:
        query = query.filter(Payment.vendor_bill_id == vendor_bill_id)
    if customer_invoice_id is not None:
        query = query.filter(Payment.customer_invoice_id == customer_invoice_id)
    return query.order_by(Payment.date, Payment.id).all()


def ensure_contact_invoice_access(db: Session, invoice, contact_id: int | None) -> None:
    so = db.query(SalesOrder).filter(SalesOrder.id == invoice.sales_order_id).first()
    if not so or so.customer_id != contact_id:
        raise AppError("FORBIDDEN", "You can only view your own invoices", 403)


def _validate_payment(db: Session, method: str, amount_cents: int, bill_id: int | None = None, invoice_id: int | None = None) -> int:
    if method not in ("Cash", "Bank"):
        raise AppError("INVALID_PAYMENT_METHOD", "Payment method must be Cash or Bank", 400)
    if amount_cents <= 0:
        raise AppError("INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero", 400)

    if bill_id is not None:
        payments = db.query(Payment).filter(Payment.vendor_bill_id == bill_id).all()
    else:
        payments = db.query(Payment).filter(Payment.customer_invoice_id == invoice_id).all()
    return sum(payment.amount_cents for payment in payments)


def pay_vendor_bill(db: Session, bill_id: int, method: str, amount_cents: int, pay_date: date) -> Payment:
    bill = get_vendor_bill(db, bill_id)
    if bill.status == "paid":
        raise AppError("ALREADY_PAID", f"Vendor bill {bill_id} is already paid", 409)
    paid_amount = _validate_payment(db, method, amount_cents, bill_id=bill.id)
    if paid_amount + amount_cents > bill.amount_cents:
        raise AppError("PAYMENT_TOO_HIGH", "Payment is greater than the bill balance", 400)

    entry = post_vendor_payment(db, pay_date, f"BILL-{bill.id}", amount_cents, method)

    payment = Payment(vendor_bill_id=bill.id, method=method, amount_cents=amount_cents, date=pay_date, journal_entry_id=entry.id)
    bill.status = "paid" if paid_amount + amount_cents == bill.amount_cents else "partial"
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def pay_customer_invoice(db: Session, invoice_id: int, method: str, amount_cents: int, pay_date: date, contact_id: int | None) -> Payment:
    invoice = get_customer_invoice(db, invoice_id)

    # A "contact" role user (contact_id set) can only pay their own invoice - never
    # someone else's, even if they somehow guessed the invoice id.
    if contact_id is not None:
        so = db.query(SalesOrder).filter(SalesOrder.id == invoice.sales_order_id).first()
        if not so or so.customer_id != contact_id:
            raise AppError("FORBIDDEN", "You can only pay your own invoices", 403)

    if invoice.status == "paid":
        raise AppError("ALREADY_PAID", f"Customer invoice {invoice_id} is already paid", 409)
    paid_amount = _validate_payment(db, method, amount_cents, invoice_id=invoice.id)
    if paid_amount + amount_cents > invoice.amount_cents:
        raise AppError("PAYMENT_TOO_HIGH", "Payment is greater than the invoice balance", 400)

    entry = post_customer_payment(db, pay_date, f"INV-{invoice.id}", amount_cents, method)

    payment = Payment(customer_invoice_id=invoice.id, method=method, amount_cents=amount_cents, date=pay_date, journal_entry_id=entry.id)
    invoice.status = "paid" if paid_amount + amount_cents == invoice.amount_cents else "partial"
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
