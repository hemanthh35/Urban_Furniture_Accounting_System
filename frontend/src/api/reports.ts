import { request } from "./client";

export interface AccountBalance {
  account_name: string;
  balance_cents: number;
}

export interface BalanceSheet {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  capital: AccountBalance[];
  total_assets_cents: number;
  total_liabilities_cents: number;
  total_capital_cents: number;
}

export interface ProfitAndLoss {
  income: AccountBalance[];
  expenses: AccountBalance[];
  total_income_cents: number;
  total_expenses_cents: number;
  net_profit_cents: number;
}

export interface BudgetReportRow {
  budget_name: string;
  period: string;
  analytic_account_name: string;
  planned_amount_cents: number;
}

export interface BudgetReport {
  rows: BudgetReportRow[];
}

export const reportsApi = {
  balanceSheet: () => request<BalanceSheet>("/reports/balance-sheet"),
  profitAndLoss: () => request<ProfitAndLoss>("/reports/profit-and-loss"),
  budgetReport: () => request<BudgetReport>("/reports/budget-report"),
};
