import { useEffect, useState, type FormEvent } from "react";
import { productsApi, type Product } from "../../api/products";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { formatMoney } from "../../utils/money";
import { downloadCsv } from "../../utils/export";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("Goods");
  const [salesPrice, setSalesPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [gstPercent, setGstPercent] = useState("0");

  async function load() {
    setLoading(true);
    try {
      setProducts(await productsApi.list(showArchived));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  function openNew() {
    setEditingProduct(null);
    setName("");
    setType("Goods");
    setSalesPrice("");
    setCost("");
    setCategory("");
    setGstPercent("0");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setName(product.name);
    setType(product.type);
    setSalesPrice(String(product.sales_price_cents / 100));
    setCost(String(product.cost_cents / 100));
    setCategory(product.category ?? "");
    setGstPercent(String(product.gst_percent));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      // Rupees typed by the user -> paise stored in the backend.
      const payload = {
        name,
        type,
        sales_price_cents: Math.round(parseFloat(salesPrice) * 100),
        cost_cents: Math.round(parseFloat(cost) * 100),
        category: category || null,
        gst_percent: Math.round(parseFloat(gstPercent) || 0),
      };
      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }
      setModalOpen(false);
      setName("");
      setSalesPrice("");
      setCost("");
      setCategory("");
      setGstPercent("0");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(product: Product) {
    if (!window.confirm(`Archive ${product.name}?`)) return;
    try {
      await productsApi.archive(product.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not archive product");
    }
  }

  async function handleRestore(product: Product) {
    try { await productsApi.restore(product.id); await load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Could not restore product"); }
  }

  const { pageItems, page, totalPages, setPage } = usePagination([...products].sort((a, b) => b.id - a.id));

  return (
    <div>
      <div className="page-head">
        <h1>Products</h1>
        <div>
          <button className="secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Hide archived" : "Show archived"}</button>{" "}
          <button
            className="secondary"
            // Headers match the Bulk Import column names exactly (not just
            // case) so exporting and re-importing this same file round-trips
            // cleanly instead of every row failing on a name it can't find.
            onClick={() => downloadCsv("products.csv", ["name", "type", "sales_price", "cost", "category", "gst_percent"], products.map((p) => [p.name, p.type, (p.sales_price_cents / 100).toFixed(2), (p.cost_cents / 100).toFixed(2), p.category ?? "", p.gst_percent]))}
          >
            Export CSV
          </button>{" "}
          <button onClick={openNew}>+ New Product</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">No products yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Sales Price</th>
                <th>Cost</th>
                <th>GST %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.type}</td>
                  <td className="muted">{p.category ?? "-"}</td>
                  <td className="mono">{formatMoney(p.sales_price_cents)}</td>
                  <td className="mono">{formatMoney(p.cost_cents)}</td>
                  <td className="mono">{p.gst_percent}%</td>
                  <td>
                    {!p.is_archived && <><button className="secondary" onClick={() => openEdit(p)}>Edit</button>{" "}<button className="secondary" onClick={() => handleArchive(p)}>Archive</button></>}
                    {p.is_archived && <button className="secondary" onClick={() => handleRestore(p)}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalOpen && (
        <Modal title={editingProduct ? "Edit Product" : "New Product"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Product Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Goods">Goods</option>
                <option value="Service">Service</option>
                <option value="Combo">Combo</option>
              </select>
            </label>
            <label>
              Sales Price (₹)
              <input type="number" step="0.01" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} required />
            </label>
            <label>
              Cost / Purchase Price (₹)
              <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required />
            </label>
            <label>
              Category
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label>
              GST %
              <input type="number" min="0" max="100" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} required />
            </label>
            <p className="field-hint">Auto-fills the tax % whenever this product is added to a Sales or Purchase Order line - still editable there.</p>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingProduct ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
