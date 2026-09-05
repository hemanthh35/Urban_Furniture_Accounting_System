from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from products import service
from products.schemas import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_products(db)


@router.post("", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_product(db, payload)
