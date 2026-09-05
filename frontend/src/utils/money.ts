// Money is stored as integer cents/paise everywhere in the backend (avoids float
// rounding bugs) - this is the one place that turns it back into a readable ₹ amount.
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "INR" });
}
