import BrandMark from "./BrandMark";

// The left-hand panel shared by Login and Signup - real branding and a real
// photo instead of another floating card on a generic gradient background.
export default function AuthVisual() {
  return (
    <div className="auth-visual">
      <img src="https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=80" alt="" />
      <div className="auth-visual-content">
        <div className="auth-visual-brand">
          <BrandMark size={38} />
          Urban Furniture
        </div>
        <div>
          <h2>Every sale, purchase, and payment. Booked correctly, automatically.</h2>
          <ul className="auth-visual-points">
            <li>Real double-entry ledger, balanced every time</li>
            <li>GST calculated automatically per product</li>
            <li>Live Balance Sheet &amp; Profit and Loss - never re-typed</li>
          </ul>
        </div>
        <p className="auth-visual-foot">Accounting built for furniture businesses</p>
      </div>
    </div>
  );
}
