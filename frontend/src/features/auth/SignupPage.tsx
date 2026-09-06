import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import PasswordInput from "../../components/PasswordInput";
import AuthVisual from "../../components/AuthVisual";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (password !== confirmation) { setError("Passwords do not match"); setLoading(false); return; }
      // The account is created deactivated - an admin has to turn it on in User
      // Access before it can log in, so there's nothing to log in with yet.
      await authApi.signup({ name, login_id: loginId, email, password, password_confirmation: confirmation, role: "user" });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign up");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-screen">
        <AuthVisual />
        <div className="auth-form-side">
          <div className="auth-card">
            <h1>Account Created</h1>
            <p className="auth-sub">An admin needs to activate your account in User Access before you can log in. Check back once they have.</p>
            <p className="auth-footer">
              <Link to="/login">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <AuthVisual />
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Create your account</h1>
          <p className="auth-sub">Start running real accounting, not spreadsheets</p>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></label>
          <label>
            Login ID
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} minLength={6} maxLength={12} required />
          </label>
          <p className="field-hint">6-12 characters.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <p className="field-hint">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</p>
          <label>
            Re-enter Password
            <PasswordInput value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
