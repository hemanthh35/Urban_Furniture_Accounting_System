import { useEffect, useState } from "react";
import { authApi, type User } from "../../api/auth";
import { ApiError } from "../../api/client";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return <div>
    <div className="page-head"><div><h1>User Access</h1><p className="page-sub">Only an admin can activate or deactivate login accounts.</p></div></div>
    {error && <div className="form-error">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
      {users.map((user) => <tr key={user.id}><td>{user.email}</td><td>{user.role}</td><td>{user.is_active ? "Active" : "Inactive"}</td><td><button className="secondary" onClick={() => toggle(user)}>{user.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
    </tbody></table></div>
  </div>;
}
