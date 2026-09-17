import { sequentialStep } from "@/lib/chartTheme";

export interface RankBarItem {
  key: string;
  primary: string;
  secondary?: string;
  value: number;
  valueLabel: string;
}

export function RankBarList({ items }: { items: RankBarItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Daten.</p>;
  }

  const max = Math.max(...items.map((item) => item.value));

  return (
    <ol className="space-y-2.5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span
              className="truncate"
              style={{ color: "var(--text-primary)" }}
              title={item.secondary ? `${item.primary} ${item.secondary}` : item.primary}
            >
              {item.primary}
              {item.secondary ? (
                <span style={{ color: "var(--text-muted)" }}> {item.secondary}</span>
              ) : null}
            </span>
            <span
              className="shrink-0 font-semibold tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.valueLabel}
            </span>
          </div>
          <div
            className="mt-1 h-1.5 rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${Math.max(4, (item.value / max) * 100)}%`,
                background: sequentialStep(0.35 + 0.65 * (item.value / max)),
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
