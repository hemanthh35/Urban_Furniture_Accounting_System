"""Sales flow, exactly as the problem statement's 7.3 steps: create a Sales Order,
then generate a Customer Invoice from it. Generating the invoice is what actually
touches the ledger."""

from datetime import date

from sqlalchemy.orm import Session

from core.errors import AppError
from journals.posting import post_customer_invoice
from sales.models import CustomerInvoice, SalesOrder, SalesOrderItem
from sales.schemas import SalesOrderCreate


def _line_total_cents(item: SalesOrderItem) -> int:
    base = item.quantity * item.unit_price_cents
    return base + (base * item.tax_percent // 100)


def list_sales_orders(db: Session) -> list[SalesOrder]:
    return db.query(SalesOrder).all()


def get_sales_order(db: Session, so_id: int) -> SalesOrder:
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise AppError("SALES_ORDER_NOT_FOUND", f"Sales order {so_id} does not exist", 404)
    return so


def create_sales_order(db: Session, payload: SalesOrderCreate) -> SalesOrder:
    so = SalesOrder(customer_id=payload.customer_id, order_date=payload.order_date, status="draft")
    so.items = [
        SalesOrderItem(
            product_id=i.product_id, quantity=i.quantity,
            unit_price_cents=i.unit_price_cents, tax_percent=i.tax_percent,
        )
        for i in payload.items
    ]
    db.add(so)
    db.commit()
    db.refresh(so)
    return so


def generate_customer_invoice(db: Session, so_id: int, invoice_date: date, due_date: date | None) -> CustomerInvoice:
    """Problem statement 7.3 step 2: 'generates a Customer Invoice'. Posts Debit
    Debtors / Credit Sale Income for the SO's total (including tax)."""
    so = get_sales_order(db, so_id)
    if so.status == "invoiced":
        raise AppError("ALREADY_INVOICED", f"Sales order {so_id} was already invoiced", 409)

    amount_cents = sum(_line_total_cents(item) for item in so.items)

    entry = post_customer_invoice(db, invoice_date, f"SO-{so.id}", amount_cents)

    invoice = CustomerInvoice(
        sales_order_id=so.id,
        invoice_date=invoice_date,
        due_date=due_date,
        amount_cents=amount_cents,
        status="unpaid",
        journal_entry_id=entry.id,
    )
    so.status = "invoiced"
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def list_customer_invoices(db: Session, contact_id: int | None = None) -> list[CustomerInvoice]:
    """contact_id is passed for "contact" role users so they only ever see invoices
    belonging to their own Sales Orders - never anyone else's."""
    query = db.query(CustomerInvoice)
    if contact_id is not None:
        query = query.join(SalesOrder).filter(SalesOrder.customer_id == contact_id)
    return query.all()


def get_customer_invoice(db: Session, invoice_id: int) -> CustomerInvoice:
    invoice = db.query(CustomerInvoice).filter(CustomerInvoice.id == invoice_id).first()
    if not invoice:
        raise AppError("INVOICE_NOT_FOUND", f"Customer invoice {invoice_id} does not exist", 404)
    return invoice
