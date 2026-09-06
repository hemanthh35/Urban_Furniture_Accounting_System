// The logo mark used everywhere the brand appears (sidebar, topbar, landing
// page, footer) - a simple armchair silhouette instead of plain "UF"
// initials, so it actually reads as a furniture brand at a glance.
export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
        <path d="M4.5 11h15a1 1 0 0 1 1 1v4a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 16v-4a1 1 0 0 1 1-1Z" />
        <path d="M6 17.5v2M18 17.5v2" />
      </svg>
    </span>
  );
}
