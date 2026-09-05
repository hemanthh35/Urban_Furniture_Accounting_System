import { useEffect, useState, type FormEvent } from "react";
import { budgetsApi, type AnalyticAccount } from "../../api/budgets";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

export default function AnalyticAccountsPage() {
  const [items, setItems] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnalyticAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Income");

  async function load() {
    setLoading(true);
    try {
      setItems(await budgetsApi.listAnalyticAccounts(showArchived));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  function openNew() {
    setEditingItem(null);
    setName("");
    setType("Income");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: AnalyticAccount) {
    setEditingItem(item);
    setName(item.name);
    setType(item.type);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editingItem) {
        await budgetsApi.updateAnalyticAccount(editingItem.id, { name, type });
      } else {
        await budgetsApi.createAnalyticAccount({ name, type });
      }
      setModalOpen(false);
      setName("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save analytic account");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(item: AnalyticAccount) {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    try {
      await budgetsApi.archiveAnalyticAccount(item.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive analytic account");
    }
  }

  async function handleRestore(item: AnalyticAccount) {
    try { await budgetsApi.restoreAnalyticAccount(item.id); await load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not restore analytic account"); }
  }

  const { pageItems, page, totalPages, setPage } = usePagination([...items].sort((a, b) => b.id - a.id));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analytic Accounts</h1>
          <p className="page-sub">Tags for grouping income/expenses by project or department, used by Budgets.</p>
        </div>
        <div><button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}<button onClick={openNew}>+ New Analytic Account</button></div>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td>
                    {!a.is_archived && <><button className="secondary" onClick={() => openEdit(a)}>Edit</button>{" "}<button className="secondary" onClick={() => handleArchive(a)}>Archive</button></>}
                    {a.is_archived && <button className="secondary" onClick={() => handleRestore(a)}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalOpen && (
        <Modal title={editingItem ? "Edit Analytic Account" : "New Analytic Account"} onClose={() => setModalOpen(false)}>
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
                {saving ? "Saving..." : editingItem ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
