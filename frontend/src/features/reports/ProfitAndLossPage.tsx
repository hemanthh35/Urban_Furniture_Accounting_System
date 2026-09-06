import { useEffect, useState } from "react";
import { reportsApi, type ProfitAndLoss } from "../../api/reports";
import DatePicker from "../../components/DatePicker";
import { formatMoney } from "../../utils/money";
import { downloadCsv } from "../../utils/export";

export default function ProfitAndLossPage() {
  const [data, setData] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.profitAndLoss(fromDate, toDate).then(setData).catch(() => setError("Could not load the profit and loss report.")).finally(() => setLoading(false));
  }, [fromDate, toDate]);

  function exportProductBreakdown() {
    if (!data) return;
    const rangeLabel = fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : "";
    downloadCsv(
      `profit-and-loss-by-product${rangeLabel}.csv`,
      ["Product", "Units Sold", "Revenue", "Units Purchased", "Purchase Spend", "Est. Cost of Goods Sold", "Est. Gross Profit"],
      data.by_product.map((row) => [
        row.product_name,
        row.units_sold,
        (row.revenue_cents / 100).toFixed(2),
        row.units_purchased,
        (row.purchase_spend_cents / 100).toFixed(2),
        (row.estimated_cost_of_goods_sold_cents / 100).toFixed(2),
        (row.estimated_gross_profit_cents / 100).toFixed(2),
      ])
    );
  }

  if (loading && !data) return <div className="empty-state">Loading...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page-head">
        <h1>Profit &amp; Loss</h1>
        <div>
          <button className="secondary" onClick={() => window.print()}>Print</button>{" "}
          <button className="secondary" onClick={() => downloadCsv("profit-and-loss.csv", ["Section", "Account", "Amount"], [...data.income.map((a) => ["Income", a.account_name, a.balance_cents]), ...data.expenses.map((a) => ["Expenses", a.account_name, a.balance_cents])])}>Export CSV</button>
        </div>
      </div>

      <div className="date-range-export" style={{ marginBottom: 24 }}>
        <DatePicker value={fromDate} onChange={setFromDate} placeholder="From" title="From date" />
        <span className="muted">to</span>
        <DatePicker value={toDate} onChange={setToDate} placeholder="To" title="To date" />
      </div>
      <p className="field-hint" style={{ margin: "-16px 0 24px" }}>Leave both blank to see every transaction ever posted.</p>

      <div className="report-grid">
        <section className="report-card">
          <h2>Income</h2>
          <div className="table-wrap report-table">
            <table>
              <thead><tr><th>Account</th><th>Amount</th></tr></thead>
              <tbody>
                {data.income.map((account) => <tr key={account.account_name}><td>{account.account_name}</td><td className="mono">{formatMoney(account.balance_cents)}</td></tr>)}
                <tr className="report-total-row"><td>Total Income</td><td className="mono">{formatMoney(data.total_income_cents)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-card">
          <h2>Expenses</h2>
          <div className="table-wrap report-table">
            <table>
              <thead><tr><th>Account</th><th>Amount</th></tr></thead>
              <tbody>
                {data.expenses.map((account) => <tr key={account.account_name}><td>{account.account_name}</td><td className="mono">{formatMoney(account.balance_cents)}</td></tr>)}
                <tr className="report-total-row"><td>Total Expenses</td><td className="mono">{formatMoney(data.total_expenses_cents)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="report-net-card">
        <span>Net Income</span>
        <strong>{formatMoney(data.net_profit_cents)}</strong>
      </div>

      <div className="page-head" style={{ marginTop: 40 }}>
        <div>
          <h2 style={{ margin: 0 }}>Profit &amp; Loss by Product</h2>
          <p className="page-sub" style={{ margin: "6px 0 0" }}>Which products actually earned the income and expense totals above.</p>
        </div>
        <button className="secondary" onClick={exportProductBreakdown} disabled={data.by_product.length === 0}>Export CSV</button>
      </div>

      {data.by_product.length === 0 ? (
        <div className="empty-state">No sales or purchases in this range yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Units Purchased</th>
                <th>Purchase Spend</th>
                <th>Est. Cost of Goods Sold</th>
                <th>Est. Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.by_product.map((row) => (
                <tr key={row.product_id}>
                  <td>{row.product_name}</td>
                  <td className="mono">{row.units_sold}</td>
                  <td className="mono">{formatMoney(row.revenue_cents)}</td>
                  <td className="mono">{row.units_purchased}</td>
                  <td className="mono">{formatMoney(row.purchase_spend_cents)}</td>
                  <td className="mono">{formatMoney(row.estimated_cost_of_goods_sold_cents)}</td>
                  <td className="mono" style={{ color: row.estimated_gross_profit_cents < 0 ? "var(--danger)" : undefined }}>
                    {formatMoney(row.estimated_gross_profit_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="field-hint" style={{ marginTop: 12 }}>
        "Est. Cost of Goods Sold" values units actually sold in this range at each product's current master Cost - not the literal price paid for those specific units, which the ledger doesn't track per unit.
      </p>
    </div>
  );
}
