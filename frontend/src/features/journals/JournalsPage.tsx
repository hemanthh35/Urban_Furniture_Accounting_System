import { useEffect, useState, type FormEvent } from "react";
import { accountsApi, type Account } from "../../api/accounts";
import { journalsApi, type Journal, type JournalEntry } from "../../api/journals";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { formatMoney } from "../../utils/money";

export default function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Sales");
  const [defaultAccountId, setDefaultAccountId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [journalList, entryList, accountList] = await Promise.all([
        journalsApi.list(),
        journalsApi.listEntries(),
        accountsApi.list(),
      ]);
      setJournals(journalList);
      setEntries(entryList);
      setAccounts(accountList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await journalsApi.create({
        name,
        type,
        default_account_id: defaultAccountId ? Number(defaultAccountId) : null,
      });
      setModalOpen(false);
      setName("");
      setDefaultAccountId("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create journal");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Journals</h1>
          <p className="page-sub">View the journals and double-entry postings created by transactions.</p>
        </div>
        <button onClick={() => setModalOpen(true)}>+ New Journal</button>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Journal</th><th>Type</th><th>Default Account</th></tr>
          </thead>
          <tbody>
            {journals.map((journal) => (
              <tr key={journal.id}>
                <td>{journal.name}</td>
                <td>{journal.type}</td>
                <td>{accounts.find((a) => a.id === journal.default_account_id)?.name ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Journal Entries</h2>
      {entries.length === 0 ? (
        <div className="empty-state">No journal entries yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Journal</th><th>Reference</th><th>Account</th><th>Debit</th><th>Credit</th></tr>
            </thead>
            <tbody>
              {entries.flatMap((entry) => entry.lines.map((line) => (
                <tr key={`${entry.id}-${line.id}`}>
                  <td>{entry.date}</td>
                  <td>{entry.journal_name}</td>
                  <td className="muted">{entry.reference ?? "-"}</td>
                  <td>{line.account_name}</td>
                  <td className="mono">{formatMoney(line.debit_cents)}</td>
                  <td className="mono">{formatMoney(line.credit_cents)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title="New Journal" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>Journal Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Sales">Sales</option>
                <option value="Purchase">Purchase</option>
                <option value="Bank">Bank</option>
                <option value="Cash">Cash</option>
              </select>
            </label>
            <label>
              Default Account
              <select value={defaultAccountId} onChange={(e) => setDefaultAccountId(e.target.value)}>
                <option value="">None</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
