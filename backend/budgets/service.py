from sqlalchemy.orm import Session

from budgets.models import AnalyticAccount, Budget
from budgets.schemas import AnalyticAccountCreate, AnalyticAccountUpdate, BudgetCreate, BudgetUpdate
from core.errors import AppError


def list_analytic_accounts(db: Session) -> list[AnalyticAccount]:
    return db.query(AnalyticAccount).filter(AnalyticAccount.is_archived.is_(False)).all()


def create_analytic_account(db: Session, payload: AnalyticAccountCreate) -> AnalyticAccount:
    account = AnalyticAccount(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_analytic_account(db: Session, account_id: int, payload: AnalyticAccountUpdate) -> AnalyticAccount:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
    for field, value in payload.model_dump().items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def archive_analytic_account(db: Session, account_id: int) -> None:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
    account.is_archived = True
    db.commit()


def list_budgets(db: Session) -> list[Budget]:
    return db.query(Budget).filter(Budget.is_archived.is_(False)).all()


def create_budget(db: Session, payload: BudgetCreate) -> Budget:
    if not db.query(AnalyticAccount).filter(AnalyticAccount.id == payload.analytic_account_id).first():
        raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
    budget = Budget(**payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update_budget(db: Session, budget_id: int, payload: BudgetUpdate) -> Budget:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise AppError("BUDGET_NOT_FOUND", "That budget does not exist", 404)
    if not db.query(AnalyticAccount).filter(AnalyticAccount.id == payload.analytic_account_id).first():
        raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
    for field, value in payload.model_dump().items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return budget


def archive_budget(db: Session, budget_id: int) -> None:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise AppError("BUDGET_NOT_FOUND", "That budget does not exist", 404)
    budget.is_archived = True
    db.commit()
