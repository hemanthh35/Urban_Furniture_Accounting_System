// Blocks a page unless logged in, and (optionally) unless the role is allowed.
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) {
    // Redirect to a page THIS role can actually see, not always "/" - "/" is
    // staff-only, so a contact bouncing off a staff page must not land back on
    // another staff page (that would just redirect again, forever).
    return <Navigate to={role === "contact" ? "/portal" : "/"} replace />;
  }
  return <>{children}</>;
}
