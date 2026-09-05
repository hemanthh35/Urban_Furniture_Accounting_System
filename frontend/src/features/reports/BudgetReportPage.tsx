import { useEffect, useState } from "react";
import { reportsApi, type BudgetReport } from "../../api/reports";
import { formatMoney } from "../../utils/money";
import { downloadCsv } from "../../utils/export";

export default function BudgetReportPage() {
  const [data, setData] = useState<BudgetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.budgetReport(fromDate, toDate).then(setData).catch(() => setError("Could not load the budget report.")).finally(() => setLoading(false));
  }, [fromDate, toDate]);

  if (loading) return <div className="empty-state">Loading...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div>
      <div className="page-head">
        <h1>Budget Report</h1>
        <div>
          <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>{" "}
          <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          <button className="secondary" onClick={() => window.print()}>Print</button>{" "}
          <button className="secondary" onClick={() => downloadCsv("budget-report.csv", ["Budget", "Period", "Analytic Account", "Planned", "Actual", "Remaining"], data?.rows.map((r) => [r.budget_name, r.period, r.analytic_account_name, r.planned_amount_cents, r.actual_amount_cents, r.remaining_amount_cents]) ?? [])}>Export CSV</button>
        </div>
      </div>

      {!data || data.rows.length === 0 ? (
        <div className="empty-state">No budgets set up yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Budget</th>
                <th>Period</th>
                <th>Analytic Account</th>
                <th>Planned Amount</th>
                <th>Actual Amount</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.budget_name}</td>
                  <td className="muted">{r.period}</td>
                  <td className="muted">{r.analytic_account_name}</td>
                  <td className="mono">{formatMoney(r.planned_amount_cents)}</td>
                  <td className="mono">{formatMoney(r.actual_amount_cents)}</td>
                  <td className="mono">{formatMoney(r.remaining_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
