import { useEffect, useState } from "react";
import { reportsApi, type BudgetReport } from "../../api/reports";
import { formatMoney } from "../../utils/money";

export default function BudgetReportPage() {
  const [data, setData] = useState<BudgetReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.budgetReport().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <h1>Budget Report</h1>
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
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.budget_name}</td>
                  <td className="muted">{r.period}</td>
                  <td className="muted">{r.analytic_account_name}</td>
                  <td className="mono">{formatMoney(r.planned_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
