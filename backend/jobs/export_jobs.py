"""Zips a PDF per customer invoice into one download - the kind of bulk work
that would otherwise mean opening every invoice one at a time."""

import io
import zipfile
from datetime import date

from core.database import SessionLocal
from reports.pdf import build_customer_invoice_pdf
from sales.models import CustomerInvoice


def run_bulk_invoice_export(from_date: str | None = None, to_date: str | None = None) -> bytes:
    # from_date/to_date arrive as plain strings, not date objects - RQ pickles
    # the job's arguments to send them to the worker process, and a plain ISO
    # string round-trips through that with zero fuss (a date object would too,
    # but the string is what the request query params hand us anyway).
    db = SessionLocal()
    try:
        query = db.query(CustomerInvoice)
        if from_date:
            query = query.filter(CustomerInvoice.invoice_date >= date.fromisoformat(from_date))
        if to_date:
            query = query.filter(CustomerInvoice.invoice_date <= date.fromisoformat(to_date))
        invoices = query.all()

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for invoice in invoices:
                pdf_bytes = build_customer_invoice_pdf(db, invoice)
                zf.writestr(f"invoice-{invoice.id}.pdf", pdf_bytes)
        return buffer.getvalue()
    finally:
        db.close()
