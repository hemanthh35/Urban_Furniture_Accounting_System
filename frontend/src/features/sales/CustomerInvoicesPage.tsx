import { useEffect, useState, type FormEvent } from "react";
import { salesApi, type CustomerInvoice, type CustomerInvoiceDetail } from "../../api/sales";
import { purchasesApi, type VendorBill } from "../../api/purchases";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { formatMoney } from "../../utils/money";
import { useAuth } from "../auth/AuthContext";

// Reused for both the staff "Customer Invoices" page and the Contact Portal - the
// backend's GET /customer-invoices already returns only the caller's own invoices
// when logged in as a "contact" role user, so this component doesn't need to know
// which kind of user it's showing data to.
export default function CustomerInvoicesPage() {
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<CustomerInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<CustomerInvoiceDetail | null>(null);
  const [method, setMethod] = useState("Cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const invoiceList = await salesApi.listInvoices();
      setInvoices(invoiceList);
      if (role === "contact") setVendorBills(await purchasesApi.listBills());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payingInvoice) return;
    setFormError(null);
    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);
      await salesApi.payInvoice(payingInvoice.id, method, amountCents, new Date().toISOString().slice(0, 10));
      setPayingInvoice(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not record payment");
    } finally {
      setSaving(false);
    }
  }

  async function viewInvoice(invoiceId: number) {
    try {
      setViewingInvoice(await salesApi.getInvoice(invoiceId));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not load invoice details");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>{role === "contact" ? "My Invoices" : "Customer Invoices"}</h1>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">No invoices yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono">#{inv.id}</td>
                  <td className="muted">{inv.invoice_date}</td>
                  <td className="muted">{inv.due_date ?? "-"}</td>
                  <td className="mono">{formatMoney(inv.amount_cents)}</td>
                  <td>
                    <span className={inv.status === "paid" ? "status-pill status-done" : "status-pill status-pending"}>{inv.status}</span>
                  </td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => viewInvoice(inv.id)}>View</button>{" "}
                    {inv.status !== "paid" && (
                      <button className="link-btn" onClick={() => { setPaymentAmount(String(inv.amount_cents / 100)); setPayingInvoice(inv); }}>
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

      {role === "contact" && (
        <div style={{ marginTop: 32 }}>
          <h2>My Vendor Bills</h2>
          {vendorBills.length === 0 ? <div className="empty-state">No vendor bills yet.</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Bill</th><th>Bill Date</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{vendorBills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="mono">#{bill.id}</td>
                    <td>{bill.bill_date}</td>
                    <td>{bill.due_date ?? "-"}</td>
                    <td className="mono">{formatMoney(bill.amount_cents)}</td>
                    <td>{bill.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payingInvoice && (
        <Modal title={`Pay Invoice #${payingInvoice.id}`} onClose={() => setPayingInvoice(null)}>
          <form onSubmit={handlePay}>
            <p>
              Invoice total: <strong>{formatMoney(payingInvoice.amount_cents)}</strong>
            </p>
            <label>
              Payment Amount
              <input type="number" step="0.01" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
            </label>
            <label>
              Method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setPayingInvoice(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingInvoice && (
        <Modal title={`Customer Invoice #${viewingInvoice.id}`} onClose={() => setViewingInvoice(null)}>
          <p>Invoice total: <strong>{formatMoney(viewingInvoice.amount_cents)}</strong></p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product ID</th><th>Quantity</th><th>Unit Price</th><th>Tax</th></tr></thead>
              <tbody>{viewingInvoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_id}</td>
                  <td>{item.quantity}</td>
                  <td className="mono">{formatMoney(item.unit_price_cents)}</td>
                  <td>{item.tax_percent}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <h3>Payments</h3>
          {viewingInvoice.payments.length === 0 ? <p className="muted">No payments yet.</p> : (
            <div className="table-wrap">
              <table><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
                <tbody>{viewingInvoice.payments.map((payment) => <tr key={payment.id}><td>{payment.date}</td><td>{payment.method}</td><td className="mono">{formatMoney(payment.amount_cents)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
