import { useEffect, useState, type FormEvent } from "react";
import { purchasesApi, type VendorBill } from "../../api/purchases";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { formatMoney } from "../../utils/money";

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBill, setPayingBill] = useState<VendorBill | null>(null);
  const [method, setMethod] = useState("Bank");
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
      await purchasesApi.payBill(payingBill.id, method, payingBill.amount_cents, new Date().toISOString().slice(0, 10));
      setPayingBill(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not record payment");
    } finally {
      setSaving(false);
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
                  <td>
                    <span className={b.status === "paid" ? "status-pill status-done" : "status-pill status-pending"}>{b.status}</span>
                  </td>
                  <td className="row-actions">
                    {b.status === "unpaid" && (
                      <button className="link-btn" onClick={() => setPayingBill(b)}>
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
              Amount: <strong>{formatMoney(payingBill.amount_cents)}</strong>
            </p>
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
    </div>
  );
}
