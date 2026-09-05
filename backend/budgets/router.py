from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from budgets import service
from budgets.schemas import (
    AnalyticAccountCreate,
    AnalyticAccountOut,
    AnalyticAccountUpdate,
    BudgetCreate,
    BudgetOut,
    BudgetUpdate,
)
from core.database import get_db
from core.security import require_roles

router = APIRouter(tags=["budgets"])

CAN_WRITE = require_roles("admin", "accountant")
CAN_READ = require_roles("admin", "accountant")


@router.get("/analytic-accounts", response_model=list[AnalyticAccountOut])
def list_analytic_accounts(include_archived: bool = False, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_analytic_accounts(db, include_archived)


@router.post("/analytic-accounts", response_model=AnalyticAccountOut)
def create_analytic_account(payload: AnalyticAccountCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_analytic_account(db, payload)


@router.put("/analytic-accounts/{account_id}", response_model=AnalyticAccountOut)
def update_analytic_account(account_id: int, payload: AnalyticAccountUpdate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_analytic_account(db, account_id, payload)


@router.post("/analytic-accounts/{account_id}/archive", status_code=204)
def archive_analytic_account(account_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_analytic_account(db, account_id)


@router.post("/analytic-accounts/{account_id}/restore", status_code=204)
def restore_analytic_account(account_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.restore_analytic_account(db, account_id)


@router.get("/budgets", response_model=list[BudgetOut])
def list_budgets(include_archived: bool = False, db: Session = Depends(get_db), _user=Depends(CAN_READ)):
    return service.list_budgets(db, include_archived)


@router.post("/budgets", response_model=BudgetOut)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.create_budget(db, payload)


@router.put("/budgets/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, payload: BudgetUpdate, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    return service.update_budget(db, budget_id, payload)


@router.post("/budgets/{budget_id}/archive", status_code=204)
def archive_budget(budget_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.archive_budget(db, budget_id)


@router.post("/budgets/{budget_id}/restore", status_code=204)
def restore_budget(budget_id: int, db: Session = Depends(get_db), _user=Depends(CAN_WRITE)):
    service.restore_budget(db, budget_id)
