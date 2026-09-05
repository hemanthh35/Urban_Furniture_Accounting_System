import { request } from "./client";

export interface SalesOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price_cents: number;
  tax_percent: number;
}

export interface SalesOrder {
  id: number;
  customer_id: number;
  analytic_account_id: number | null;
  order_date: string;
  status: "draft" | "invoiced";
  items: SalesOrderItem[];
}

export interface CustomerInvoice {
  id: number;
  sales_order_id: number;
  invoice_date: string;
  due_date: string | null;
  amount_cents: number;
  status: "unpaid" | "partial" | "paid";
}

export interface CustomerInvoiceDetail extends CustomerInvoice {
  items: SalesOrderItem[];
  payments: { id: number; method: string; amount_cents: number; date: string }[];
}

export const salesApi = {
  list: () => request<SalesOrder[]>("/sales-orders"),
  create: (payload: { customer_id: number; analytic_account_id?: number | null; order_date: string; items: { product_id: number; quantity: number; unit_price_cents: number; tax_percent: number }[] }) =>
    request<SalesOrder>("/sales-orders", { method: "POST", body: payload }),

  generateInvoice: (soId: number, invoice_date: string, due_date?: string | null) =>
    request<CustomerInvoice>(`/sales-orders/${soId}/generate-invoice`, { method: "POST", body: { invoice_date, due_date } }),

  listInvoices: () => request<CustomerInvoice[]>("/customer-invoices"),
  getInvoice: (id: number) => request<CustomerInvoiceDetail>(`/customer-invoices/${id}`),

  payInvoice: (invoiceId: number, method: string, amount_cents: number, date: string) =>
    request(`/customer-invoices/${invoiceId}/pay`, { method: "POST", body: { customer_invoice_id: invoiceId, method, amount_cents, date } }),
};
