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
}

export const stockApi = {
  report: () => request<StockRow[]>("/stock/report"),
  movements: () => request<StockMovement[]>("/stock/movements"),
};
