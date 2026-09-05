from sqlalchemy.orm import Session

from budgets.models import AnalyticAccount, Budget
from budgets.schemas import AnalyticAccountCreate, BudgetCreate
from core.errors import AppError


def list_analytic_accounts(db: Session) -> list[AnalyticAccount]:
    return db.query(AnalyticAccount).all()


def create_analytic_account(db: Session, payload: AnalyticAccountCreate) -> AnalyticAccount:
    account = AnalyticAccount(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def list_budgets(db: Session) -> list[Budget]:
    return db.query(Budget).all()


def create_budget(db: Session, payload: BudgetCreate) -> Budget:
    if not db.query(AnalyticAccount).filter(AnalyticAccount.id == payload.analytic_account_id).first():
        raise AppError("ANALYTIC_ACCOUNT_NOT_FOUND", "That analytic account does not exist", 404)
    budget = Budget(**payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget
