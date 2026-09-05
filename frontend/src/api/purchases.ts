import { request } from "./client";

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price_cents: number;
}

export interface PurchaseOrder {
  id: number;
  vendor_id: number;
  analytic_account_id: number | null;
  order_date: string;
  status: "draft" | "billed";
  items: PurchaseOrderItem[];
}

export interface VendorBill {
  id: number;
  purchase_order_id: number;
  bill_date: string;
  due_date: string | null;
  amount_cents: number;
  status: "unpaid" | "partial" | "paid";
}

export interface VendorBillDetail extends VendorBill {
  items: PurchaseOrderItem[];
  payments: { id: number; method: string; amount_cents: number; date: string }[];
}

export const purchasesApi = {
  list: () => request<PurchaseOrder[]>("/purchase-orders"),
  create: (payload: { vendor_id: number; analytic_account_id?: number | null; order_date: string; items: { product_id: number; quantity: number; unit_price_cents: number }[] }) =>
    request<PurchaseOrder>("/purchase-orders", { method: "POST", body: payload }),

  convertToBill: (poId: number, bill_date: string, due_date?: string | null) =>
    request<VendorBill>(`/purchase-orders/${poId}/convert-to-bill`, { method: "POST", body: { bill_date, due_date } }),

  listBills: () => request<VendorBill[]>("/vendor-bills"),
  getBill: (id: number) => request<VendorBillDetail>(`/vendor-bills/${id}`),

  payBill: (billId: number, method: string, amount_cents: number, date: string) =>
    request(`/vendor-bills/${billId}/pay`, { method: "POST", body: { vendor_bill_id: billId, method, amount_cents, date } }),
};
