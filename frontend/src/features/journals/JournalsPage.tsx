import { useEffect, useState, type FormEvent } from "react";
import { accountsApi, type Account } from "../../api/accounts";
import { journalsApi, type Journal, type JournalEntry } from "../../api/journals";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import DatePicker from "../../components/DatePicker";
import Select from "../../components/Select";
import { usePagination } from "../../hooks/usePagination";
import { formatMoney } from "../../utils/money";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [obModalOpen, setObModalOpen] = useState(false);
  const [obSaving, setObSaving] = useState(false);
  const [obError, setObError] = useState<string | null>(null);
  const [obDate, setObDate] = useState(todayIso());
  const [obCash, setObCash] = useState("");
  const [obBank, setObBank] = useState("");

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

  async function handleOpeningBalanceSubmit(event: FormEvent) {
    event.preventDefault();
    setObSaving(true);
    setObError(null);
    try {
      await journalsApi.createOpeningBalance({
        date: obDate,
        cash_cents: obCash ? Math.round(parseFloat(obCash) * 100) : 0,
        bank_cents: obBank ? Math.round(parseFloat(obBank) * 100) : 0,
      });
      setObModalOpen(false);
      setObCash("");
      setObBank("");
      await load();
    } catch (err) {
      setObError(err instanceof ApiError ? err.message : "Could not record opening balance");
    } finally {
      setObSaving(false);
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
  const journalsPage = usePagination([...journals].sort((a, b) => b.id - a.id));
  const entryRows = entries.flatMap((entry) => entry.lines.map((line) => ({ entry, line })));
  const entryRowsPage = usePagination([...entryRows].sort((a, b) => b.entry.id - a.entry.id || b.line.id - a.line.id));

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Journals</h1>
          <p className="page-sub">View the journals and double-entry postings created by transactions.</p>
        </div>
        <div>
          <button className="secondary" onClick={() => { setObError(null); setObModalOpen(true); }}>Set Opening Balance</button>{" "}
          <button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}
          <button onClick={openNew}>+ New Journal</button>
        </div>
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
              <Select
                value={type}
                onChange={setType}
                options={[
                  { value: "Sales", label: "Sales" },
                  { value: "Purchase", label: "Purchase" },
                  { value: "Bank", label: "Bank" },
                  { value: "Cash", label: "Cash" },
                ]}
              />
            </label>
            <label>
              Default Account
              <Select value={defaultAccountId} onChange={setDefaultAccountId} placeholder="None" options={accounts.map((account) => ({ value: String(account.id), label: account.name }))} />
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editingJournal ? "Save changes" : "Create"}</button>
            </div>
          </form>
        </Modal>
      )}

      {obModalOpen && (
        <Modal title="Set Opening Balance" onClose={() => setObModalOpen(false)}>
          <form onSubmit={handleOpeningBalanceSubmit}>
            <p className="field-hint" style={{ marginTop: 0 }}>
              Records whatever was already in Cash/Bank before this system started tracking anything (Debit Cash/Bank, Credit Capital). One-time - it can't be recorded twice.
            </p>
            <label>Date<DatePicker value={obDate} onChange={setObDate} required /></label>
            <label>Cash Opening Balance ₹<input type="number" step="0.01" min="0" placeholder="0.00" value={obCash} onChange={(e) => setObCash(e.target.value)} /></label>
            <label>Bank Opening Balance ₹<input type="number" step="0.01" min="0" placeholder="0.00" value={obBank} onChange={(e) => setObBank(e.target.value)} /></label>
            {obError && <div className="form-error">{obError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setObModalOpen(false)}>Cancel</button>
              <button type="submit" disabled={obSaving}>{obSaving ? "Saving..." : "Record Opening Balance"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
