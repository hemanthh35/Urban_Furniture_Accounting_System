import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsApi, type DashboardSummary } from "../../api/reports";
import { formatMoney } from "../../utils/money";
import BarChart from "../../components/BarChart";

// A quick at-a-glance summary, pulling from the same reports the Reports pages use.
export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi.dashboardSummary().then(setData).catch(() => setError("Could not load dashboard summary."));
  }, []);

  const margin = data && data.total_income_cents > 0 ? Math.round((data.net_profit_cents / data.total_income_cents) * 100) : null;
  const outstandingTotal = data ? data.outstanding_invoices_cents + data.outstanding_bills_cents : 0;
  const draftTotal = data ? data.draft_purchase_orders + data.draft_sales_orders : 0;

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
          <div className="stat-tile-num">{data ? data.draft_purchase_orders : "..."}</div>
          <div className="stat-tile-label">Draft Purchase Orders</div>
        </Link>
        <Link className="stat-tile" to="/sales-orders">
          <div className="stat-tile-num">{data ? data.draft_sales_orders : "..."}</div>
          <div className="stat-tile-label">Draft Sales Orders</div>
        </Link>
      </div>

      {data && (
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Income vs Expenses</h3>
            <BarChart
              rows={[
                { label: "Income", cents: data.total_income_cents, color: "#12b89c" },
                { label: "Expenses", cents: data.total_expenses_cents, color: "#dc4b5d" },
                { label: "Net Profit", cents: data.net_profit_cents, color: "#2563eb" },
              ]}
            />
          </div>
          <div className="chart-card">
            <h3>Assets vs Liabilities &amp; Capital</h3>
            <BarChart
              rows={[
                { label: "Assets", cents: data.total_assets_cents, color: "#2563eb" },
                { label: "Liabilities", cents: data.total_liabilities_cents, color: "#d88b18" },
                { label: "Capital", cents: data.total_capital_cents, color: "#12b89c" },
              ]}
            />
          </div>
        </div>
      )}

      {data && (
        <section className="dashboard-summary" aria-labelledby="dashboard-summary-title">
          <div className="dashboard-summary-head">
            <h2 id="dashboard-summary-title">Dashboard</h2>
            <span>Business summary</span>
          </div>
          <div className="insight-list">
            <div className="insight-row">
              <span className="insight-dot insight-dot-blue" aria-hidden="true" />
              <p>
                {margin !== null ? (
                  <>You're keeping <strong>{margin}%</strong> of every rupee sold as profit — {formatMoney(data.net_profit_cents)} net on {formatMoney(data.total_income_cents)} in sales.</>
                ) : (
                  <>No sales recorded yet — profit margin will show up here once a Customer Invoice is generated.</>
                )}
              </p>
            </div>
            <div className="insight-row">
              <span className="insight-dot insight-dot-orange" aria-hidden="true" />
              <p>
                {data.top_expense_account ? (
                  <>Biggest cost is <strong>{data.top_expense_account}</strong> at {formatMoney(data.top_expense_cents)}{data.total_expenses_cents > 0 && <> ({Math.round((data.top_expense_cents / data.total_expenses_cents) * 100)}% of all expenses)</>}.</>
                ) : (
                  <>No expenses posted yet.</>
                )}
              </p>
            </div>
            <div className="insight-row">
              <span className="insight-dot insight-dot-green" aria-hidden="true" />
              <p>
                {outstandingTotal > 0 ? (
                  <><strong>{formatMoney(outstandingTotal)}</strong> is still outstanding — {formatMoney(data.outstanding_invoices_cents)} owed to you, {formatMoney(data.outstanding_bills_cents)} you owe.</>
                ) : (
                  <>Every invoice and bill is fully settled — nothing outstanding right now.</>
                )}
              </p>
            </div>
            <div className="insight-row">
              <span className="insight-dot insight-dot-blue" aria-hidden="true" />
              <p>
                {draftTotal > 0 ? (
                  <><strong>{draftTotal}</strong> draft order{draftTotal === 1 ? "" : "s"} still need{draftTotal === 1 ? "s" : ""} converting to a Bill or Invoice before they hit the books.</>
                ) : (
                  <>No draft orders waiting — everything's been converted.</>
                )}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
