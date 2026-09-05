import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

// Nav items, filtered by role - "contact" role users only ever see their own
// invoices (Portal), everything else is admin/accountant territory.
const STAFF_NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/contacts", label: "Contacts" },
  { to: "/products", label: "Products" },
  { to: "/accounts", label: "Chart of Accounts" },
  { to: "/analytic-accounts", label: "Analytic Accounts" },
  { to: "/budgets", label: "Budgets" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/vendor-bills", label: "Vendor Bills" },
  { to: "/sales-orders", label: "Sales Orders" },
  { to: "/customer-invoices", label: "Customer Invoices" },
  { to: "/reports/balance-sheet", label: "Balance Sheet" },
  { to: "/reports/profit-and-loss", label: "Profit & Loss" },
  { to: "/reports/budget-report", label: "Budget Report" },
];

const CONTACT_NAV = [{ to: "/portal", label: "My Invoices", end: true }];

export default function Layout({ children }: { children: ReactNode }) {
  const { role, logout } = useAuth();
  const nav = role === "contact" ? CONTACT_NAV : STAFF_NAV;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Urban Furniture</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div />
          <div className="user-chip">
            <span className="role-badge">{role}</span>
            <button className="link-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
