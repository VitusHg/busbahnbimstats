export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="text-2xl font-semibold mt-1"
        style={{ color: "var(--text-primary)" }}
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
