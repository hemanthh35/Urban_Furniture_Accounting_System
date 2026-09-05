from datetime import date

from pydantic import BaseModel


class AnalyticAccountCreate(BaseModel):
    name: str
    type: str  # Income | Expenses


class AnalyticAccountUpdate(AnalyticAccountCreate):
    pass


class AnalyticAccountOut(BaseModel):
    id: int
    name: str
    type: str
    is_archived: bool = False

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    name: str
    period: str
    responsible_person: str | None = None
    planned_amount_cents: int
    analytic_account_id: int
    start_date: date
    end_date: date


class BudgetUpdate(BudgetCreate):
    pass


class BudgetOut(BaseModel):
    id: int
    name: str
    period: str
    responsible_person: str | None
    planned_amount_cents: int
    analytic_account_id: int
    start_date: date | None
    end_date: date | None
    is_archived: bool = False

    class Config:
        from_attributes = True
