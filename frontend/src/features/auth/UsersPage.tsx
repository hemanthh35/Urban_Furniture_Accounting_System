import { useEffect, useState, type FormEvent } from "react";
import { authApi, type User } from "../../api/auth";
import { ApiError } from "../../api/client";
import Pagination from "../../components/Pagination";
import Select from "../../components/Select";
import { usePagination } from "../../hooks/usePagination";
import PasswordInput from "../../components/PasswordInput";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");

  async function load() {
    try { setUsers(await authApi.listUsers()); } catch (err) { setError(err instanceof ApiError ? err.message : "Could not load users"); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(user: User) {
    try {
      if (user.is_active && !window.confirm(`Deactivate ${user.email}?`)) return;
      await (user.is_active ? authApi.deactivateUser(user.id) : authApi.activateUser(user.id));
      await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not update user"); }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    try {
      await authApi.createUser({ name, login_id: loginId, email, role, password });
      setName(""); setLoginId(""); setEmail(""); setPassword("");
      await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not create user"); }
  }

  const { pageItems, page, totalPages, setPage } = usePagination([...users].sort((a, b) => b.id - a.id));

  return <div>
    <div className="page-head"><div><h1>User Access</h1><p className="page-sub">Only an admin can activate or deactivate login accounts.</p></div></div>
    {error && <div className="form-error">{error}</div>}
    <form className="auth-card" style={{ marginBottom: 24, width: "100%", maxWidth: 700 }} onSubmit={createUser}>
      <h2>Create User</h2>
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label>Login ID<input value={loginId} onChange={(e) => setLoginId(e.target.value)} minLength={6} maxLength={12} required /></label>
      <p className="field-hint">6-12 characters.</p>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Role<Select value={role} onChange={setRole} options={[{ value: "user", label: "Accountant" }, { value: "administrator", label: "Administrator" }]} /></label>
      <label>Password<PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>
      <p className="field-hint">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</p>
      <button type="submit">Create</button>
    </form>
    <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
      {pageItems.map((user) => <tr key={user.id}><td>{user.email}</td><td>{user.role}</td><td>{user.is_active ? "Active" : "Inactive"}</td><td><button className="secondary" onClick={() => toggle(user)}>{user.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
    </tbody></table></div>
    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
  </div>;
}
