// Money is stored as integer cents/paise everywhere in the backend (avoids float
// rounding bugs) - this is the one place that turns it back into a readable ₹ amount.
export function formatMoney(cents: number | null | undefined): string {
  const safeCents = Number.isFinite(Number(cents)) ? Number(cents) : 0;
  return (safeCents / 100).toLocaleString(undefined, { style: "currency", currency: "INR" });
}
