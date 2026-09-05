import { request } from "./client";

export interface Product {
  id: number;
  name: string;
  type: "Goods" | "Service" | "Combo";
  sales_price_cents: number;
  cost_cents: number;
  category: string | null;
}

export interface ProductCreate {
  name: string;
  type: string;
  sales_price_cents: number;
  cost_cents: number;
  category?: string | null;
}

export const productsApi = {
  list: () => request<Product[]>("/products"),
  create: (payload: ProductCreate) => request<Product>("/products", { method: "POST", body: payload }),
};
