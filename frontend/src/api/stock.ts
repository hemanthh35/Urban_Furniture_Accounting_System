import { request } from "./client";

export interface StockRow {
  product_id: number;
  product_name: string;
  quantity_in: number;
  quantity_out: number;
  quantity_on_hand: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  source_type: string;
  source_id: number;
  movement_date: string;
  quantity_delta: number;
  reason: string | null;
}

export const stockApi = {
  report: (fromDate = "", toDate = "") => request<StockRow[]>(`/stock/report${stockQuery(fromDate, toDate)}`),
  movements: (fromDate = "", toDate = "") => request<StockMovement[]>(`/stock/movements${stockQuery(fromDate, toDate)}`),
  adjust: (payload: { product_id: number; quantity_delta: number; movement_date: string; reason?: string | null }) =>
    request<StockMovement>("/stock/adjustments", { method: "POST", body: payload }),
};

function stockQuery(fromDate: string, toDate: string): string {
  const params = new URLSearchParams();
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}
