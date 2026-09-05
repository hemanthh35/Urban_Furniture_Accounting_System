from pydantic import BaseModel


class AnalyticAccountCreate(BaseModel):
    name: str
    type: str  # Income | Expenses


class AnalyticAccountOut(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    name: str
    period: str
    responsible_person: str | None = None
    planned_amount_cents: int
    analytic_account_id: int


class BudgetOut(BaseModel):
    id: int
    name: str
    period: str
    responsible_person: str | None
    planned_amount_cents: int
    analytic_account_id: int

    class Config:
        from_attributes = True
