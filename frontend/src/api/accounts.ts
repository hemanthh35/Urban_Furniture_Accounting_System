import { request } from "./client";

export interface Account {
  id: number;
  name: string;
  type: "Asset" | "Liability" | "Expense" | "Income" | "Capital";
  is_archived: boolean;
}

export interface AccountCreate {
  name: string;
  type: string;
}

export type AccountUpdate = AccountCreate;

export const accountsApi = {
  list: (includeArchived = false) => request<Account[]>(`/accounts${includeArchived ? "?include_archived=true" : ""}`),
  create: (payload: AccountCreate) => request<Account>("/accounts", { method: "POST", body: payload }),
  update: (id: number, payload: AccountUpdate) => request<Account>(`/accounts/${id}`, { method: "PUT", body: payload }),
  archive: (id: number) => request<void>(`/accounts/${id}/archive`, { method: "POST" }),
  restore: (id: number) => request<void>(`/accounts/${id}/restore`, { method: "POST" }),
};
