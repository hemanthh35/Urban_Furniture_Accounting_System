from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.errors import AppError
from products.models import Product
from stock.models import StockMovement


def add_movements_for_bill(db: Session, bill_id: int, movement_date: date, items) -> None:
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise AppError("PRODUCT_NOT_FOUND", f"Product {item.product_id} does not exist", 404)
        if product.type != "Service":
            db.add(StockMovement(
                product_id=item.product_id,
                source_type="vendor_bill",
                source_id=bill_id,
                movement_date=movement_date,
                quantity_delta=item.quantity,
            ))


def add_movements_for_invoice(db: Session, invoice_id: int, movement_date: date, items) -> None:
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise AppError("PRODUCT_NOT_FOUND", f"Product {item.product_id} does not exist", 404)
        if product.type != "Service":
            db.add(StockMovement(
                product_id=item.product_id,
                source_type="customer_invoice",
                source_id=invoice_id,
                movement_date=movement_date,
                quantity_delta=-item.quantity,
            ))


def list_stock(db: Session) -> list[dict]:
    rows = (
        db.query(
            Product.id,
            Product.name,
            func.coalesce(func.sum(StockMovement.quantity_delta), 0),
        )
        .join(StockMovement, StockMovement.product_id == Product.id, isouter=True)
        .filter(Product.is_archived.is_(False))
        .group_by(Product.id)
        .order_by(Product.name)
        .all()
    )
    report = []
    for product_id, product_name, on_hand in rows:
        movements = db.query(StockMovement).filter(StockMovement.product_id == product_id).all()
        quantity_in = sum(max(m.quantity_delta, 0) for m in movements)
        quantity_out = sum(abs(min(m.quantity_delta, 0)) for m in movements)
        report.append({
            "product_id": product_id,
            "product_name": product_name,
            "quantity_in": quantity_in,
            "quantity_out": quantity_out,
            "quantity_on_hand": on_hand,
        })
    return report


def list_movements(db: Session) -> list[StockMovement]:
    return db.query(StockMovement).order_by(StockMovement.movement_date.desc(), StockMovement.id.desc()).all()
