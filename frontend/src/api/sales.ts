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
  status: "draft" | "invoiced" | "cancelled";
  items: SalesOrderItem[];
}

export interface CustomerInvoice {
  id: number;
  sales_order_id: number;
  invoice_date: string;
  due_date: string | null;
  amount_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  paid_amount_cents: number;
  outstanding_amount_cents: number;
  status: "unpaid" | "partial" | "paid";
}

export interface CustomerInvoiceLineDetail extends SalesOrderItem {
  product_name: string;
}

export interface CustomerInvoiceDetail extends CustomerInvoice {
  items: CustomerInvoiceLineDetail[];
  payments: { id: number; method: string; amount_cents: number; date: string }[];
}

export interface SalesOrderPayload {
  customer_id: number;
  analytic_account_id?: number | null;
  order_date: string;
  items: { product_id: number; quantity: number; unit_price_cents: number; tax_percent: number }[];
}

export interface CheckoutResponse {
  razorpay_key_id: string;
  razorpay_order_id: string;
  amount_cents: number;
  currency: string;
  customer_invoice_id: number;
}

export const salesApi = {
  list: () => request<SalesOrder[]>("/sales-orders"),
  create: (payload: SalesOrderPayload) =>
    request<SalesOrder>("/sales-orders", { method: "POST", body: payload }),
  update: (id: number, payload: SalesOrderPayload) =>
    request<SalesOrder>(`/sales-orders/${id}`, { method: "PUT", body: payload }),
  cancel: (id: number) => request<void>(`/sales-orders/${id}/cancel`, { method: "POST" }),

  generateInvoice: (soId: number, invoice_date: string, due_date?: string | null) =>
    request<CustomerInvoice>(`/sales-orders/${soId}/generate-invoice`, { method: "POST", body: { invoice_date, due_date } }),

  listInvoices: () => request<CustomerInvoice[]>("/customer-invoices"),
  getInvoice: (id: number) => request<CustomerInvoiceDetail>(`/customer-invoices/${id}`),

  payInvoice: (invoiceId: number, method: string, amount_cents: number, date: string) =>
    request(`/customer-invoices/${invoiceId}/pay`, { method: "POST", body: { customer_invoice_id: invoiceId, method, amount_cents, date } }),

  checkout: (invoiceId: number) =>
    request<CheckoutResponse>(`/customer-invoices/${invoiceId}/checkout`, { method: "POST" }),

  // No login needed - this is the "Pay Now" link from an invoice/reminder
  // email, authorized by its own signed token instead of a session.
  publicCheckout: (invoiceId: number, token: string) =>
    request<CheckoutResponse>(`/public/customer-invoices/${invoiceId}/checkout?token=${encodeURIComponent(token)}`, { method: "POST" }),
  publicInvoiceDetail: (invoiceId: number, token: string) =>
    request<CustomerInvoiceDetail>(`/public/customer-invoices/${invoiceId}?token=${encodeURIComponent(token)}`),
};
