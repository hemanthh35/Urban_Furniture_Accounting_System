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

export const budgetsApi = {
  listAnalyticAccounts: () => request<AnalyticAccount[]>("/analytic-accounts"),
  createAnalyticAccount: (payload: { name: string; type: string }) =>
    request<AnalyticAccount>("/analytic-accounts", { method: "POST", body: payload }),

  listBudgets: () => request<Budget[]>("/budgets"),
  createBudget: (payload: {
    name: string;
    period: string;
    responsible_person?: string | null;
    planned_amount_cents: number;
    analytic_account_id: number;
  }) => request<Budget>("/budgets", { method: "POST", body: payload }),
};
