import { useEffect, useState, type FormEvent } from "react";
import { contactsApi, type Contact } from "../../api/contacts";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import Select from "../../components/Select";
import SearchBox from "../../components/SearchBox";
import { usePagination } from "../../hooks/usePagination";
import PasswordInput from "../../components/PasswordInput";
import { downloadCsv } from "../../utils/export";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  // Form fields - matches the Contact Master fields exactly from the problem statement.
  const [name, setName] = useState("");
  const [type, setType] = useState("Customer");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [hasPortalLogin, setHasPortalLogin] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setContacts(await contactsApi.list(showArchived));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  function resetForm() {
    setName("");
    setType("Customer");
    setEmail("");
    setMobile("");
    setCity("");
    setState("");
    setPincode("");
    setProfileImage("");
    setCreateLogin(false);
    setLoginPassword("");
    setFormError(null);
  }

  function openNew() {
    setEditingContact(null);
    resetForm();
    setHasPortalLogin(false);
    setModalOpen(true);
  }

  async function openEdit(contact: Contact) {
    setEditingContact(contact);
    setName(contact.name);
    setType(contact.type);
    setEmail(contact.email ?? "");
    setMobile(contact.mobile ?? "");
    setCity(contact.city ?? "");
    setState(contact.state ?? "");
    setPincode(contact.pincode ?? "");
    setProfileImage(contact.profile_image ?? "");
    setCreateLogin(false);
    setLoginPassword("");
    setFormError(null);
    setModalOpen(true);
    const { has_login } = await contactsApi.portalStatus(contact.id);
    setHasPortalLogin(has_login);
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email address";
    if (mobile && !/^\d{10}$/.test(mobile)) return "Mobile number must be exactly 10 digits";
    if (pincode && !/^\d{6}$/.test(pincode)) return "Pincode must be exactly 6 digits";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        type,
        email: email || null,
        mobile: mobile || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        profile_image: profileImage || null,
        create_login_password: createLogin ? loginPassword : null,
      };
      if (editingContact) {
        await contactsApi.update(editingContact.id, payload);
        if (createLogin) {
          if (hasPortalLogin) {
            await contactsApi.resetPortalPassword(editingContact.id, loginPassword);
          } else {
            await contactsApi.grantPortalAccess(editingContact.id, loginPassword);
          }
        }
      } else {
        await contactsApi.create(payload);
      }
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(contact: Contact) {
    if (!window.confirm(`Archive ${contact.name}?`)) return;
    try {
      await contactsApi.archive(contact.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive contact");
    }
  }

  async function handleRestore(contact: Contact) {
    try { await contactsApi.restore(contact.id); await load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not restore contact"); }
  }

  const filteredContacts = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.mobile ?? "").toLowerCase().includes(q);
  });
  const { pageItems, page, totalPages, setPage } = usePagination([...filteredContacts].sort((a, b) => b.id - a.id));

  return (
    <div>
      <div className="page-head">
        <h1>Contacts</h1>
        <div>
          <button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}
          <button
            className="secondary"
            onClick={() => downloadCsv("contacts.csv", ["Name", "Type", "Email", "Mobile", "City", "State", "Pincode"], contacts.map((c) => [c.name, c.type, c.email ?? "", c.mobile ?? "", c.city ?? "", c.state ?? "", c.pincode ?? ""]))}
          >
            Export CSV
          </button>{" "}
          <button onClick={openNew}>+ New Contact</button>
        </div>
      </div>

      <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email, or mobile..." />

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">No contacts yet.</div>
      ) : filteredContacts.length === 0 ? (
        <div className="empty-state">No contacts match "{search}".</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>City</th>
                <th>Photo</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td className="muted">{c.email ?? "-"}</td>
                  <td className="muted">{c.mobile ?? "-"}</td>
                  <td className="muted">{c.city ?? "-"}</td>
                  <td>{c.profile_image ? <img src={c.profile_image} alt="" width="32" height="32" /> : "-"}</td>
                  <td>
                    {!c.is_archived && <><button className="secondary" onClick={() => openEdit(c)}>Edit</button>{" "}<button className="secondary" onClick={() => handleArchive(c)}>Archive</button></>}
                    {c.is_archived && <button className="secondary" onClick={() => handleRestore(c)}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalOpen && (
        <Modal title={editingContact ? "Edit Contact" : "New Contact"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Type
              <Select value={type} onChange={setType} options={[{ value: "Customer", label: "Customer" }, { value: "Vendor", label: "Vendor" }, { value: "Both", label: "Both" }]} />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Mobile
              <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" />
            </label>
            <label>
              City
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label>
              State
              <input value={state} onChange={(e) => setState(e.target.value)} />
            </label>
            <label>
              Pincode
              <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" />
            </label>
            <label>
              Profile image URL
              <input type="url" value={profileImage} onChange={(e) => setProfileImage(e.target.value)} placeholder="https://..." />
            </label>
            {editingContact && hasPortalLogin ? (
              <>
                <label className="checkbox-label">
                  <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
                  Reset this contact's portal password
                </label>
                {createLogin && (
                  <>
                    <label>
                      New portal password
                      <PasswordInput value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} minLength={8} required />
                    </label>
                    <p className="field-hint">At least 8 characters.</p>
                  </>
                )}
              </>
            ) : (
              <>
                <label className="checkbox-label">
                  <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
                  Give this contact portal access (they can log in to see their own invoices/bills)
                </label>
                {createLogin && (
                  <>
                    <label>
                      Portal password
                      <PasswordInput value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} minLength={8} required />
                    </label>
                    <p className="field-hint">At least 8 characters.</p>
                  </>
                )}
              </>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingContact ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
