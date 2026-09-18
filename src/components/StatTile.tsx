export function StatTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Highlights the value in the brand color, e.g. for a positive/eco stat. */
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="text-2xl font-semibold mt-1"
        style={{ color: accent ? "var(--brand-text)" : "var(--text-primary)" }}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
