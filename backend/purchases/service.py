"""Purchase flow, exactly as the problem statement's 7.2 steps: create a PO, then
convert it into a Vendor Bill once goods are received. Converting is the moment
that actually touches the accounting ledger - a PO alone is just a plan to buy."""

from datetime import date

from sqlalchemy.orm import Session

from core.errors import AppError
from journals.posting import post_vendor_bill
from purchases.models import PurchaseOrder, PurchaseOrderItem, VendorBill
from purchases.schemas import PurchaseOrderCreate


def list_purchase_orders(db: Session) -> list[PurchaseOrder]:
    return db.query(PurchaseOrder).all()


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppError("PURCHASE_ORDER_NOT_FOUND", f"Purchase order {po_id} does not exist", 404)
    return po


def create_purchase_order(db: Session, payload: PurchaseOrderCreate) -> PurchaseOrder:
    po = PurchaseOrder(vendor_id=payload.vendor_id, order_date=payload.order_date, status="draft")
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

    entry = post_vendor_bill(db, bill_date, f"PO-{po.id}", amount_cents)

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
    db.commit()
    db.refresh(bill)
    return bill


def list_vendor_bills(db: Session) -> list[VendorBill]:
    return db.query(VendorBill).all()


def get_vendor_bill(db: Session, bill_id: int) -> VendorBill:
    bill = db.query(VendorBill).filter(VendorBill.id == bill_id).first()
    if not bill:
        raise AppError("VENDOR_BILL_NOT_FOUND", f"Vendor bill {bill_id} does not exist", 404)
    return bill
