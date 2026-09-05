import { formatMoney } from "../utils/money";

export interface BarChartRow {
  label: string;
  cents: number;
  color: string;
}

// A plain horizontal comparison bar - no charting library, just a handful of
// divs sized by percentage. Enough for "how does A compare to B" at a glance,
// which is all a dashboard needs.
export default function BarChart({ rows }: { rows: BarChartRow[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.cents)), 1);
  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <div className="bar-chart-row" key={row.label}>
          <div className="bar-chart-row-head">
            <span>{row.label}</span>
            <span className="mono">{formatMoney(row.cents)}</span>
          </div>
          <div className="bar-chart-track">
            <div className="bar-chart-fill" style={{ width: `${(Math.abs(row.cents) / max) * 100}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
