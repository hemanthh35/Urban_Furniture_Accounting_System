import { useEffect, useState, type FormEvent } from "react";
import { budgetsApi, type AnalyticAccount, type Budget } from "../../api/budgets";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { formatMoney } from "../../utils/money";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [analyticAccounts, setAnalyticAccounts] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [analyticAccountId, setAnalyticAccountId] = useState("");

  const analyticAccountName = (id: number) => analyticAccounts.find((a) => a.id === id)?.name ?? `#${id}`;

  async function load() {
    setLoading(true);
    try {
      const [b, aa] = await Promise.all([budgetsApi.listBudgets(), budgetsApi.listAnalyticAccounts()]);
      setBudgets(b);
      setAnalyticAccounts(aa);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingBudget(null);
    setName("");
    setPeriod("");
    setResponsiblePerson("");
    setPlannedAmount("");
    setAnalyticAccountId("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget);
    setName(budget.name);
    setPeriod(budget.period);
    setResponsiblePerson(budget.responsible_person ?? "");
    setPlannedAmount(String(budget.planned_amount_cents / 100));
    setAnalyticAccountId(String(budget.analytic_account_id));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!analyticAccountId) {
      setFormError("Choose an analytic account");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        period,
        responsible_person: responsiblePerson || null,
        planned_amount_cents: Math.round(parseFloat(plannedAmount) * 100),
        analytic_account_id: parseInt(analyticAccountId, 10),
      };
      if (editingBudget) {
        await budgetsApi.updateBudget(editingBudget.id, payload);
      } else {
        await budgetsApi.createBudget(payload);
      }
      setModalOpen(false);
      setName("");
      setPeriod("");
      setResponsiblePerson("");
      setPlannedAmount("");
      setAnalyticAccountId("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save budget");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(budget: Budget) {
    if (!window.confirm(`Archive ${budget.name}?`)) return;
    try {
      await budgetsApi.archiveBudget(budget.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive budget");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Budgets</h1>
        <button onClick={openNew}>+ New Budget</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : budgets.length === 0 ? (
        <div className="empty-state">No budgets yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Period</th>
                <th>Responsible</th>
                <th>Analytic Account</th>
                <th>Planned Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.period}</td>
                  <td className="muted">{b.responsible_person ?? "-"}</td>
                  <td>{analyticAccountName(b.analytic_account_id)}</td>
                  <td className="mono">{formatMoney(b.planned_amount_cents)}</td>
                  <td>
                    <button className="secondary" onClick={() => openEdit(b)}>Edit</button>{" "}
                    <button className="secondary" onClick={() => handleArchive(b)}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingBudget ? "Edit Budget" : "New Budget"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Budget Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Period
              <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2026-Q1" required />
            </label>
            <label>
              Responsible Person
              <input value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
            </label>
            <label>
              Planned Amount (₹)
              <input type="number" step="0.01" value={plannedAmount} onChange={(e) => setPlannedAmount(e.target.value)} required />
            </label>
            <label>
              Analytic Account
              <select value={analyticAccountId} onChange={(e) => setAnalyticAccountId(e.target.value)} required>
                <option value="" disabled>
                  Select
                </option>
                {analyticAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingBudget ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
