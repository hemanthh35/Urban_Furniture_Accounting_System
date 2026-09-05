import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import Layout from "./components/Layout";
import DashboardPage from "./features/dashboard/DashboardPage";
import ContactsPage from "./features/contacts/ContactsPage";
import ProductsPage from "./features/products/ProductsPage";
import AccountsPage from "./features/accounts/AccountsPage";
import AnalyticAccountsPage from "./features/budgets/AnalyticAccountsPage";
import BudgetsPage from "./features/budgets/BudgetsPage";
import PurchaseOrdersPage from "./features/purchases/PurchaseOrdersPage";
import VendorBillsPage from "./features/purchases/VendorBillsPage";
import SalesOrdersPage from "./features/sales/SalesOrdersPage";
import CustomerInvoicesPage from "./features/sales/CustomerInvoicesPage";
import BalanceSheetPage from "./features/reports/BalanceSheetPage";
import ProfitAndLossPage from "./features/reports/ProfitAndLossPage";
import BudgetReportPage from "./features/reports/BudgetReportPage";
import JournalsPage from "./features/journals/JournalsPage";
import StockReportPage from "./features/stock/StockReportPage";
import ChangePasswordPage from "./features/auth/ChangePasswordPage";
import UsersPage from "./features/auth/UsersPage";
import JobsPage from "./features/jobs/JobsPage";

const STAFF = ["admin", "accountant"];

function Staff({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute roles={STAFF}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Contact-role users only ever see this one page - their own invoices. */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute roles={["contact"]}>
                <Layout>
                  <CustomerInvoicesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/change-password" element={<ProtectedRoute><Layout><ChangePasswordPage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={["admin"]}><Layout><UsersPage /></Layout></ProtectedRoute>} />

          <Route path="/" element={<Staff><DashboardPage /></Staff>} />
          <Route path="/contacts" element={<Staff><ContactsPage /></Staff>} />
          <Route path="/products" element={<Staff><ProductsPage /></Staff>} />
          <Route path="/accounts" element={<Staff><AccountsPage /></Staff>} />
          <Route path="/analytic-accounts" element={<Staff><AnalyticAccountsPage /></Staff>} />
          <Route path="/budgets" element={<Staff><BudgetsPage /></Staff>} />
          <Route path="/journals" element={<Staff><JournalsPage /></Staff>} />
          <Route path="/stock" element={<Staff><StockReportPage /></Staff>} />
          <Route path="/purchase-orders" element={<Staff><PurchaseOrdersPage /></Staff>} />
          <Route path="/vendor-bills" element={<Staff><VendorBillsPage /></Staff>} />
          <Route path="/sales-orders" element={<Staff><SalesOrdersPage /></Staff>} />
          <Route path="/customer-invoices" element={<Staff><CustomerInvoicesPage /></Staff>} />
          <Route path="/reports/balance-sheet" element={<Staff><BalanceSheetPage /></Staff>} />
          <Route path="/reports/profit-and-loss" element={<Staff><ProfitAndLossPage /></Staff>} />
          <Route path="/reports/budget-report" element={<Staff><BudgetReportPage /></Staff>} />
          <Route path="/jobs" element={<Staff><JobsPage /></Staff>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
