import { useEffect, useState, type FormEvent } from "react";
import { accountsApi, type Account } from "../../api/accounts";
import { journalsApi, type Journal, type JournalEntry } from "../../api/journals";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { formatMoney } from "../../utils/money";

export default function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Sales");
  const [defaultAccountId, setDefaultAccountId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [journalList, entryList, accountList] = await Promise.all([
        journalsApi.list(showArchived),
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
  }, [showArchived]);

  function openNew() {
    setEditingJournal(null);
    setName("");
    setType("Sales");
    setDefaultAccountId("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(journal: Journal) {
    setEditingJournal(journal);
    setName(journal.name);
    setType(journal.type);
    setDefaultAccountId(journal.default_account_id ? String(journal.default_account_id) : "");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name,
        type,
        default_account_id: defaultAccountId ? Number(defaultAccountId) : null,
      };
      if (editingJournal) await journalsApi.update(editingJournal.id, payload);
      else await journalsApi.create(payload);
      setModalOpen(false);
      setEditingJournal(null);
      setName("");
      setDefaultAccountId("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save journal");
    } finally {
      setSaving(false);
    }
  }

  async function archiveJournal(journal: Journal) {
    if (!window.confirm(`Archive ${journal.name}?`)) return;
    try {
      await journalsApi.archive(journal.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive journal");
    }
  }

  async function restoreJournal(journal: Journal) {
    try { await journalsApi.restore(journal.id); await load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not restore journal"); }
  }

  // Hooks must run every render regardless of the loading early-return below,
  // so these are called unconditionally here.
  const journalsPage = usePagination(journals);
  const entryRows = entries.flatMap((entry) => entry.lines.map((line) => ({ entry, line })));
  const entryRowsPage = usePagination(entryRows);

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Journals</h1>
          <p className="page-sub">View the journals and double-entry postings created by transactions.</p>
        </div>
        <div><button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}<button onClick={openNew}>+ New Journal</button></div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Journal</th><th>Type</th><th>Default Account</th><th /></tr>
          </thead>
          <tbody>
            {journalsPage.pageItems.map((journal) => (
              <tr key={journal.id}>
                <td>{journal.name}</td>
                <td>{journal.type}</td>
                <td>{accounts.find((a) => a.id === journal.default_account_id)?.name ?? "-"}</td>
                <td className="row-actions">{!journal.is_archived && <><button className="link-btn" onClick={() => openEdit(journal)}>Edit</button>{" "}<button className="link-btn" onClick={() => archiveJournal(journal)}>Archive</button></>}{journal.is_archived && <button className="link-btn" onClick={() => restoreJournal(journal)}>Restore</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={journalsPage.page} totalPages={journalsPage.totalPages} onChange={journalsPage.setPage} />

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
              {entryRowsPage.pageItems.map(({ entry, line }) => (
                <tr key={`${entry.id}-${line.id}`}>
                  <td>{entry.date}</td>
                  <td>{entry.journal_name}</td>
                  <td className="muted">{entry.reference ?? "-"}</td>
                  <td>{line.account_name}</td>
                  <td className="mono">{formatMoney(line.debit_cents)}</td>
                  <td className="mono">{formatMoney(line.credit_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={entryRowsPage.page} totalPages={entryRowsPage.totalPages} onChange={entryRowsPage.setPage} />

      {modalOpen && (
        <Modal title={editingJournal ? `Edit Journal #${editingJournal.id}` : "New Journal"} onClose={() => setModalOpen(false)}>
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
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editingJournal ? "Save changes" : "Create"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
