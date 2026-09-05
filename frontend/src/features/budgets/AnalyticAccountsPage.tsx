import { useEffect, useState, type FormEvent } from "react";
import { budgetsApi, type AnalyticAccount } from "../../api/budgets";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";

export default function AnalyticAccountsPage() {
  const [items, setItems] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Income");

  async function load() {
    setLoading(true);
    try {
      setItems(await budgetsApi.listAnalyticAccounts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await budgetsApi.createAnalyticAccount({ name, type });
      setModalOpen(false);
      setName("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create analytic account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analytic Accounts</h1>
          <p className="page-sub">Tags for grouping income/expenses by project or department, used by Budgets.</p>
        </div>
        <button onClick={() => setModalOpen(true)}>+ New Analytic Account</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title="New Analytic Account" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Income">Income</option>
                <option value="Expenses">Expenses</option>
              </select>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
