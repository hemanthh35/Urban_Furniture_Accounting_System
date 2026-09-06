import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuth } from "./AuthContext";
import PasswordInput from "../../components/PasswordInput";
import AuthVisual from "../../components/AuthVisual";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(loginId, password);
      login(res.access_token, res.role);
      // A "contact" role user has no access to "/dashboard" (that's staff-only)
      // - send them straight to their own portal instead, or they'd land on a
      // page that immediately redirects them back to itself.
      navigate(res.role === "contact" ? "/portal" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <AuthVisual />
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to your Urban Furniture account</p>
          <label>
            Login ID or Email
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoFocus />
          </label>
          <p className="field-hint">Staff sign in with their Login ID; contacts sign in with their email.</p>
          <label>
            Password
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="auth-footer">
            No account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
