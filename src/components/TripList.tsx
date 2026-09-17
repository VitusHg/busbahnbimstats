"use client";

import { useState } from "react";
import type { TripDTO } from "@/lib/dto";
import { VEHICLE_COLOR_VAR, VEHICLE_LABEL_DE } from "@/lib/chartTheme";
import { formatDurationMin } from "@/lib/textUtils";

const PAGE_SIZE = 25;

export function TripList({ trips }: { trips: TripDTO[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (trips.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Fahrten gefunden.</p>;
  }

  const shown = trips.slice(0, visible);

  return (
    <div>
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {shown.map((trip) => {
          const isOpen = expanded.has(trip.id);
          return (
            <li key={trip.id} className="py-2.5">
              <button
                type="button"
                onClick={() => toggle(trip.id)}
                aria-expanded={isOpen}
                className="w-full text-left flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer"
              >
                <span
                  className="text-xs tabular-nums w-24 shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {trip.startDateLocal}
                </span>
                <span className="text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {trip.startTimeLocal}–{trip.endTimeLocal}
                </span>
                <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {trip.originLabel} <span style={{ color: "var(--text-muted)" }}>→</span> {trip.destinationLabel}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  {trip.vehicleKinds.map((kind) => (
                    <span
                      key={kind}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: VEHICLE_COLOR_VAR[kind] }}
                      title={VEHICLE_LABEL_DE[kind]}
                    />
                  ))}
                </span>
                <span
                  className="text-xs tabular-nums shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatDurationMin(trip.totalDurationMin)}
                  {trip.legCount > 1 ? ` · ${trip.legCount} Etappen` : ""}
                </span>
                <span
                  className="text-xs shrink-0 transition-transform"
                  style={{
                    color: "var(--text-muted)",
                    transform: isOpen ? "rotate(90deg)" : "none",
                  }}
                  aria-hidden
                >
                  ▸
                </span>
              </button>

              {isOpen ? (
                <ol className="mt-2 ml-2 space-y-1.5 border-l pl-4" style={{ borderColor: "var(--border)" }}>
                  {trip.legs.map((leg) => (
                    <li key={leg.id} className="text-xs flex flex-wrap items-baseline gap-x-2">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: VEHICLE_COLOR_VAR[leg.vehicleKind] }}
                      />
                      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {leg.departureTimeLocal}
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>{leg.departureStop}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        mit {leg.lineLabel} Richtung {leg.direction}
                      </span>
                      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        → {leg.arrivalTimeLocal}
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>{leg.arrivalStop}</span>
                    </li>
                  ))}
                  {trip.transferWaitMin > 0 ? (
                    <li className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Umstiegszeit gesamt: {formatDurationMin(trip.transferWaitMin)}
                    </li>
                  ) : null}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ul>

      {visible < trips.length ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-3 text-sm font-medium rounded-lg px-3 py-1.5 border cursor-pointer"
          style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
        >
          Weitere {Math.min(PAGE_SIZE, trips.length - visible)} von {trips.length} anzeigen
        </button>
      ) : null}
    </div>
  );
}
