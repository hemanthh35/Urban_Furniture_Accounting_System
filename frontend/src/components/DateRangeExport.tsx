import { useState } from "react";
import DatePicker from "./DatePicker";
import { downloadCsv } from "../utils/export";

interface Props<T> {
  items: T[];
  getDate: (item: T) => string; // "YYYY-MM-DD"
  filename: string;
  headers: string[];
  toRow: (item: T) => (string | number)[];
}

// A From/To date filter glued to an Export CSV button - filters the
// already-loaded list client-side, no new backend endpoint needed.
export default function DateRangeExport<T>({ items, getDate, filename, headers, toRow }: Props<T>) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleExport() {
    const filtered = items.filter((item) => {
      const d = getDate(item);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    downloadCsv(filename, headers, filtered.map(toRow));
  }

  return (
    <span className="date-range-export">
      <DatePicker value={from} onChange={setFrom} title="From date" placeholder="From" />
      <span className="muted">to</span>
      <DatePicker value={to} onChange={setTo} title="To date" placeholder="To" />
      <button type="button" className="secondary" onClick={handleExport}>
        Export CSV
      </button>
    </span>
  );
}
