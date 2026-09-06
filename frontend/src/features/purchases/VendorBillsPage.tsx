import { useEffect, useState, type FormEvent } from "react";
import { purchasesApi, type VendorBill, type VendorBillDetail } from "../../api/purchases";
import { contactsApi, type Contact } from "../../api/contacts";
import { productsApi, type Product } from "../../api/products";
import { reportsApi } from "../../api/reports";
import { ApiError, BASE_URL } from "../../api/client";
import Modal from "../../components/Modal";
import BillPreview from "../../components/BillPreview";
import Pagination from "../../components/Pagination";
import DateRangeExport from "../../components/DateRangeExport";
import Select from "../../components/Select";
import { usePagination } from "../../hooks/usePagination";
import { formatMoney } from "../../utils/money";

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<{ id: number; vendor_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBill, setPayingBill] = useState<VendorBill | null>(null);
  const [viewingBill, setViewingBill] = useState<VendorBillDetail | null>(null);
  const [method, setMethod] = useState("Bank");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [billList, orderList, contactList, productList] = await Promise.all([
        purchasesApi.listBills(), purchasesApi.list(), contactsApi.list(), productsApi.list(),
      ]);
      setBills(billList);
      setPurchaseOrders(orderList);
      setContacts(contactList);
      setProducts(productList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payingBill) return;
    setFormError(null);
    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);
      await purchasesApi.payBill(payingBill.id, method, amountCents, new Date().toISOString().slice(0, 10));
      setPayingBill(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not record payment");
    } finally {
      setSaving(false);
    }
  }

  async function downloadBillPdf(billId: number) {
    // Open synchronously, inside the click handler, then redirect once the
    // signed link comes back - see the identical comment in CustomerInvoicesPage.
    const tab = window.open("", "_blank");
    try {
      const { url } = await reportsApi.billPdfLink(billId);
      if (tab) tab.location.href = `${BASE_URL}${url}`;
    } catch (err) {
      tab?.close();
      setFormError(err instanceof ApiError ? err.message : "Could not get the download link");
    }
  }

  async function viewBill(billId: number) {
    try {
      setViewingBill(await purchasesApi.getBill(billId));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not load bill details");
    }
  }

  const { pageItems, page, totalPages, setPage } = usePagination([...bills].sort((a, b) => b.id - a.id));
  const productName = (productId: number) => products.find((product) => product.id === productId)?.name;

  return (
    <div>
      <div className="page-head">
        <h1>Vendor Bills</h1>
        <DateRangeExport
          items={bills}
          getDate={(b) => b.bill_date}
          filename="vendor-bills.csv"
          headers={["Bill", "Vendor", "Bill Date", "Amount", "Status"]}
          toRow={(b) => [b.id, contacts.find((c) => c.id === purchaseOrders.find((po) => po.id === b.purchase_order_id)?.vendor_id)?.name ?? "", b.bill_date, (b.amount_cents / 100).toFixed(2), b.status]}
        />
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : bills.length === 0 ? (
        <div className="empty-state">No vendor bills yet - convert a Purchase Order into one first.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>From PO</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((b) => (
                <tr key={b.id}>
                  <td className="mono">#{b.id}</td>
                  <td className="muted">#{b.purchase_order_id}</td>
                  <td className="muted">{b.bill_date}</td>
                  <td className="muted">{b.due_date ?? "-"}</td>
                  <td className="mono">{formatMoney(b.amount_cents)}</td>
                  <td className="mono">{formatMoney(b.paid_amount_cents)}</td>
                  <td className="mono">{formatMoney(b.outstanding_amount_cents)}</td>
                  <td>
                    <span className={b.status === "paid" ? "status-pill status-done" : "status-pill status-pending"}>{b.status}</span>
                  </td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => viewBill(b.id)}>View</button>{" "}
                    <button className="link-btn" onClick={() => downloadBillPdf(b.id)}>PDF</button>{" "}
                    {b.status !== "paid" && (
                      <button className="link-btn" onClick={() => { setPaymentAmount(String(b.outstanding_amount_cents / 100)); setPayingBill(b); }}>
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {payingBill && (
        <Modal title={`Pay Bill #${payingBill.id}`} onClose={() => setPayingBill(null)}>
          <form onSubmit={handlePay}>
            <p>
              Bill total: <strong>{formatMoney(payingBill.amount_cents)}</strong>
            </p>
            <label>
              Payment Amount
              <input type="number" step="0.01" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
            </label>
            <label>
              Method
              <Select value={method} onChange={setMethod} options={[{ value: "Cash", label: "Cash" }, { value: "Bank", label: "Bank" }]} />
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setPayingBill(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingBill && (
        <BillPreview
          kind="Vendor Bill"
          id={viewingBill.id}
          reference={`PO-${viewingBill.purchase_order_id}`}
          date={viewingBill.bill_date}
          dueDate={viewingBill.due_date}
          partyLabel="From vendor"
          partyName={contacts.find((contact) => contact.id === purchaseOrders.find((order) => order.id === viewingBill.purchase_order_id)?.vendor_id)?.name ?? `Purchase Order #${viewingBill.purchase_order_id}`}
          status={viewingBill.status}
          subtotalCents={viewingBill.subtotal_cents}
          taxCents={viewingBill.tax_cents}
          totalCents={viewingBill.amount_cents}
          paidCents={viewingBill.payments.reduce((sum, payment) => sum + payment.amount_cents, 0)}
          lines={viewingBill.items.map((item) => ({ ...item, product_name: productName(item.product_id) }))}
          payments={viewingBill.payments}
          onClose={() => setViewingBill(null)}
        />
      )}
    </div>
  );
}
