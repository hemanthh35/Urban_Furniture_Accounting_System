from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from stock import service
from stock.schemas import StockAdjustmentCreate, StockMovementOut, StockReportRow

router = APIRouter(prefix="/stock", tags=["stock"])
CAN_READ = require_roles("admin", "accountant")


@router.get("/report", response_model=list[StockReportRow])
def stock_report(from_date: date | None = None, to_date: date | None = None, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_stock(db, from_date, to_date)


@router.get("/movements", response_model=list[StockMovementOut])
def stock_movements(from_date: date | None = None, to_date: date | None = None, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_movements(db, from_date, to_date)


@router.post("/adjustments", response_model=StockMovementOut)
def create_adjustment(payload: StockAdjustmentCreate, db: Session = Depends(get_db), _user=Depends(require_roles("admin", "accountant"))):
    return service.create_adjustment(db, payload.product_id, payload.quantity_delta, payload.movement_date, payload.reason)
