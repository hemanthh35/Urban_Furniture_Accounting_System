import type { ReactNode } from "react";
import Modal from "./Modal";
import { formatMoney } from "../utils/money";

export type BillLine = {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price_cents: number;
  tax_percent: number;
};

export type BillPayment = {
  id: number;
  method: string;
  amount_cents: number;
  date: string;
};

type BillPreviewProps = {
  kind: "Customer Invoice" | "Vendor Bill";
  id: number;
  reference: string;
  date: string;
  dueDate: string | null;
  partyLabel: string;
  partyName: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  lines: BillLine[];
  payments: BillPayment[];
  onClose: () => void;
  footer?: ReactNode;
};

export default function BillPreview({
  kind,
  id,
  reference,
  date,
  dueDate,
  partyLabel,
  partyName,
  status,
  subtotalCents,
  taxCents,
  totalCents,
  paidCents,
  lines,
  payments,
  onClose,
  footer,
}: BillPreviewProps) {
  const balanceCents = Math.max(totalCents - paidCents, 0);

  return (
    <Modal title={`${kind} #${id}`} onClose={onClose} className="bill-modal">
      <div className="bill-document">
        <div className="bill-brand-row">
          <div className="bill-brand">
            <span className="bill-brand-mark">UF</span>
            <span>
              <strong>Urban Furniture</strong>
              <small>Accounting System</small>
            </span>
          </div>
          <span className="bill-status">{status}</span>
        </div>

        <div className="bill-title-row">
          <div>
            <span className="bill-eyebrow">{kind}</span>
            <h1>#{id}</h1>
          </div>
          <div className="bill-meta">
            <div><span>Reference</span><strong>{reference}</strong></div>
            <div><span>Date</span><strong>{date}</strong></div>
            <div><span>Due date</span><strong>{dueDate ?? "Not set"}</strong></div>
          </div>
        </div>

        <div className="bill-party-card">
          <span>{partyLabel}</span>
          <strong>{partyName}</strong>
          <small>{kind === "Customer Invoice" ? "Thank you for your business." : "Thank you for supplying Urban Furniture."}</small>
        </div>

        <div className="bill-lines">
          <div className="bill-section-title">Items</div>
          <div className="table-wrap bill-line-table">
            <table>
              <thead>
                <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Tax Amount</th><th>Line Total</th></tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineSubtotal = line.quantity * line.unit_price_cents;
                  const lineTax = Math.floor(lineSubtotal * line.tax_percent / 100);
                  return (
                    <tr key={line.product_id}>
                      <td><strong>{line.product_name ?? `Product #${line.product_id}`}</strong><small>Product ID: {line.product_id}</small></td>
                      <td>{line.quantity}</td>
                      <td className="mono">{formatMoney(line.unit_price_cents)}</td>
                      <td>{line.tax_percent}%</td>
                      <td className="mono">{formatMoney(lineTax)}</td>
                      <td className="mono"><strong>{formatMoney(lineSubtotal + lineTax)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bill-bottom-row">
          <div className="bill-note">All amounts are shown in Indian Rupees (INR).</div>
          <div className="bill-totals">
            <div><span>Subtotal</span><strong>{formatMoney(subtotalCents)}</strong></div>
            <div><span>Tax</span><strong>{formatMoney(taxCents)}</strong></div>
            <div className="bill-grand-total"><span>Total</span><strong>{formatMoney(totalCents)}</strong></div>
            <div><span>Paid</span><strong>{formatMoney(paidCents)}</strong></div>
            <div className="bill-balance"><span>Balance due</span><strong>{formatMoney(balanceCents)}</strong></div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="bill-payments">
            <div className="bill-section-title">Payment history</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
                <tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.date}</td><td>{payment.method}</td><td className="mono"><strong>{formatMoney(payment.amount_cents)}</strong></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {footer && <div className="bill-footer-actions">{footer}</div>}
      </div>
    </Modal>
  );
}
