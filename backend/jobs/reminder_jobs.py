"""Finds every Customer Invoice that's still unpaid past its due date and
emails that customer a reminder. Runs both on the automatic daily schedule
(see scheduler.py) and on-demand from the Jobs page for a live demo."""

from datetime import date

from contacts.models import Contact
from core.config import settings
from core.database import SessionLocal
from core.email import send_payment_reminder_email
from core.signing import sign_document_token
from payments.models import Payment
from sales.models import CustomerInvoice, SalesOrder


def run_send_payment_reminders() -> dict:
    db = SessionLocal()
    try:
        overdue = (
            db.query(CustomerInvoice)
            .filter(CustomerInvoice.status.in_(("unpaid", "partial")))
            .filter(CustomerInvoice.due_date.isnot(None))
            .filter(CustomerInvoice.due_date < date.today())
            .all()
        )

        reminders_sent = 0
        skipped_no_email = 0
        for invoice in overdue:
            so = db.query(SalesOrder).filter(SalesOrder.id == invoice.sales_order_id).first()
            customer = db.query(Contact).filter(Contact.id == so.customer_id).first() if so else None
            if not customer or not customer.email:
                skipped_no_email += 1
                continue
            paid = sum(p.amount_cents for p in db.query(Payment).filter(Payment.customer_invoice_id == invoice.id).all())
            outstanding = max(invoice.amount_cents - paid, 0)
            if outstanding <= 0:
                continue
            # 7 days, not the signing module's normal 10-minute default - a
            # reminder email's whole point is to still be actionable whenever
            # the customer gets to it, not just in the next few minutes.
            token, _ = sign_document_token("customer-invoice", invoice.id, ttl_seconds=7 * 24 * 60 * 60)
            pay_url = f"{settings.frontend_base_url}/pay/{invoice.id}?token={token}"
            if send_payment_reminder_email(customer.email, customer.name, invoice.id, outstanding, str(invoice.due_date), pay_url):
                reminders_sent += 1

        return {
            "overdue_invoices_found": len(overdue),
            "reminders_sent": reminders_sent,
            "skipped_no_email": skipped_no_email,
        }
    finally:
        db.close()
