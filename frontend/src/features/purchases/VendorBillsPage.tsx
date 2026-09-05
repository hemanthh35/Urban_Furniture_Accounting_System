import { useEffect, useState, type FormEvent } from "react";
import { purchasesApi, type VendorBill, type VendorBillDetail } from "../../api/purchases";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { formatMoney } from "../../utils/money";

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([]);
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
      setBills(await purchasesApi.listBills());
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

  async function viewBill(billId: number) {
    try {
      setViewingBill(await purchasesApi.getBill(billId));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not load bill details");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Vendor Bills</h1>
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
              {bills.map((b) => (
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
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
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
        <Modal title={`Vendor Bill #${viewingBill.id}`} onClose={() => setViewingBill(null)}>
          <p>Subtotal: <strong>{formatMoney(viewingBill.subtotal_cents)}</strong> | Tax: <strong>{formatMoney(viewingBill.tax_cents)}</strong> | Total: <strong>{formatMoney(viewingBill.amount_cents)}</strong></p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product ID</th><th>Quantity</th><th>Unit Price</th><th>Tax</th></tr></thead>
              <tbody>{viewingBill.items.map((item) => (
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
          {viewingBill.payments.length === 0 ? <p className="muted">No payments yet.</p> : (
            <div className="table-wrap">
              <table><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
                <tbody>{viewingBill.payments.map((payment) => <tr key={payment.id}><td>{payment.date}</td><td>{payment.method}</td><td className="mono">{formatMoney(payment.amount_cents)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
