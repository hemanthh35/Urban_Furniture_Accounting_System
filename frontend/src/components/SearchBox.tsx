interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// A plain client-side search field - the lists it filters are already loaded
// in full for pagination (see usePagination), so filtering in the browser as
// the user types needs no new endpoint.
export default function SearchBox({ value, onChange, placeholder }: Props) {
  return (
    <div className="search-box">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search..."} />
      {value && (
        <button type="button" className="search-box-clear" onClick={() => onChange("")} aria-label="Clear search">
          &times;
        </button>
      )}
    </div>
  );
}
