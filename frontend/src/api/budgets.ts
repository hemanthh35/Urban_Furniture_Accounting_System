import { request } from "./client";

export interface AnalyticAccount {
  id: number;
  name: string;
  type: "Income" | "Expenses";
  is_archived: boolean;
}

export interface Budget {
  id: number;
  name: string;
  period: string;
  responsible_person: string | null;
  planned_amount_cents: number;
  analytic_account_id: number;
  start_date: string | null;
  end_date: string | null;
  is_archived: boolean;
}

export type AnalyticAccountUpdate = { name: string; type: string };
export type BudgetUpdate = {
  name: string;
  period: string;
  responsible_person?: string | null;
  planned_amount_cents: number;
  analytic_account_id: number;
  start_date: string;
  end_date: string;
};

export const budgetsApi = {
  listAnalyticAccounts: (includeArchived = false) => request<AnalyticAccount[]>(`/analytic-accounts${includeArchived ? "?include_archived=true" : ""}`),
  createAnalyticAccount: (payload: { name: string; type: string }) =>
    request<AnalyticAccount>("/analytic-accounts", { method: "POST", body: payload }),
  updateAnalyticAccount: (id: number, payload: AnalyticAccountUpdate) =>
    request<AnalyticAccount>(`/analytic-accounts/${id}`, { method: "PUT", body: payload }),
  archiveAnalyticAccount: (id: number) => request<void>(`/analytic-accounts/${id}/archive`, { method: "POST" }),
  restoreAnalyticAccount: (id: number) => request<void>(`/analytic-accounts/${id}/restore`, { method: "POST" }),

  listBudgets: (includeArchived = false) => request<Budget[]>(`/budgets${includeArchived ? "?include_archived=true" : ""}`),
  createBudget: (payload: {
    name: string;
    period: string;
    responsible_person?: string | null;
    planned_amount_cents: number;
    analytic_account_id: number;
    start_date: string;
    end_date: string;
  }) => request<Budget>("/budgets", { method: "POST", body: payload }),
  updateBudget: (id: number, payload: BudgetUpdate) => request<Budget>(`/budgets/${id}`, { method: "PUT", body: payload }),
  archiveBudget: (id: number) => request<void>(`/budgets/${id}/archive`, { method: "POST" }),
  restoreBudget: (id: number) => request<void>(`/budgets/${id}/restore`, { method: "POST" }),
};
