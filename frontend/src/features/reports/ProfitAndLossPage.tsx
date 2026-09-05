import { useEffect, useState } from "react";
import { reportsApi, type ProfitAndLoss } from "../../api/reports";
import { formatMoney } from "../../utils/money";
import { downloadCsv } from "../../utils/export";

export default function ProfitAndLossPage() {
  const [data, setData] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.profitAndLoss().then(setData).catch(() => setError("Could not load the profit and loss report.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading...</div>;
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
    </div>
  );
}
