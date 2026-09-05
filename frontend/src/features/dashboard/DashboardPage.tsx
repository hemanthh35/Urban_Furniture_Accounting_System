import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsApi } from "../../api/reports";
import { formatMoney } from "../../utils/money";

// A quick at-a-glance summary, pulling from the same reports the Reports pages use.
export default function DashboardPage() {
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [netProfit, setNetProfit] = useState<number | null>(null);

  useEffect(() => {
    reportsApi.balanceSheet().then((d) => setTotalAssets(d.total_assets_cents));
    reportsApi.profitAndLoss().then((d) => setNetProfit(d.net_profit_cents));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>
      <div className="stat-grid">
        <Link className="stat-tile" to="/reports/balance-sheet">
          <div className="stat-tile-num">{totalAssets !== null ? formatMoney(totalAssets) : "..."}</div>
          <div className="stat-tile-label">Total Assets</div>
        </Link>
        <Link className="stat-tile" to="/reports/profit-and-loss">
          <div className="stat-tile-num">{netProfit !== null ? formatMoney(netProfit) : "..."}</div>
          <div className="stat-tile-label">Net Profit</div>
        </Link>
        <Link className="stat-tile" to="/purchase-orders">
          <div className="stat-tile-label">Purchase Orders</div>
        </Link>
        <Link className="stat-tile" to="/sales-orders">
          <div className="stat-tile-label">Sales Orders</div>
        </Link>
      </div>
    </div>
  );
}
