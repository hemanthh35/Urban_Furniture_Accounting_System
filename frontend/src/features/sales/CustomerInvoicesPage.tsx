import { useEffect, useState, type FormEvent } from "react";
import { salesApi, type CustomerInvoice } from "../../api/sales";
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
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<CustomerInvoice | null>(null);
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setInvoices(await salesApi.listInvoices());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payingInvoice) return;
    setFormError(null);
    setSaving(true);
    try {
      await salesApi.payInvoice(payingInvoice.id, method, payingInvoice.amount_cents, new Date().toISOString().slice(0, 10));
      setPayingInvoice(null);
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
                    {inv.status === "unpaid" && (
                      <button className="link-btn" onClick={() => setPayingInvoice(inv)}>
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

      {payingInvoice && (
        <Modal title={`Pay Invoice #${payingInvoice.id}`} onClose={() => setPayingInvoice(null)}>
          <form onSubmit={handlePay}>
            <p>
              Amount: <strong>{formatMoney(payingInvoice.amount_cents)}</strong>
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
    </div>
  );
}
