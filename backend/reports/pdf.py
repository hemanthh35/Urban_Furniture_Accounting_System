"""Turns a Customer Invoice or Vendor Bill into a downloadable PDF, built
directly from the same rows the UI already shows - no separate template engine,
no numbers typed in twice."""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from contacts.models import Contact
from products.models import Product


def _money(cents: int) -> str:
    return f"Rs. {cents / 100:,.2f}"


class _LineRow:
    def __init__(self, db: Session, item):
        product = db.query(Product).filter(Product.id == item.product_id).first()
        self.product_name = product.name if product else f"Product {item.product_id}"
        self.quantity = item.quantity
        self.unit_price_cents = item.unit_price_cents
        self.tax_percent = item.tax_percent


def _build(title: str, doc_id: int, doc_date, contact_name: str, lines: list, amount_cents: int, subtotal_cents: int, tax_cents: int, status: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=colors.grey, spaceAfter=4)

    elements = [
        Paragraph("Urban Furniture", styles["Heading2"]),
        Paragraph(f"{title} #{doc_id}", styles["Title"]),
        Paragraph(f"Party: {contact_name}", meta_style),
        Paragraph(f"Date: {doc_date}", meta_style),
        Paragraph(f"Status: {status.upper()}", meta_style),
        Paragraph(f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", meta_style),
        Spacer(1, 0.5 * cm),
    ]

    rows = [["Product", "Qty", "Unit Price", "Tax %", "Line Total"]]
    for line in lines:
        base = line.quantity * line.unit_price_cents
        total = base + (base * line.tax_percent // 100)
        rows.append([line.product_name, str(line.quantity), _money(line.unit_price_cents), f"{line.tax_percent}%", _money(total)])
    rows.append(["", "", "", "Subtotal", _money(subtotal_cents)])
    rows.append(["", "", "", "Tax", _money(tax_cents)])
    rows.append(["", "", "", "Total", _money(amount_cents)])

    table = Table(rows, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A0A0A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -4), 0.5, colors.HexColor("#D8D8D8")),
        ("FONTNAME", (3, -3), (4, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()


def build_customer_invoice_pdf(db: Session, invoice) -> bytes:
    from sales.service import get_sales_order

    so = get_sales_order(db, invoice.sales_order_id)
    contact = db.query(Contact).filter(Contact.id == so.customer_id).first()
    items = invoice.lines or so.items
    lines = [_LineRow(db, item) for item in items]
    return _build("Customer Invoice", invoice.id, invoice.invoice_date, contact.name if contact else "Unknown", lines, invoice.amount_cents, invoice.subtotal_cents, invoice.tax_cents, invoice.status)


def build_vendor_bill_pdf(db: Session, bill) -> bytes:
    from purchases.service import get_purchase_order

    po = get_purchase_order(db, bill.purchase_order_id)
    contact = db.query(Contact).filter(Contact.id == po.vendor_id).first()
    items = bill.lines or po.items
    lines = [_LineRow(db, item) for item in items]
    return _build("Vendor Bill", bill.id, bill.bill_date, contact.name if contact else "Unknown", lines, bill.amount_cents, bill.subtotal_cents, bill.tax_cents, bill.status)
