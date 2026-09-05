import { useEffect, useState, type FormEvent } from "react";
import { contactsApi, type Contact } from "../../api/contacts";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields - matches the Contact Master fields exactly from the problem statement.
  const [name, setName] = useState("");
  const [type, setType] = useState("Customer");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      setContacts(await contactsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setType("Customer");
    setEmail("");
    setMobile("");
    setCity("");
    setState("");
    setPincode("");
    setCreateLogin(false);
    setLoginPassword("");
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await contactsApi.create({
        name,
        type,
        email: email || null,
        mobile: mobile || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        create_login_password: createLogin ? loginPassword : null,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Contacts</h1>
        <button onClick={() => setModalOpen(true)}>+ New Contact</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">No contacts yet.</div>
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
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td className="muted">{c.email ?? "-"}</td>
                  <td className="muted">{c.mobile ?? "-"}</td>
                  <td className="muted">{c.city ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title="New Contact" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
                <option value="Both">Both</option>
              </select>
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Mobile
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} />
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
              <input value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
              Give this contact portal access (they can log in to see their own invoices/bills)
            </label>
            {createLogin && (
              <label>
                Portal password
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required={createLogin} />
              </label>
            )}
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
