import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // "YYYY-MM-DD", or "" for no date picked
  onChange: (value: string) => void;
  required?: boolean;
  title?: string;
  placeholder?: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${pad(d)}-${pad(m)}-${y}`;
}

// Accepts what someone would naturally type - dd-mm-yyyy or dd/mm/yyyy - and
// returns the equivalent ISO date, or null if it isn't a real, complete date.
function parseTyped(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toIso(year, month - 1, day);
}

// Drop-in replacement for <input type="date"> with a real popup calendar
// instead of the browser's native (and, on this stack, quite ugly) picker -
// and, since clicking through a calendar for a far-off date is slow, typing
// the date straight in (dd-mm-yyyy) works too.
export default function DatePicker({ value, onChange, required, title, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(formatDisplay(value));
  const today = new Date();
  const parsed = value ? value.split("-").map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : today.getMonth());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(formatDisplay(value));
    if (parsed) {
      setViewYear(parsed[0]);
      setViewMonth(parsed[1] - 1);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function pick(day: number) {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  }

  function commitTyped() {
    if (text.trim() === "") {
      if (!required) onChange("");
      else setText(formatDisplay(value));
      return;
    }
    const iso = parseTyped(text);
    if (iso) onChange(iso);
    else setText(formatDisplay(value)); // not a real date - revert instead of silently accepting it
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isTodayCell = (day: number) => viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  const isSelectedCell = (day: number) => !!parsed && viewYear === parsed[0] && viewMonth === parsed[1] - 1 && day === parsed[2];

  return (
    <div className="datepicker" ref={boxRef}>
      <div className="datepicker-trigger">
        <button type="button" className="datepicker-icon-btn" title="Open calendar" onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        <input
          type="text"
          className="datepicker-text-input"
          title={title}
          placeholder={placeholder ?? "dd-mm-yyyy"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={commitTyped}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTyped(); setOpen(false); } if (e.key === "Escape") { setText(formatDisplay(value)); setOpen(false); } }}
        />
      </div>
      {/* Native input kept underneath (visually hidden) so browser form validation
          (`required`) still works exactly like a real date field. */}
      <input type="date" value={value} required={required} onChange={(e) => onChange(e.target.value)} tabIndex={-1} aria-hidden="true" className="datepicker-shadow-input" />

      {open && (
        <div className="datepicker-popup">
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
            <span className="datepicker-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button type="button" className="datepicker-nav" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
          </div>
          <div className="datepicker-weekdays">
            {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="datepicker-grid">
            {cells.map((day, i) => day === null ? (
              <span key={`empty-${i}`} />
            ) : (
              <button
                key={day}
                type="button"
                className={`datepicker-day${isSelectedCell(day) ? " selected" : ""}${isTodayCell(day) ? " today" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(day)}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="datepicker-footer">
            <button
              type="button"
              className="link-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const t = new Date();
                onChange(toIso(t.getFullYear(), t.getMonth(), t.getDate()));
                setViewYear(t.getFullYear());
                setViewMonth(t.getMonth());
                setOpen(false);
              }}
            >
              Today
            </button>
            {!required && value && <button type="button" className="link-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
