import { useEffect, useState } from "react";
import { stockApi, type StockRow } from "../../api/stock";

export default function StockReportPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockApi.report().then(setRows).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Stock Report</h1>
          <p className="page-sub">Stock comes in from vendor bills and goes out through customer invoices.</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">No stock movements yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Quantity In</th><th>Quantity Out</th><th>On Hand</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.product_id}>
                  <td>{row.product_name}</td>
                  <td className="mono">{row.quantity_in}</td>
                  <td className="mono">{row.quantity_out}</td>
                  <td className="mono"><strong>{row.quantity_on_hand}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
