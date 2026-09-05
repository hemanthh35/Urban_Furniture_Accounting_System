"""Payments settle a Vendor Bill or a Customer Invoice via Cash or Bank - the
problem statement's step 3 for both the purchase and sales flows. Each one posts
the matching entry from journals/posting.py and flips the bill/invoice to paid.

Customer invoices have one extra path: a "contact" role user can pay online
through Razorpay instead of Cash/Bank. Razorpay settles to our bank account, so
it posts through the accounting engine exactly like a Bank payment - "Razorpay"
is recorded as the Payment's method for display/audit only, never as a Chart of
Accounts account name."""

import json
from datetime import date

from sqlalchemy.orm import Session

import razorpay

from core.config import settings
from core.errors import AppError
from journals.posting import post_customer_payment, post_vendor_payment
from payments.models import Payment
from purchases.service import get_vendor_bill
from sales.models import SalesOrder
from sales.service import get_customer_invoice

_razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


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


def _invoice_paid_cents(db: Session, invoice_id: int) -> int:
    return sum(p.amount_cents for p in db.query(Payment).filter(Payment.customer_invoice_id == invoice_id).all())


def create_invoice_checkout(db: Session, invoice_id: int, contact_id: int | None) -> dict:
    """A contact starts an online payment for their own invoice. We only ever
    charge the outstanding balance - never the full invoice amount if part of
    it is already paid via Cash/Bank."""
    invoice = get_customer_invoice(db, invoice_id)
    if contact_id is not None:
        ensure_contact_invoice_access(db, invoice, contact_id)
    if invoice.status == "paid":
        raise AppError("ALREADY_PAID", f"Customer invoice {invoice_id} is already paid", 409)
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise AppError("RAZORPAY_NOT_CONFIGURED", "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in the backend .env", 500)

    outstanding_cents = invoice.amount_cents - _invoice_paid_cents(db, invoice.id)
    if outstanding_cents <= 0:
        raise AppError("NOTHING_TO_PAY", "This invoice has nothing outstanding", 400)

    razorpay_order = _razorpay_client.order.create({
        "amount": outstanding_cents,
        "currency": "INR",
        "receipt": f"invoice-{invoice.id}",
        "payment_capture": 1,
    })

    return {
        "razorpay_key_id": settings.razorpay_key_id,
        "razorpay_order_id": razorpay_order["id"],
        "amount_cents": outstanding_cents,
        "currency": "INR",
        "customer_invoice_id": invoice.id,
    }


def handle_razorpay_webhook(db: Session, raw_body: bytes, signature: str | None) -> None:
    """Called by Razorpay's servers, not the frontend - there's no JWT here.
    Trust comes entirely from the HMAC signature check below: anyone can POST a
    fake "payment succeeded" body, but only Razorpay knows the webhook secret
    needed to sign it correctly."""
    if not signature:
        raise AppError("MISSING_SIGNATURE", "X-Razorpay-Signature header is required", 400)
    try:
        _razorpay_client.utility.verify_webhook_signature(raw_body.decode("utf-8"), signature, settings.razorpay_webhook_secret)
    except razorpay.errors.SignatureVerificationError:
        raise AppError("INVALID_SIGNATURE", "Webhook signature verification failed", 400)

    payload = json.loads(raw_body)
    if payload.get("event") not in ("payment.captured", "order.paid"):
        return

    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    razorpay_payment_id = payment_entity.get("id")
    amount_cents = payment_entity.get("amount")
    if not order_id or not amount_cents:
        raise AppError("MALFORMED_WEBHOOK", "Webhook payload missing payment order id or amount", 400)

    # We don't keep our own record of "checkout started" - the order's receipt
    # (set when we created it above) is what tells us which invoice this was for.
    order = _razorpay_client.order.fetch(order_id)
    receipt = order.get("receipt") or ""
    if not receipt.startswith("invoice-"):
        raise AppError("MALFORMED_WEBHOOK", "Could not determine invoice from Razorpay order receipt", 400)
    invoice_id = int(receipt.removeprefix("invoice-"))

    if db.query(Payment).filter(Payment.razorpay_order_id == order_id).first():
        return  # duplicate webhook delivery for an already-recorded payment - ignore

    invoice = get_customer_invoice(db, invoice_id)
    if invoice.status == "paid":
        return

    paid_amount = _invoice_paid_cents(db, invoice.id)
    entry = post_customer_payment(db, date.today(), f"INV-{invoice.id}", amount_cents, "Bank")
    payment = Payment(
        customer_invoice_id=invoice.id, method="Razorpay", amount_cents=amount_cents, date=date.today(),
        journal_entry_id=entry.id, razorpay_order_id=order_id, razorpay_payment_id=razorpay_payment_id,
    )
    invoice.status = "paid" if paid_amount + amount_cents >= invoice.amount_cents else "partial"
    db.add(payment)
    db.commit()
