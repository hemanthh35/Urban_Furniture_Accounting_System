// Keeps track of "who's logged in" for the whole app. Just stores what /auth/login
// gives back (a token + role) in localStorage, so a page refresh doesn't log you out.
import { createContext, useContext, useState, type ReactNode } from "react";
import { setToken } from "../../api/client";

interface AuthState {
  role: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(localStorage.getItem("uf_role"));

  function login(token: string, role: string) {
    setToken(token);
    localStorage.setItem("uf_role", role);
    setRole(role);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("uf_role");
    setRole(null);
  }

  return <AuthContext.Provider value={{ role, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
