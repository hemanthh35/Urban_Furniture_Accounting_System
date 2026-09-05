from sqlalchemy.orm import Session

from core.errors import AppError
from products.models import Product
from products.schemas import ProductCreate, ProductUpdate


def list_products(db: Session, include_archived: bool = False) -> list[Product]:
    query = db.query(Product)
    if not include_archived:
        query = query.filter(Product.is_archived.is_(False))
    return query.all()


def get_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", f"Product {product_id} does not exist", 404)
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    if payload.type not in ("Goods", "Service", "Combo"):
        raise AppError("INVALID_PRODUCT_TYPE", "Product type must be Goods, Service, or Combo", 400)
    if payload.sales_price_cents < 0 or payload.cost_cents < 0:
        raise AppError("INVALID_PRODUCT_PRICE", "Product prices cannot be negative", 400)
    if payload.gst_percent < 0 or payload.gst_percent > 100:
        raise AppError("INVALID_GST_PERCENT", "GST percent must be between 0 and 100", 400)
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    if payload.type not in ("Goods", "Service", "Combo"):
        raise AppError("INVALID_PRODUCT_TYPE", "Product type must be Goods, Service, or Combo", 400)
    if payload.sales_price_cents < 0 or payload.cost_cents < 0:
        raise AppError("INVALID_PRODUCT_PRICE", "Product prices cannot be negative", 400)
    if payload.gst_percent < 0 or payload.gst_percent > 100:
        raise AppError("INVALID_GST_PERCENT", "GST percent must be between 0 and 100", 400)
    product = get_product(db, product_id)
    for field, value in payload.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def import_product_row(db: Session, row: dict) -> None:
    """One row of a bulk-upload CSV -> one Product, via the exact same
    create_product() validation a manually-typed form goes through. Prices in
    the CSV are rupees (what a human would type), converted to cents here same
    as the New Product form does."""
    name = (row.get("name") or "").strip()
    if not name:
        raise AppError("NAME_REQUIRED", "Name is required", 400)
    try:
        sales_price = round(float(row.get("sales_price") or 0) * 100)
        cost = round(float(row.get("cost") or 0) * 100)
        gst_percent = int(float(row.get("gst_percent") or 0))
    except ValueError:
        raise AppError("INVALID_NUMBER", "sales_price, cost, and gst_percent must be numbers", 400)
    payload = ProductCreate(
        name=name,
        type=(row.get("type") or "").strip(),
        sales_price_cents=sales_price,
        cost_cents=cost,
        category=(row.get("category") or "").strip() or None,
        gst_percent=gst_percent,
    )
    create_product(db, payload)


def archive_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    product.is_archived = True
    db.commit()


def restore_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    product.is_archived = False
    db.commit()
