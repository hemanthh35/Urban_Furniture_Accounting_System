import { useEffect, useState, type FormEvent } from "react";
import { accountsApi, type Account } from "../../api/accounts";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Asset");

  async function load() {
    setLoading(true);
    try {
      setAccounts(await accountsApi.list(showArchived));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  function openNew() {
    setEditingAccount(null);
    setName("");
    setType("Asset");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, { name, type });
      } else {
        await accountsApi.create({ name, type });
      }
      setModalOpen(false);
      setName("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save account");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(account: Account) {
    if (!window.confirm(`Archive ${account.name}?`)) return;
    try {
      await accountsApi.archive(account.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive account");
    }
  }

  async function handleRestore(account: Account) {
    try { await accountsApi.restore(account.id); await load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not restore account"); }
  }

  const { pageItems, page, totalPages, setPage } = usePagination(accounts);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Chart of Accounts</h1>
          <p className="page-sub">The master list of ledger buckets every transaction posts into.</p>
        </div>
        <div><button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}<button onClick={openNew}>+ New Account</button></div>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
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
        <Modal title={editingAccount ? "Edit Account" : "New Account"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Account Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="Capital">Capital</option>
              </select>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingAccount ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
