import { useEffect, useState } from "react";
import { reportsApi, type BalanceSheet } from "../../api/reports";
import { formatMoney } from "../../utils/money";

export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setLoading(true);
    reportsApi.balanceSheet(fromDate, toDate).then(setData).finally(() => setLoading(false));
  }, [fromDate, toDate]);

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page-head">
        <h1>Balance Sheet</h1>
        <div>
          <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>{" "}
          <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        </div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Assets</th>
              <th className="mono">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.assets.map((a) => (
              <tr key={a.account_name}>
                <td>{a.account_name}</td>
                <td className="mono">{formatMoney(a.balance_cents)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total Assets</strong>
              </td>
              <td className="mono">
                <strong>{formatMoney(data.total_assets_cents)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Liabilities</th>
              <th className="mono">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.liabilities.map((a) => (
              <tr key={a.account_name}>
                <td>{a.account_name}</td>
                <td className="mono">{formatMoney(a.balance_cents)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total Liabilities</strong>
              </td>
              <td className="mono">
                <strong>{formatMoney(data.total_liabilities_cents)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Capital</th>
              <th className="mono">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.capital.map((a) => (
              <tr key={a.account_name}>
                <td>{a.account_name}</td>
                <td className="mono">{formatMoney(a.balance_cents)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total Capital</strong>
              </td>
              <td className="mono">
                <strong>{formatMoney(data.total_capital_cents)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
