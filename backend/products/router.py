from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from products import service
from products.schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[ProductOut])
def list_products(include_archived: bool = False, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_products(db, include_archived)


@router.post("", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_product(db, payload)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_product(db, product_id, payload)


@router.post("/{product_id}/archive", status_code=204)
def archive_product(product_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_product(db, product_id)


@router.post("/{product_id}/restore", status_code=204)
def restore_product(product_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.restore_product(db, product_id)
