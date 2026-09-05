import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { salesApi, type SalesOrder } from "../../api/sales";
import { contactsApi, type Contact } from "../../api/contacts";
import { productsApi, type Product } from "../../api/products";
import { budgetsApi, type AnalyticAccount } from "../../api/budgets";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

type DraftItem = { product_id: string; quantity: string; unit_price_cents: string; tax_percent: string };
const emptyItem = (): DraftItem => ({ product_id: "", quantity: "", unit_price_cents: "", tax_percent: "0" });

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyticAccounts, setAnalyticAccounts] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [invoicingSo, setInvoicingSo] = useState<SalesOrder | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [analyticAccountId, setAnalyticAccountId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? `#${id}`;
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  async function load() {
    setLoading(true);
    try {
      const [so, contacts, prods, analytic] = await Promise.all([salesApi.list(), contactsApi.list(), productsApi.list(), budgetsApi.listAnalyticAccounts()]);
      setOrders(so);
      setCustomers(contacts.filter((c) => c.type === "Customer" || c.type === "Both"));
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
    setCustomerId("");
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

  function openEdit(so: SalesOrder) {
    setEditingOrder(so);
    setCustomerId(String(so.customer_id));
    setAnalyticAccountId(so.analytic_account_id ? String(so.analytic_account_id) : "");
    setOrderDate(so.order_date);
    setItems(so.items.map((item) => ({ product_id: String(item.product_id), quantity: String(item.quantity), unit_price_cents: String(item.unit_price_cents / 100), tax_percent: String(item.tax_percent ?? 0) })));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        customer_id: parseInt(customerId, 10),
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
      if (editingOrder) await salesApi.update(editingOrder.id, payload);
      else await salesApi.create(payload);
      setModalOpen(false);
      setEditingOrder(null);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save sales order");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(so: SalesOrder) {
    if (!window.confirm(`Cancel sales order #${so.id}?`)) return;
    setBusyId(so.id);
    try {
      await salesApi.cancel(so.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not cancel sales order");
    } finally {
      setBusyId(null);
    }
  }

  function openGenerateInvoice(so: SalesOrder) {
    setInvoicingSo(so);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceDueDate("");
  }

  async function handleGenerateInvoice(e: FormEvent) {
    e.preventDefault();
    if (!invoicingSo) return;
    setBusyId(invoicingSo.id);
    try {
      await salesApi.generateInvoice(invoicingSo.id, invoiceDate, invoiceDueDate || null);
      setInvoicingSo(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not generate invoice");
    } finally {
      setBusyId(null);
    }
  }

  const { pageItems, page, totalPages, setPage } = usePagination(orders);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Sales Orders</h1>
          <p className="page-sub">Generating a Customer Invoice from an SO is the step that posts to the ledger.</p>
        </div>
        <button onClick={openNew}>+ New Sales Order</button>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">No sales orders yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SO</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((so) => (
                <tr key={so.id}>
                  <td className="mono">#{so.id}</td>
                  <td>{customerName(so.customer_id)}</td>
                  <td className="muted">{so.order_date}</td>
                  <td className="muted">{so.items.map((i) => `${i.quantity}x ${productName(i.product_id)}`).join(", ")}</td>
                  <td>
                    <span className={so.status === "invoiced" ? "status-pill status-done" : "status-pill status-pending"}>{so.status}</span>
                  </td>
                  <td className="row-actions">
                    {so.status === "draft" && (
                      <>
                      <button className="link-btn" onClick={() => openEdit(so)}>Edit</button>{" "}
                      <button className="link-btn" onClick={() => openGenerateInvoice(so)} disabled={busyId === so.id}>
                        {busyId === so.id ? "Generating..." : "Generate Invoice"}
                      </button>{" "}
                      <button className="link-btn" onClick={() => handleCancel(so)} disabled={busyId === so.id}>Cancel</button>
                      </>
                    )}
                    {so.status === "invoiced" && (
                      <Link className="link-btn" to="/customer-invoices">
                        View Invoice
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalOpen && (
        <Modal title={editingOrder ? `Edit Sales Order #${editingOrder.id}` : "New Sales Order"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label>
              Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                {analyticAccounts.filter((account) => account.type === "Income").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>

            <div className="item-rows-label">Line items</div>
            {items.map((item, i) => (
              <div className="item-row sales-item-row" key={i}>
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

      {invoicingSo && (
        <Modal title={`Generate Invoice from SO #${invoicingSo.id}`} onClose={() => setInvoicingSo(null)}>
          <form onSubmit={handleGenerateInvoice}>
            <label>Invoice Date<input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required /></label>
            <label>Due Date<input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} /></label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setInvoicingSo(null)}>Cancel</button>
              <button type="submit" disabled={busyId === invoicingSo.id}>{busyId === invoicingSo.id ? "Generating..." : "Create Invoice"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
