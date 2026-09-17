import type { HeatmapCell } from "@/lib/stats";
import { WEEKDAY_LABELS_DE, WEEKDAY_LABELS_FULL_DE, sequentialStep } from "@/lib/chartTheme";

const SHOWN_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export function WeekdayHourHeatmap({ data }: { data: HeatmapCell[] }) {
  const max = data.reduce((m, cell) => Math.max(m, cell.count), 0);
  const lookup = new Map<string, number>();
  for (const cell of data) lookup.set(`${cell.weekday}-${cell.hour}`, cell.count);

  if (max === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Daten.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="w-8" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th
                key={hour}
                className="text-[10px] font-normal align-bottom pb-1"
                style={{ color: "var(--text-muted)", minWidth: 14 }}
              >
                {SHOWN_HOURS.includes(hour) ? hour : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAY_LABELS_DE.map((label, weekday) => (
            <tr key={weekday}>
              <th
                scope="row"
                className="text-xs font-normal text-right pr-2"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </th>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = lookup.get(`${weekday}-${hour}`) ?? 0;
                const bg = count === 0 ? "var(--surface-2)" : sequentialStep(count / max);
                return (
                  <td key={hour} className="p-0">
                    <div className="group relative">
                      <div
                        className="rounded-[3px]"
                        style={{ width: 14, height: 14, background: bg }}
                      />
                      {count > 0 ? (
                        <div
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 bottom-full z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold shadow-lg group-hover:block group-focus-within:block"
                          style={{
                            background: "var(--surface-1)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {WEEKDAY_LABELS_FULL_DE[weekday]}, {String(hour).padStart(2, "0")}:00 Uhr
                          <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                            {" "}
                            · {count} {count === 1 ? "Fahrt" : "Fahrten"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
