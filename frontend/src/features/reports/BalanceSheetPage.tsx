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

  // Liabilities and Capital are two separate account types in the ledger, but
  // on a Balance Sheet they're conventionally shown together in one right-hand
  // column (Assets = Liabilities + Capital) - laid out beside Assets, row by
  // row, purely for the printed layout.
  const rightSide = [...data.liabilities, ...data.capital];
  const rowCount = Math.max(data.assets.length, rightSide.length);
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

      <div className="table-wrap report-table">
        <table>
          <thead>
            <tr>
              <th>Assets</th>
              <th>Liabilities</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i}>
                <td>{data.assets[i] ? `${data.assets[i].account_name} - ${formatMoney(data.assets[i].balance_cents)}` : ""}</td>
                <td>{rightSide[i] ? `${rightSide[i].account_name} - ${formatMoney(rightSide[i].balance_cents)}` : ""}</td>
              </tr>
            ))}
            <tr className="report-section-row">
              <td>Total Assets - {formatMoney(data.total_assets_cents)}</td>
              <td>Total Liabilities - {formatMoney(totalRight)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
