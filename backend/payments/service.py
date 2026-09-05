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


def pay_vendor_bill(db: Session, bill_id: int, method: str, amount_cents: int, pay_date: date) -> Payment:
    bill = get_vendor_bill(db, bill_id)
    if bill.status == "paid":
        raise AppError("ALREADY_PAID", f"Vendor bill {bill_id} is already paid", 409)

    entry = post_vendor_payment(db, pay_date, f"BILL-{bill.id}", amount_cents, method)

    payment = Payment(vendor_bill_id=bill.id, method=method, amount_cents=amount_cents, date=pay_date, journal_entry_id=entry.id)
    bill.status = "paid"
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

    entry = post_customer_payment(db, pay_date, f"INV-{invoice.id}", amount_cents, method)

    payment = Payment(customer_invoice_id=invoice.id, method=method, amount_cents=amount_cents, date=pay_date, journal_entry_id=entry.id)
    invoice.status = "paid"
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
