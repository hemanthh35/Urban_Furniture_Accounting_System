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
    actual_amount_cents: int
    remaining_amount_cents: int


class BudgetReport(BaseModel):
    rows: list[BudgetReportRow]


class DashboardSummary(BaseModel):
    total_assets_cents: int
    total_liabilities_cents: int
    total_capital_cents: int
    total_income_cents: int
    total_expenses_cents: int
    top_expense_account: str | None
    top_expense_cents: int
    top_income_account: str | None
    top_income_cents: int
    net_profit_cents: int
    outstanding_invoices_cents: int
    outstanding_bills_cents: int
    products_in_stock: int
    units_in_stock: int
    budget_planned_cents: int
    budget_actual_cents: int
    draft_purchase_orders: int
    draft_sales_orders: int
