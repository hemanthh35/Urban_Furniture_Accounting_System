import { useEffect, useRef, useState } from "react";
import Popover from "./Popover";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string; // shown as a disabled first row when value is ""
  required?: boolean;
  title?: string;
  disabled?: boolean;
}

// Drop-in replacement for <select> with a real, CSS-styled dropdown list -
// a native <option> list can't be restyled at all, which looks out of place
// next to the rest of the app's custom-styled inputs.
export default function Select({ value, onChange, options, placeholder, required, title, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      // The popup itself lives in a portal at document.body (see Popover.tsx),
      // so it's no longer a DOM descendant of boxRef - has to be checked
      // separately, or every click inside the list would look "outside".
      if (boxRef.current && !boxRef.current.contains(target) && !target.closest?.(".uf-select-popup")) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <div className="uf-select" ref={boxRef}>
      <button
        type="button"
        className="uf-select-trigger"
        title={title}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "" : "uf-select-placeholder"}>{selected ? selected.label : placeholder ?? "Select..."}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`uf-select-chevron${open ? " open" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {/* Native select kept underneath (visually hidden) so browser form
          validation (`required`) still works exactly like a real field. */}
      <select value={value} required={required} disabled={disabled} onChange={(e) => onChange(e.target.value)} tabIndex={-1} aria-hidden="true" className="uf-select-shadow">
        <option value="" disabled={required}>{placeholder ?? ""}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <Popover anchorRef={boxRef} open={open} onClose={() => setOpen(false)} className="uf-select-popup" estimatedHeight={260}>
        {placeholder && (
          <button type="button" className={`uf-select-option${value === "" ? " selected" : ""}`} onClick={() => pick("")}>
            {placeholder}
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`uf-select-option${o.value === value ? " selected" : ""}`}
            disabled={o.disabled}
            onClick={() => pick(o.value)}
          >
            {o.label}
          </button>
        ))}
      </Popover>
    </div>
  );
}
