import { useEffect, useState, type FormEvent } from "react";
import { stockApi, type StockRow } from "../../api/stock";
import { productsApi, type Product } from "../../api/products";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import DatePicker from "../../components/DatePicker";
import { usePagination } from "../../hooks/usePagination";

export default function StockReportPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof stockApi.movements>>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([stockApi.report(), stockApi.movements(), productsApi.list()])
      .then(([report, movementList, productList]) => { setRows(report); setMovements(movementList); setProducts(productList); })
      .finally(() => setLoading(false));
  }, []);

  async function handleAdjustment(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await stockApi.adjust({ product_id: Number(productId), quantity_delta: Number(quantityDelta), movement_date: movementDate, reason: reason || null });
      setModalOpen(false);
      setProductId("");
      setQuantityDelta("");
      setReason("");
      const [report, movementList] = await Promise.all([stockApi.report(), stockApi.movements()]);
      setRows(report);
      setMovements(movementList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save stock adjustment");
    }
  }

  // Hooks must run every render regardless of the loading early-return below.
  // rows is a per-product summary, not a log - no "newest" to sort by, leave as-is.
  const rowsPage = usePagination(rows);
  const movementsPage = usePagination([...movements].sort((a, b) => b.id - a.id));

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Stock Report</h1>
          <p className="page-sub">Stock comes in from vendor bills and goes out through customer invoices.</p>
        </div>
        <div>
          <button onClick={() => setModalOpen(true)}>+ Stock Adjustment</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">No stock movements yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Quantity In</th><th>Quantity Out</th><th>On Hand</th></tr></thead>
            <tbody>
              {rowsPage.pageItems.map((row) => (
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
      <Pagination page={rowsPage.page} totalPages={rowsPage.totalPages} onChange={rowsPage.setPage} />

      <h2>Stock Movements</h2>
      {movements.length === 0 ? <div className="empty-state">No movements in this period.</div> : (
        <div className="table-wrap">
          <table><thead><tr><th>Date</th><th>Product</th><th>Source</th><th>Quantity</th><th>Reason</th></tr></thead>
            <tbody>{movementsPage.pageItems.map((movement) => <tr key={movement.id}><td>{movement.movement_date}</td><td>{products.find((p) => p.id === movement.product_id)?.name ?? `#${movement.product_id}`}</td><td>{movement.source_type} #{movement.source_id}</td><td className="mono">{movement.quantity_delta}</td><td>{movement.reason ?? "-"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <Pagination page={movementsPage.page} totalPages={movementsPage.totalPages} onChange={movementsPage.setPage} />

      {modalOpen && (
        <Modal title="Stock Adjustment" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleAdjustment}>
            <label>Product<select value={productId} onChange={(e) => setProductId(e.target.value)} required><option value="" disabled>Select a product</option>{products.filter((p) => p.type !== "Service").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Quantity Change<input type="number" value={quantityDelta} onChange={(e) => setQuantityDelta(e.target.value)} placeholder="Use negative to remove" required /></label>
            <label>Date<DatePicker value={movementDate} onChange={setMovementDate} required /></label>
            <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opening stock, correction..." /></label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit">Save Adjustment</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
