import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import BrandMark from "./BrandMark";

type NavItem = { to: string; label: string; end?: boolean; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

// Dashboard stays a standalone top-level link; everything else is grouped into
// a dropdown so the sidebar isn't one long list of 17 items.
const DASHBOARD: NavItem = { to: "/dashboard", label: "Dashboard", end: true };

const STAFF_GROUPS: NavGroup[] = [
  {
    label: "Master Data",
    items: [
      { to: "/contacts", label: "Contacts" },
      { to: "/products", label: "Products" },
      { to: "/accounts", label: "Chart of Accounts" },
      { to: "/analytic-accounts", label: "Analytic Accounts" },
      { to: "/budgets", label: "Budgets" },
    ],
  },
  {
    label: "Purchases",
    items: [
      { to: "/purchase-orders", label: "Purchase Orders" },
      { to: "/vendor-bills", label: "Vendor Bills" },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/sales-orders", label: "Sales Orders" },
      { to: "/customer-invoices", label: "Customer Invoices" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/journals", label: "Journals" },
      { to: "/stock", label: "Stock Report" },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/reports/balance-sheet", label: "Balance Sheet" },
      { to: "/reports/profit-and-loss", label: "Profit & Loss" },
      { to: "/reports/budget-report", label: "Budget Report" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/jobs", label: "System Jobs" },
      { to: "/bulk-import", label: "Bulk Import" },
      { to: "/change-password", label: "Change Password" },
      { to: "/users", label: "User Access", adminOnly: true },
    ],
  },
];

const CONTACT_NAV: NavItem[] = [
  { to: "/portal", label: "My Invoices", end: true },
  { to: "/change-password", label: "Change Password" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { role, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const groups = STAFF_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "admin"),
  })).filter((group) => group.items.length > 0);

  // Whichever group contains the page you're actually on starts open, so you're
  // never dropped onto a page with no visible indication of where it lives.
  const activeGroup = groups.find((group) => group.items.some((item) => location.pathname.startsWith(item.to)))?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  // Give mobile table cards their field names without repeating the same
  // labels in every page component. The desktop table headers become the
  // labels shown beside each value on small screens.
  useEffect(() => {
    const addMobileLabels = () => {
      document.querySelectorAll<HTMLTableElement>(".table-wrap table").forEach((table) => {
        const labels = Array.from(table.querySelectorAll("thead th")).map((header) => header.textContent?.trim() ?? "");
        table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
          Array.from(row.cells).forEach((cell, index) => {
            if (labels[index]) cell.setAttribute("data-label", labels[index]);
          });
        });
      });
    };

    addMobileLabels();
    const observer = new MutationObserver(addMobileLabels);
    const content = document.querySelector(".content");
    if (content) observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function toggleGroup(label: string) {
    setOpenGroup((current) => (current === label ? null : label));
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="shell">
      {mobileMenuOpen && <button type="button" className="mobile-menu-overlay" aria-label="Close menu" onClick={closeMobileMenu} />}
      <aside className={"sidebar" + (mobileMenuOpen ? " mobile-open" : "")}>
        <div className="brand"><BrandMark />Urban Furniture</div>
        <nav>
          {role === "contact" ? (
            CONTACT_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobileMenu} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                {item.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink to={DASHBOARD.to} end={DASHBOARD.end} onClick={closeMobileMenu} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                {DASHBOARD.label}
              </NavLink>
              {groups.map((group) => {
                const isOpen = openGroup === group.label;
                return (
                  <div key={group.label} className="nav-group">
                    <button type="button" className={"nav-group-head" + (isOpen ? " open" : "")} onClick={() => toggleGroup(group.label)}>
                      <span>{group.label}</span>
                      <span className="nav-group-chevron">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="nav-group-items">
                        {group.items.map((item) => (
                          <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobileMenu} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="mobile-menu-toggle" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}>
              <span />
              <span />
              <span />
            </button>
            <span className="mobile-title">Urban Furniture</span>
          </div>
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
