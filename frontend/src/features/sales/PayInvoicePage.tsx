import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { salesApi, type CustomerInvoiceDetail } from "../../api/sales";
import { ApiError } from "../../api/client";
import { formatMoney } from "../../utils/money";
import BrandMark from "../../components/BrandMark";

// Razorpay's checkout.js (loaded in index.html) defines this global - it's not
// an npm package, just a script tag, so TypeScript needs to be told it exists.
declare const Razorpay: new (options: Record<string, unknown>) => { open: () => void };

function lineTotal(quantity: number, unitPriceCents: number, taxPercent: number): number {
  const base = quantity * unitPriceCents;
  return base + Math.floor((base * taxPercent) / 100);
}

// The page a "Pay Now" link in an invoice/reminder email lands on - no login
// required, authorized by the signed token in the URL instead of a session.
export default function PayInvoicePage() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invoice, setInvoice] = useState<CustomerInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    salesApi.publicInvoiceDetail(Number(invoiceId), token)
      .then(setInvoice)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this invoice"))
      .finally(() => setLoading(false));
  }, [invoiceId, token]);

  async function startPayment() {
    if (!invoiceId) return;
    setPaying(true);
    setError(null);
    try {
      const checkout = await salesApi.publicCheckout(Number(invoiceId), token);
      const rzp = new Razorpay({
        key: checkout.razorpay_key_id,
        order_id: checkout.razorpay_order_id,
        amount: checkout.amount_cents,
        currency: checkout.currency,
        name: "Urban Furniture",
        description: `Invoice #${invoiceId}`,
        // Razorpay confirms payment to our backend via a signed webhook, not
        // through this callback - this just updates the page so the customer
        // sees confirmation without waiting on an email.
        handler: () => setPaid(true),
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 30 }}>
      <div className="auth-form-side" style={{ padding: 0 }}>
        <div className="auth-card" style={{ textAlign: "center", width: 480 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <BrandMark size={44} />
          </div>

          {loading ? (
            <p className="auth-sub">Loading invoice #{invoiceId}...</p>
          ) : error && !invoice ? (
            <>
              <h1>Can't open this invoice</h1>
              <div className="form-error">{error}</div>
              <p className="field-hint" style={{ marginTop: 16 }}>This link may have expired. Log in to your account to see a fresh one, or contact us.</p>
            </>
          ) : invoice ? (
            paid || invoice.status === "paid" ? (
              <>
                <h1>{paid ? "Payment received" : "Already paid"}</h1>
                <p className="auth-sub">
                  {paid
                    ? <>Thanks! Invoice #{invoice.id} is marked paid. A confirmation email is on its way.</>
                    : <>Invoice #{invoice.id} is already fully paid - nothing more to do here.</>}
                </p>
              </>
            ) : (
              <>
                <h1>Invoice #{invoice.id}</h1>
                <p className="auth-sub" style={{ marginBottom: 20 }}>
                  {invoice.due_date ? <>Due {invoice.due_date}</> : "No due date set"} · Status: <strong>{invoice.status}</strong>
                </p>

                <div className="table-wrap" style={{ textAlign: "left", marginBottom: 18 }}>
                  <table>
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th></tr></thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td className="mono">{item.quantity}</td>
                          <td className="mono">{formatMoney(item.unit_price_cents)}</td>
                          <td className="mono">{item.tax_percent}%</td>
                          <td className="mono">{formatMoney(lineTotal(item.quantity, item.unit_price_cents, item.tax_percent))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, textAlign: "right" }}>
                  <span className="muted">Subtotal: {formatMoney(invoice.subtotal_cents)}</span>
                  <span className="muted">Tax: {formatMoney(invoice.tax_cents)}</span>
                  {invoice.paid_amount_cents > 0 && <span className="muted">Already paid: {formatMoney(invoice.paid_amount_cents)}</span>}
                  <span style={{ fontSize: "1.15rem", fontWeight: 800 }}>Amount due: {formatMoney(invoice.outstanding_amount_cents)}</span>
                </div>

                {error && <div className="form-error">{error}</div>}
                <button onClick={startPayment} disabled={paying} style={{ width: "100%" }}>
                  {paying ? "Starting checkout..." : `Pay ${formatMoney(invoice.outstanding_amount_cents)}`}
                </button>
                <p className="field-hint" style={{ textAlign: "center", marginTop: 16 }}>
                  This link was sent to you by email and doesn't require an account login.
                </p>
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
