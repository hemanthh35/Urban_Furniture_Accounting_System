import { useEffect, useState } from "react";
import { reportsApi, type ProfitAndLoss } from "../../api/reports";
import { formatMoney } from "../../utils/money";

export default function ProfitAndLossPage() {
  const [data, setData] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setLoading(true);
    reportsApi.profitAndLoss(fromDate, toDate).then(setData).finally(() => setLoading(false));
  }, [fromDate, toDate]);

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page-head">
        <h1>Profit &amp; Loss</h1>
        <div>
          <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>{" "}
          <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        </div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Income</th>
              <th className="mono">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.income.map((a) => (
              <tr key={a.account_name}>
                <td>{a.account_name}</td>
                <td className="mono">{formatMoney(a.balance_cents)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total Income</strong>
              </td>
              <td className="mono">
                <strong>{formatMoney(data.total_income_cents)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Expenses</th>
              <th className="mono">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((a) => (
              <tr key={a.account_name}>
                <td>{a.account_name}</td>
                <td className="mono">{formatMoney(a.balance_cents)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total Expenses</strong>
              </td>
              <td className="mono">
                <strong>{formatMoney(data.total_expenses_cents)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stat-tile" style={{ border: "2px solid var(--line)" }}>
        <div className="stat-tile-label">Net Profit</div>
        <div className="stat-tile-num">{formatMoney(data.net_profit_cents)}</div>
      </div>
    </div>
  );
}
