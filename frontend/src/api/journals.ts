import { request } from "./client";

export interface Journal {
  id: number;
  name: string;
  type: string;
  default_account_id: number | null;
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
  list: () => request<Journal[]>("/journals"),
  create: (payload: { name: string; type: string; default_account_id?: number | null }) =>
    request<Journal>("/journals", { method: "POST", body: payload }),
  listEntries: () => request<JournalEntry[]>("/journals/entries"),
};
