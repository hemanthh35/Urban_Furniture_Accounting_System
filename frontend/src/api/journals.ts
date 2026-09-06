import { request } from "./client";

export interface Journal {
  id: number;
  name: string;
  type: string;
  default_account_id: number | null;
  is_archived?: boolean;
}

export interface JournalEntryLine {
  id: number;
  account_id: number;
  account_name: string;
  debit_cents: number;
  credit_cents: number;
}

export interface JournalEntry {
  id: number;
  journal_id: number;
  journal_name: string;
  date: string;
  reference: string | null;
  lines: JournalEntryLine[];
}

export const journalsApi = {
  list: (includeArchived = false) => request<Journal[]>(`/journals${includeArchived ? "?include_archived=true" : ""}`),
  create: (payload: { name: string; type: string; default_account_id?: number | null }) =>
    request<Journal>("/journals", { method: "POST", body: payload }),
  update: (id: number, payload: { name: string; type: string; default_account_id?: number | null }) =>
    request<Journal>(`/journals/${id}`, { method: "PUT", body: payload }),
  archive: (id: number) => request<void>(`/journals/${id}/archive`, { method: "POST" }),
  restore: (id: number) => request<void>(`/journals/${id}/restore`, { method: "POST" }),
  listEntries: () => request<JournalEntry[]>("/journals/entries"),
  createOpeningBalance: (payload: { date: string; cash_cents: number; bank_cents: number }) =>
    request<JournalEntry>("/journals/opening-balance", { method: "POST", body: payload }),
};
