import { useState, type FormEvent } from "react";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head"><h1>Change Password</h1></div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <label>Current Password<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
          <label>New Password<input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
          <p className="field-hint">At least 8 characters.</p>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Change Password"}</button>
        </form>
      </div>
    </div>
  );
}
