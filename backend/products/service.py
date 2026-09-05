from sqlalchemy.orm import Session

from core.errors import AppError
from products.models import Product
from products.schemas import ProductCreate


def list_products(db: Session) -> list[Product]:
    return db.query(Product).all()


def get_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", f"Product {product_id} does not exist", 404)
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
