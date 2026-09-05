import { request } from "./client";

export interface AnalyticAccount {
  id: number;
  name: string;
  type: "Income" | "Expenses";
}

export interface Budget {
  id: number;
  name: string;
  period: string;
  responsible_person: string | null;
  planned_amount_cents: number;
  analytic_account_id: number;
}

export type AnalyticAccountUpdate = { name: string; type: string };
export type BudgetUpdate = {
  name: string;
  period: string;
  responsible_person?: string | null;
  planned_amount_cents: number;
  analytic_account_id: number;
};

export const budgetsApi = {
  listAnalyticAccounts: () => request<AnalyticAccount[]>("/analytic-accounts"),
  createAnalyticAccount: (payload: { name: string; type: string }) =>
    request<AnalyticAccount>("/analytic-accounts", { method: "POST", body: payload }),
  updateAnalyticAccount: (id: number, payload: AnalyticAccountUpdate) =>
    request<AnalyticAccount>(`/analytic-accounts/${id}`, { method: "PUT", body: payload }),
  archiveAnalyticAccount: (id: number) => request<void>(`/analytic-accounts/${id}/archive`, { method: "POST" }),

  listBudgets: () => request<Budget[]>("/budgets"),
  createBudget: (payload: {
    name: string;
    period: string;
    responsible_person?: string | null;
    planned_amount_cents: number;
    analytic_account_id: number;
  }) => request<Budget>("/budgets", { method: "POST", body: payload }),
  updateBudget: (id: number, payload: BudgetUpdate) => request<Budget>(`/budgets/${id}`, { method: "PUT", body: payload }),
  archiveBudget: (id: number) => request<void>(`/budgets/${id}/archive`, { method: "POST" }),
};
