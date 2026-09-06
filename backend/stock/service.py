from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.errors import AppError
from products.models import Product
from stock.models import StockMovement


def current_quantity(db: Session, product_id: int) -> int:
    return db.query(func.coalesce(func.sum(StockMovement.quantity_delta), 0)).filter(StockMovement.product_id == product_id).scalar() or 0


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
    # Two lines can share the same product (e.g. a split order at different
    # tax rates) - they have to be checked against their COMBINED quantity in
    # one pass. The session doesn't autoflush, so checking current_quantity()
    # one line at a time would never see an earlier line's still-pending
    # deduction, and both lines could pass individually even though together
    # they oversell what's actually on hand.
    requested_by_product: dict[int, int] = {}
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise AppError("PRODUCT_NOT_FOUND", f"Product {item.product_id} does not exist", 404)
        if product.type != "Service":
            requested_by_product[item.product_id] = requested_by_product.get(item.product_id, 0) + item.quantity

    for product_id, total_requested in requested_by_product.items():
        if current_quantity(db, product_id) < total_requested:
            product = db.query(Product).filter(Product.id == product_id).first()
            raise AppError("INSUFFICIENT_STOCK", f"Not enough stock for product {product.name}", 400)

    for item in items:
        if item.product_id in requested_by_product:
            db.add(StockMovement(
                product_id=item.product_id,
                source_type="customer_invoice",
                source_id=invoice_id,
                movement_date=movement_date,
                quantity_delta=-item.quantity,
            ))


def create_adjustment(db: Session, product_id: int, quantity_delta: int, movement_date: date, reason: str | None) -> StockMovement:
    product = db.query(Product).filter(Product.id == product_id, Product.is_archived.is_(False)).first()
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", f"Product {product_id} does not exist", 404)
    if product.type == "Service":
        raise AppError("SERVICE_HAS_NO_STOCK", "Service products do not have stock", 400)
    if quantity_delta == 0:
        raise AppError("INVALID_STOCK_ADJUSTMENT", "Stock adjustment cannot be zero", 400)
    if quantity_delta < 0 and current_quantity(db, product_id) + quantity_delta < 0:
        raise AppError("INSUFFICIENT_STOCK", "Stock cannot become negative", 400)
    movement = StockMovement(
        product_id=product_id,
        source_type="adjustment",
        source_id=0,
        movement_date=movement_date,
        quantity_delta=quantity_delta,
        reason=reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def list_stock(db: Session, from_date: date | None = None, to_date: date | None = None) -> list[dict]:
    rows = (
        db.query(
            Product.id,
            Product.name,
        )
        .join(StockMovement, StockMovement.product_id == Product.id, isouter=True)
        .filter(Product.is_archived.is_(False))
        .group_by(Product.id)
        .order_by(Product.name)
        .all()
    )
    report = []
    for product_id, product_name in rows:
        movement_query = db.query(StockMovement).filter(StockMovement.product_id == product_id)
        if from_date:
            movement_query = movement_query.filter(StockMovement.movement_date >= from_date)
        if to_date:
            movement_query = movement_query.filter(StockMovement.movement_date <= to_date)
        movements = movement_query.all()
        quantity_in = sum(max(m.quantity_delta, 0) for m in movements)
        quantity_out = sum(abs(min(m.quantity_delta, 0)) for m in movements)
        report.append({
            "product_id": product_id,
            "product_name": product_name,
            "quantity_in": quantity_in,
            "quantity_out": quantity_out,
            "quantity_on_hand": quantity_in - quantity_out,
        })
    return report


def list_movements(db: Session, from_date: date | None = None, to_date: date | None = None) -> list[StockMovement]:
    query = db.query(StockMovement)
    if from_date:
        query = query.filter(StockMovement.movement_date >= from_date)
    if to_date:
        query = query.filter(StockMovement.movement_date <= to_date)
    return query.order_by(StockMovement.movement_date.desc(), StockMovement.id.desc()).all()
