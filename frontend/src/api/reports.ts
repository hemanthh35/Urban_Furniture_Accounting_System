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
  actual_amount_cents: number;
  remaining_amount_cents: number;
}

export interface BudgetReport {
  rows: BudgetReportRow[];
}

export interface DashboardSummary {
  total_assets_cents: number;
  total_liabilities_cents: number;
  total_capital_cents: number;
  total_income_cents: number;
  total_expenses_cents: number;
  top_expense_account: string | null;
  top_expense_cents: number;
  top_income_account: string | null;
  top_income_cents: number;
  net_profit_cents: number;
  outstanding_invoices_cents: number;
  outstanding_bills_cents: number;
  products_in_stock: number;
  units_in_stock: number;
  budget_planned_cents: number;
  budget_actual_cents: number;
  draft_purchase_orders: number;
  draft_sales_orders: number;
}

export interface PdfLink {
  url: string;
  expires_at: number;
}

export const reportsApi = {
  balanceSheet: (fromDate = "", toDate = "") => request<BalanceSheet>(`/reports/balance-sheet${reportQuery(fromDate, toDate)}`),
  profitAndLoss: (fromDate = "", toDate = "") => request<ProfitAndLoss>(`/reports/profit-and-loss${reportQuery(fromDate, toDate)}`),
  budgetReport: (fromDate = "", toDate = "") => request<BudgetReport>(`/reports/budget-report${reportQuery(fromDate, toDate)}`),
  dashboardSummary: () => request<DashboardSummary>("/reports/dashboard-summary"),

  // Returns a signed, short-lived download URL - safe to open directly in a new
  // tab since it carries its own proof of authorization, no login header needed.
  invoicePdfLink: (invoiceId: number) => request<PdfLink>(`/reports/customer-invoices/${invoiceId}/pdf-link`),
  billPdfLink: (billId: number) => request<PdfLink>(`/reports/vendor-bills/${billId}/pdf-link`),
};

function reportQuery(fromDate: string, toDate: string): string {
  const params = new URLSearchParams();
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}
