import { useEffect, useState } from "react";
import { reportsApi, type BalanceSheet } from "../../api/reports";
import { formatMoney } from "../../utils/money";
import { downloadCsv } from "../../utils/export";

export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.balanceSheet().then(setData).catch(() => setError("Could not load the balance sheet.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!data) return null;

  const totalRight = data.total_liabilities_cents + data.total_capital_cents;

  return (
    <div>
      <div className="page-head">
        <h1>Balance Sheet</h1>
        <div>
          <button className="secondary" onClick={() => window.print()}>Print</button>{" "}
          <button className="secondary" onClick={() => downloadCsv("balance-sheet.csv", ["Section", "Account", "Amount"], [...data.assets.map((a) => ["Assets", a.account_name, a.balance_cents]), ...data.liabilities.map((a) => ["Liabilities", a.account_name, a.balance_cents]), ...data.capital.map((a) => ["Capital", a.account_name, a.balance_cents])])}>Export CSV</button>
        </div>
      </div>

      <div className="report-grid">
        <section className="report-card">
          <h2>Assets</h2>
          <div className="table-wrap report-table">
            <table>
              <thead><tr><th>Account</th><th>Amount</th></tr></thead>
              <tbody>
                {data.assets.map((account) => <tr key={account.account_name}><td>{account.account_name}</td><td className="mono">{formatMoney(account.balance_cents)}</td></tr>)}
                <tr className="report-total-row"><td>Total Assets</td><td className="mono">{formatMoney(data.total_assets_cents)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-card">
          <h2>Liabilities &amp; Capital</h2>
          <div className="table-wrap report-table">
            <table>
              <thead><tr><th>Account</th><th>Amount</th></tr></thead>
              <tbody>
                {data.liabilities.map((account) => <tr key={`liability-${account.account_name}`}><td>{account.account_name}</td><td className="mono">{formatMoney(account.balance_cents)}</td></tr>)}
                {data.capital.map((account) => <tr key={`capital-${account.account_name}`}><td>{account.account_name}</td><td className="mono">{formatMoney(account.balance_cents)}</td></tr>)}
                <tr className="report-total-row"><td>Total Liabilities &amp; Capital</td><td className="mono">{formatMoney(totalRight)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
