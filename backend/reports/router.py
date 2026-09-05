from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import require_roles
from reports import service
from reports.schemas import BalanceSheet, BudgetReport, ProfitAndLoss

router = APIRouter(prefix="/reports", tags=["reports"])

CAN_VIEW = require_roles("admin", "accountant")


@router.get("/balance-sheet", response_model=BalanceSheet)
def get_balance_sheet(db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.balance_sheet(db)


@router.get("/profit-and-loss", response_model=ProfitAndLoss)
def get_profit_and_loss(db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.profit_and_loss(db)


@router.get("/budget-report", response_model=BudgetReport)
def get_budget_report(db: Session = Depends(get_db), _user=Depends(CAN_VIEW)):
    return service.budget_report(db)
