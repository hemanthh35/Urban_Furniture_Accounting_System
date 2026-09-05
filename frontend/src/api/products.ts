import { request } from "./client";

export interface Product {
  id: number;
  name: string;
  type: "Goods" | "Service" | "Combo";
  sales_price_cents: number;
  cost_cents: number;
  category: string | null;
  is_archived: boolean;
}

export interface ProductCreate {
  name: string;
  type: string;
  sales_price_cents: number;
  cost_cents: number;
  category?: string | null;
}

export type ProductUpdate = ProductCreate;

export const productsApi = {
  list: (includeArchived = false) => request<Product[]>(`/products${includeArchived ? "?include_archived=true" : ""}`),
  create: (payload: ProductCreate) => request<Product>("/products", { method: "POST", body: payload }),
  update: (id: number, payload: ProductUpdate) => request<Product>(`/products/${id}`, { method: "PUT", body: payload }),
  archive: (id: number) => request<void>(`/products/${id}/archive`, { method: "POST" }),
  restore: (id: number) => request<void>(`/products/${id}/restore`, { method: "POST" }),
};
