"""Purchase flow, exactly as the problem statement's 7.2 steps: create a PO, then
convert it into a Vendor Bill once goods are received. Converting is the moment
that actually touches the accounting ledger - a PO alone is just a plan to buy."""

from datetime import date

from sqlalchemy.orm import Session

from contacts.models import Contact
from core.errors import AppError
from journals.posting import post_vendor_bill
from products.models import Product
from budgets.models import AnalyticAccount
from purchases.models import PurchaseOrder, PurchaseOrderItem, VendorBill
from purchases.schemas import PurchaseOrderCreate
from stock.service import add_movements_for_bill


def list_purchase_orders(db: Session) -> list[PurchaseOrder]:
    return db.query(PurchaseOrder).all()


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppError("PURCHASE_ORDER_NOT_FOUND", f"Purchase order {po_id} does not exist", 404)
    return po


def create_purchase_order(db: Session, payload: PurchaseOrderCreate) -> PurchaseOrder:
    vendor = db.query(Contact).filter(Contact.id == payload.vendor_id, Contact.is_archived.is_(False)).first()
    if not vendor or vendor.type not in ("Vendor", "Both"):
        raise AppError("INVALID_VENDOR", "Choose a valid vendor contact", 400)
    if not payload.items:
        raise AppError("EMPTY_ORDER", "A purchase order needs at least one product", 400)
    if payload.analytic_account_id is not None:
        analytic = db.query(AnalyticAccount).filter(AnalyticAccount.id == payload.analytic_account_id, AnalyticAccount.is_archived.is_(False)).first()
        if not analytic:
            raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
        if analytic.type != "Expenses":
            raise AppError("INVALID_ANALYTIC_ACCOUNT", "Purchase orders must use an Expenses analytic account", 400)
    for item in payload.items:
        if item.quantity <= 0 or item.unit_price_cents < 0:
            raise AppError("INVALID_ORDER_LINE", "Quantity must be greater than zero and price cannot be negative", 400)
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_archived.is_(False)).first()
        if not product:
            raise AppError("PRODUCT_NOT_FOUND", f"Product {item.product_id} does not exist", 404)
    po = PurchaseOrder(vendor_id=payload.vendor_id, analytic_account_id=payload.analytic_account_id, order_date=payload.order_date, status="draft")
    po.items = [
        PurchaseOrderItem(product_id=i.product_id, quantity=i.quantity, unit_price_cents=i.unit_price_cents)
        for i in payload.items
    ]
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


def convert_to_vendor_bill(db: Session, po_id: int, bill_date: date, due_date: date | None) -> VendorBill:
    """Problem statement 7.2 step 2: 'convert the Purchase Order into a Vendor
    Bill'. This is the actual accounting moment - it posts Debit Purchase Expense
    / Credit Creditors for the PO's total."""
    po = get_purchase_order(db, po_id)
    if po.status == "billed":
        raise AppError("ALREADY_BILLED", f"Purchase order {po_id} was already converted to a bill", 409)

    amount_cents = sum(item.quantity * item.unit_price_cents for item in po.items)

    entry = post_vendor_bill(db, bill_date, f"PO-{po.id}", amount_cents, po.analytic_account_id)

    bill = VendorBill(
        purchase_order_id=po.id,
        bill_date=bill_date,
        due_date=due_date,
        amount_cents=amount_cents,
        status="unpaid",
        journal_entry_id=entry.id,
    )
    po.status = "billed"
    db.add(bill)
    db.flush()
    add_movements_for_bill(db, bill.id, bill_date, po.items)
    db.commit()
    db.refresh(bill)
    return bill


def list_vendor_bills(db: Session, contact_id: int | None = None) -> list[VendorBill]:
    query = db.query(VendorBill)
    if contact_id is not None:
        query = query.join(PurchaseOrder).filter(PurchaseOrder.vendor_id == contact_id)
    return query.all()


def get_vendor_bill(db: Session, bill_id: int) -> VendorBill:
    bill = db.query(VendorBill).filter(VendorBill.id == bill_id).first()
    if not bill:
        raise AppError("VENDOR_BILL_NOT_FOUND", f"Vendor bill {bill_id} does not exist", 404)
    return bill


def get_vendor_bill_detail(db: Session, bill_id: int) -> dict:
    from payments.models import Payment

    bill = get_vendor_bill(db, bill_id)
    po = get_purchase_order(db, bill.purchase_order_id)
    payments = db.query(Payment).filter(Payment.vendor_bill_id == bill.id).order_by(Payment.date).all()
    return {
        "id": bill.id,
        "purchase_order_id": bill.purchase_order_id,
        "bill_date": bill.bill_date,
        "due_date": bill.due_date,
        "amount_cents": bill.amount_cents,
        "status": bill.status,
        "items": po.items,
        "payments": payments,
    }
