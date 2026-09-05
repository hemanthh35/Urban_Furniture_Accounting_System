import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { purchasesApi, type PurchaseOrder } from "../../api/purchases";
import { contactsApi, type Contact } from "../../api/contacts";
import { productsApi, type Product } from "../../api/products";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";

type DraftItem = { product_id: string; quantity: string; unit_price_cents: string };
const emptyItem = (): DraftItem => ({ product_id: "", quantity: "", unit_price_cents: "" });

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const vendorName = (id: number) => vendors.find((v) => v.id === id)?.name ?? `#${id}`;
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  async function load() {
    setLoading(true);
    try {
      const [po, contacts, prods] = await Promise.all([purchasesApi.list(), contactsApi.list(), productsApi.list()]);
      setOrders(po);
      setVendors(contacts.filter((c) => c.type === "Vendor" || c.type === "Both"));
      setProducts(prods);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await purchasesApi.create({
        vendor_id: parseInt(vendorId, 10),
        order_date: orderDate,
        items: items
          .filter((i) => i.product_id && i.quantity && i.unit_price_cents)
          .map((i) => ({
            product_id: parseInt(i.product_id, 10),
            quantity: parseInt(i.quantity, 10),
            unit_price_cents: Math.round(parseFloat(i.unit_price_cents) * 100),
          })),
      });
      setModalOpen(false);
      setVendorId("");
      setItems([emptyItem()]);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create purchase order");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertToBill(po: PurchaseOrder) {
    setBusyId(po.id);
    try {
      await purchasesApi.convertToBill(po.id, new Date().toISOString().slice(0, 10));
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not convert to bill");
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
        <button onClick={() => setModalOpen(true)}>+ New Purchase Order</button>
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
                      <button className="link-btn" onClick={() => handleConvertToBill(po)} disabled={busyId === po.id}>
                        {busyId === po.id ? "Converting..." : "Convert to Bill"}
                      </button>
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
        <Modal title="New Purchase Order" onClose={() => setModalOpen(false)}>
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
                {saving ? "Saving..." : "Create draft"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
