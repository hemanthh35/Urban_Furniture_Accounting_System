from pydantic import BaseModel


class AccountBalance(BaseModel):
    account_name: str
    balance_cents: int


class BalanceSheet(BaseModel):
    assets: list[AccountBalance]
    liabilities: list[AccountBalance]
    capital: list[AccountBalance]
    total_assets_cents: int
    total_liabilities_cents: int
    total_capital_cents: int


class ProfitAndLoss(BaseModel):
    income: list[AccountBalance]
    expenses: list[AccountBalance]
    total_income_cents: int
    total_expenses_cents: int
    net_profit_cents: int


class BudgetReportRow(BaseModel):
    budget_name: str
    period: str
    analytic_account_name: str
    planned_amount_cents: int


class BudgetReport(BaseModel):
    rows: list[BudgetReportRow]
