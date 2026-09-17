import type { CSSProperties } from "react";
import type { VehicleKind } from "./types";

// Fixed entity -> color mapping (never cycled/re-ranked). CSS custom
// properties so light/dark both resolve from globals.css automatically.
export const VEHICLE_COLOR_VAR: Record<VehicleKind, string> = {
  tram: "var(--series-1)",
  citybus: "var(--series-2)",
  regiobus: "var(--series-3)",
  expressbus: "var(--series-4)",
  train: "var(--series-5)",
  other: "var(--series-6)",
};

export const VEHICLE_LABEL_DE: Record<VehicleKind, string> = {
  tram: "Straßenbahn",
  citybus: "Stadtbus",
  regiobus: "RegioBus",
  expressbus: "Expressbus",
  train: "Zug",
  other: "Sonstige",
};

export const WEEKDAY_LABELS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const WEEKDAY_LABELS_FULL_DE = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

// Sequential one-hue ramp (documented steps only - never an interpolated hex).
const SEQUENTIAL_STEPS = [
  "var(--seq-100)",
  "var(--seq-150)",
  "var(--seq-200)",
  "var(--seq-250)",
  "var(--seq-300)",
  "var(--seq-350)",
  "var(--seq-400)",
  "var(--seq-450)",
  "var(--seq-500)",
  "var(--seq-550)",
  "var(--seq-600)",
  "var(--seq-650)",
  "var(--seq-700)",
];

/** Maps a 0..1 magnitude ratio to the nearest documented sequential-ramp step. */
export function sequentialStep(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const index = Math.round(clamped * (SEQUENTIAL_STEPS.length - 1));
  return SEQUENTIAL_STEPS[index];
}

export const CHART_CHROME = {
  gridline: "var(--gridline)",
  baseline: "var(--baseline)",
  textMuted: "var(--text-muted)",
  textSecondary: "var(--text-secondary)",
  textPrimary: "var(--text-primary)",
  surface: "var(--surface-1)",
  border: "var(--border)",
};

export const tooltipContentStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  fontSize: 13,
  padding: "8px 12px",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "var(--text-secondary)",
  marginBottom: 4,
  fontWeight: 500,
};

export const tooltipItemStyle: CSSProperties = {
  color: "var(--text-primary)",
  fontWeight: 600,
};

export const axisTickStyle = { fill: "var(--text-muted)", fontSize: 12 };
