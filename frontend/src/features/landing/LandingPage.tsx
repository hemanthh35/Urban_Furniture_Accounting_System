import { Link } from "react-router-dom";

// Small stroke-style icon set for the feature grid - keeps the page from
// leaning on emoji, which render inconsistently across platforms anyway.
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const LedgerIcon = () => (
  <Icon>
    <path d="M6 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V4Z" />
    <path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" />
    <path d="M9 9h6M9 13h6" />
  </Icon>
);
const ReceiptIcon = () => (
  <Icon>
    <path d="M6 3h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5V3Z" />
    <path d="M9 8h6M9 12h6" />
  </Icon>
);
const ChartIcon = () => (
  <Icon>
    <path d="M4 20V10M11 20V4M18 20v-7" />
    <path d="M2 20h20" />
  </Icon>
);
const UsersIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4M20.5 20c0-2.9-2-5.3-4.7-5.9" />
  </Icon>
);
const CardIcon = () => (
  <Icon>
    <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
    <path d="M2.5 10h19M6 15h4" />
  </Icon>
);
const ScaleIcon = () => (
  <Icon>
    <path d="M12 3v18M8 21h8" />
    <path d="M5 7h6M13 7h6" />
    <path d="M5 7 2.5 12a2.5 2.5 0 0 0 5 0L5 7ZM19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7Z" />
  </Icon>
);

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-brand-mark">UF</span>
            Urban Furniture
          </div>
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn landing-btn-ghost">Sign In</Link>
            <Link to="/signup" className="landing-btn landing-btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Accounting built for furniture businesses</span>
          <h1>Every sale, purchase, and payment. Booked correctly, automatically.</h1>
          <p>
            Urban Furniture Accounting System replaces spreadsheets and manual ledgers with real double-entry
            bookkeeping — Purchase Orders, Vendor Bills, Sales Orders, and Customer Invoices all post the correct
            accounting entry the moment they happen, with GST calculated automatically per product.
          </p>
          <div className="landing-hero-actions">
            <Link to="/signup" className="landing-btn landing-btn-primary landing-btn-lg">Create your account</Link>
            <Link to="/login" className="landing-btn landing-btn-secondary landing-btn-lg">Sign in</Link>
          </div>
          <div className="landing-hero-stats">
            <div>
              <strong>100%</strong>
              <span>double-entry balanced, always</span>
            </div>
            <div>
              <strong>3</strong>
              <span>role-based access levels</span>
            </div>
            <div>
              <strong>Auto</strong>
              <span>GST tax calculation</span>
            </div>
          </div>
        </div>
        <div className="landing-hero-media">
          <img src="https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=80" alt="Furniture workshop" />
        </div>
      </section>

      <section className="landing-logos">
        <span>Built for retailers, workshops, and showrooms</span>
        <div className="landing-logo-row">
          <span>Furniture Retail</span>
          <span>Woodworking Studios</span>
          <span>Interior Showrooms</span>
          <span>Wholesale Distributors</span>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Features</span>
          <h2>Everything a small accounting team actually needs</h2>
          <p>No bloated modules you'll never touch — just the accounting flow a furniture business runs on, done correctly.</p>
        </div>
        <div className="landing-feature-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><LedgerIcon /></div>
            <h3>Real double-entry ledger</h3>
            <p>Every transaction posts a balanced journal entry automatically — Debit and Credit, always equal, never typed by hand.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><ReceiptIcon /></div>
            <h3>Automatic GST calculation</h3>
            <p>Set a GST rate once per product. Every Sales and Purchase Order line fills its tax automatically after that.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><ChartIcon /></div>
            <h3>Live financial reports</h3>
            <p>Balance Sheet, Profit &amp; Loss, and Budget Reports generate instantly from real transaction data — never re-typed.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><UsersIcon /></div>
            <h3>Role-based access</h3>
            <p>Admins run the business, Accountants handle daily entries, and Customers/Vendors get their own private portal.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><CardIcon /></div>
            <h3>Online payments</h3>
            <p>Customers pay their own invoices online through a real Razorpay checkout — verified by signature, not by trust.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><ScaleIcon /></div>
            <h3>Built to scale</h3>
            <p>Stateless auth, a load-balanced API, and background workers for heavy jobs like ledger checks and bulk exports.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <span className="landing-eyebrow">How it works</span>
          <h2>From order to balanced books, in three steps</h2>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <h3>Create the order</h3>
            <p>Raise a Purchase Order to a vendor or a Sales Order to a customer — pick the product, quantity, and price.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <h3>Convert to Bill or Invoice</h3>
            <p>One click posts the real accounting entry and updates stock — no manual ledger work required.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <h3>Get paid, see reports live</h3>
            <p>Record a payment or let the customer pay online. Balance Sheet and P&amp;L reflect it immediately.</p>
          </div>
        </div>
        <div className="landing-showcase">
          <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80" alt="Furniture showroom" />
        </div>
      </section>

      <section id="security" className="landing-section landing-security">
        <div className="landing-security-copy">
          <span className="landing-eyebrow">Security</span>
          <h2>Every number is provable, not just claimed</h2>
          <ul className="landing-check-list">
            <li>Stateless JWT authentication — no server-side session to hijack</li>
            <li>Signed, expiring links for every downloadable document</li>
            <li>Payments verified by cryptographic webhook signature</li>
            <li>A background Ledger Integrity Check proves debits equal credits, on demand</li>
          </ul>
          <Link to="/signup" className="landing-btn landing-btn-primary">Start with a secure account</Link>
        </div>
        <div className="landing-security-media">
          <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80" alt="Financial documents and a calculator" />
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <span className="landing-brand-mark">UF</span>
            Urban Furniture
          </div>
          <p>Accounting System</p>
          <div className="landing-footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
