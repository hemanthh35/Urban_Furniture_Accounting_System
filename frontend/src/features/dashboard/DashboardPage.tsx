import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsApi, type DashboardSummary } from "../../api/reports";
import { formatMoney } from "../../utils/money";

// A quick at-a-glance summary, pulling from the same reports the Reports pages use.
export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi.dashboardSummary().then(setData).catch(() => setError("Could not load dashboard summary."));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="stat-grid">
        <Link className="stat-tile" to="/reports/balance-sheet">
          <div className="stat-tile-num">{data ? formatMoney(data.total_assets_cents) : "..."}</div>
          <div className="stat-tile-label">Total Assets</div>
        </Link>
        <Link className="stat-tile" to="/reports/profit-and-loss">
          <div className="stat-tile-num">{data ? formatMoney(data.net_profit_cents) : "..."}</div>
          <div className="stat-tile-label">Net Profit</div>
        </Link>
        <Link className="stat-tile" to="/customer-invoices">
          <div className="stat-tile-num">{data ? formatMoney(data.outstanding_invoices_cents) : "..."}</div>
          <div className="stat-tile-label">Outstanding Invoices</div>
        </Link>
        <Link className="stat-tile" to="/vendor-bills">
          <div className="stat-tile-num">{data ? formatMoney(data.outstanding_bills_cents) : "..."}</div>
          <div className="stat-tile-label">Outstanding Vendor Bills</div>
        </Link>
        <Link className="stat-tile" to="/stock">
          <div className="stat-tile-num">{data ? `${data.units_in_stock} units` : "..."}</div>
          <div className="stat-tile-label">Stock on Hand ({data?.products_in_stock ?? "..."} products)</div>
        </Link>
        <Link className="stat-tile" to="/reports/budget-report">
          <div className="stat-tile-num">{data ? formatMoney(data.budget_actual_cents) : "..."}</div>
          <div className="stat-tile-label">Budget Actual / {data ? formatMoney(data.budget_planned_cents) : "..."}</div>
        </Link>
        <Link className="stat-tile" to="/purchase-orders">
          <div className="stat-tile-label">Purchase Orders</div>
        </Link>
        <Link className="stat-tile" to="/sales-orders">
          <div className="stat-tile-label">Sales Orders</div>
        </Link>
      </div>
    </div>
  );
}
