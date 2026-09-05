from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from budgets import service
from budgets.schemas import AnalyticAccountCreate, AnalyticAccountOut, BudgetCreate, BudgetOut
from core.database import get_db
from core.security import require_roles

router = APIRouter(tags=["budgets"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("/analytic-accounts", response_model=list[AnalyticAccountOut])
def list_analytic_accounts(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_analytic_accounts(db)


@router.post("/analytic-accounts", response_model=AnalyticAccountOut)
def create_analytic_account(payload: AnalyticAccountCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_analytic_account(db, payload)


@router.get("/budgets", response_model=list[BudgetOut])
def list_budgets(db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_budgets(db)


@router.post("/budgets", response_model=BudgetOut)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_budget(db, payload)
