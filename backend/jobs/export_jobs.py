"""Zips a PDF per customer invoice into one download - the kind of bulk work
that would otherwise mean opening every invoice one at a time."""

import io
import zipfile

from core.database import SessionLocal
from reports.pdf import build_customer_invoice_pdf
from sales.models import CustomerInvoice


def run_bulk_invoice_export() -> bytes:
    db = SessionLocal()
    try:
        invoices = db.query(CustomerInvoice).all()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for invoice in invoices:
                pdf_bytes = build_customer_invoice_pdf(db, invoice)
                zf.writestr(f"invoice-{invoice.id}.pdf", pdf_bytes)
        return buffer.getvalue()
    finally:
        db.close()
