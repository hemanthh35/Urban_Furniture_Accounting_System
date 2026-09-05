import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { purchasesApi, type PurchaseOrder } from "../../api/purchases";
import { contactsApi, type Contact } from "../../api/contacts";
import { productsApi, type Product } from "../../api/products";
import { budgetsApi, type AnalyticAccount } from "../../api/budgets";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";

type DraftItem = { product_id: string; quantity: string; unit_price_cents: string; tax_percent: string };
const emptyItem = (): DraftItem => ({ product_id: "", quantity: "", unit_price_cents: "", tax_percent: "0" });

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyticAccounts, setAnalyticAccounts] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [convertingPo, setConvertingPo] = useState<PurchaseOrder | null>(null);

  const [vendorId, setVendorId] = useState("");
  const [analyticAccountId, setAnalyticAccountId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [billDueDate, setBillDueDate] = useState("");

  const vendorName = (id: number) => vendors.find((v) => v.id === id)?.name ?? `#${id}`;
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  async function load() {
    setLoading(true);
    try {
      const [po, contacts, prods, analytic] = await Promise.all([purchasesApi.list(), contactsApi.list(), productsApi.list(), budgetsApi.listAnalyticAccounts()]);
      setOrders(po);
      setVendors(contacts.filter((c) => c.type === "Vendor" || c.type === "Both"));
      setProducts(prods);
      setAnalyticAccounts(analytic);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setVendorId("");
    setAnalyticAccountId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setItems([emptyItem()]);
    setFormError(null);
  }

  function openNew() {
    setEditingOrder(null);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(po: PurchaseOrder) {
    setEditingOrder(po);
    setVendorId(String(po.vendor_id));
    setAnalyticAccountId(po.analytic_account_id ? String(po.analytic_account_id) : "");
    setOrderDate(po.order_date);
    setItems(po.items.map((item) => ({ product_id: String(item.product_id), quantity: String(item.quantity), unit_price_cents: String(item.unit_price_cents / 100), tax_percent: String(item.tax_percent ?? 0) })));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        vendor_id: parseInt(vendorId, 10),
        analytic_account_id: analyticAccountId ? parseInt(analyticAccountId, 10) : null,
        order_date: orderDate,
        items: items
          .filter((i) => i.product_id && i.quantity && i.unit_price_cents)
          .map((i) => ({
            product_id: parseInt(i.product_id, 10),
            quantity: parseInt(i.quantity, 10),
            unit_price_cents: Math.round(parseFloat(i.unit_price_cents) * 100),
            tax_percent: parseInt(i.tax_percent || "0", 10),
          })),
      };
      if (editingOrder) await purchasesApi.update(editingOrder.id, payload);
      else await purchasesApi.create(payload);
      setModalOpen(false);
      setEditingOrder(null);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save purchase order");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(po: PurchaseOrder) {
    if (!window.confirm(`Cancel purchase order #${po.id}?`)) return;
    setBusyId(po.id);
    try {
      await purchasesApi.cancel(po.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not cancel purchase order");
    } finally {
      setBusyId(null);
    }
  }

  function openConvertToBill(po: PurchaseOrder) {
    setConvertingPo(po);
    setBillDate(new Date().toISOString().slice(0, 10));
    setBillDueDate("");
  }

  async function handleConvertToBill(e: FormEvent) {
    e.preventDefault();
    if (!convertingPo) return;
    setBusyId(convertingPo.id);
    try {
      await purchasesApi.convertToBill(convertingPo.id, billDate, billDueDate || null);
      setConvertingPo(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not convert to bill");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Purchase Orders</h1>
          <p className="page-sub">Once goods are received, convert a PO into a Vendor Bill - that's the step that posts to the ledger.</p>
        </div>
        <button onClick={openNew}>+ New Purchase Order</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">No purchase orders yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td className="mono">#{po.id}</td>
                  <td>{vendorName(po.vendor_id)}</td>
                  <td className="muted">{po.order_date}</td>
                  <td className="muted">{po.items.map((i) => `${i.quantity}x ${productName(i.product_id)}`).join(", ")}</td>
                  <td>
                    <span className={po.status === "billed" ? "status-pill status-done" : "status-pill status-pending"}>{po.status}</span>
                  </td>
                  <td className="row-actions">
                    {po.status === "draft" && (
                      <>
                      <button className="link-btn" onClick={() => openEdit(po)}>Edit</button>{" "}
                      <button className="link-btn" onClick={() => openConvertToBill(po)} disabled={busyId === po.id}>
                        {busyId === po.id ? "Converting..." : "Convert to Bill"}
                      </button>{" "}
                      <button className="link-btn" onClick={() => handleCancel(po)} disabled={busyId === po.id}>Cancel</button>
                      </>
                    )}
                    {po.status === "billed" && (
                      <Link className="link-btn" to="/vendor-bills">
                        View Bill
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingOrder ? `Edit Purchase Order #${editingOrder.id}` : "New Purchase Order"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Vendor
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="" disabled>
                  Select a vendor
                </option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Order Date
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
            </label>
            <label>
              Budget / Analytic Account
              <select value={analyticAccountId} onChange={(e) => setAnalyticAccountId(e.target.value)}>
                <option value="">None</option>
                {analyticAccounts.filter((account) => account.type === "Expenses").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>

            <div className="item-rows-label">Line items</div>
            {items.map((item, i) => (
              <div className="item-row" key={i}>
                <select value={item.product_id} onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, product_id: e.target.value } : it)))} required>
                  <option value="" disabled>
                    Product
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, quantity: e.target.value } : it)))} required />
                <input type="number" step="0.01" placeholder="Unit Price ₹" value={item.unit_price_cents} onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, unit_price_cents: e.target.value } : it)))} required />
                <input type="number" min="0" max="100" placeholder="Tax %" value={item.tax_percent} onChange={(e) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, tax_percent: e.target.value } : it)))} />
                {items.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove line">
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="secondary add-line-btn" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
              + Add line
            </button>

            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingOrder ? "Save changes" : "Create draft"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {convertingPo && (
        <Modal title={`Convert PO #${convertingPo.id} to Bill`} onClose={() => setConvertingPo(null)}>
          <form onSubmit={handleConvertToBill}>
            <label>Bill Date<input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required /></label>
            <label>Due Date<input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} /></label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setConvertingPo(null)}>Cancel</button>
              <button type="submit" disabled={busyId === convertingPo.id}>{busyId === convertingPo.id ? "Converting..." : "Create Bill"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
