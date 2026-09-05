from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from stock import service
from stock.schemas import StockMovementOut, StockReportRow

router = APIRouter(prefix="/stock", tags=["stock"])
CAN_READ = require_roles("admin", "accountant")


@router.get("/report", response_model=list[StockReportRow])
def stock_report(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_stock(db)


@router.get("/movements", response_model=list[StockMovementOut])
def stock_movements(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_movements(db)
