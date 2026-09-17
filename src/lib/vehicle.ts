import type { VehicleKind } from "./types";

/**
 * Splits a raw "mit <label>" line (e.g. "Straßenbahn 7", "Stadtbus 31", "E1")
 * into a vehicle kind and a display line number.
 */
export function classifyVehicle(label: string): {
  kind: VehicleKind;
  lineNumber: string;
} {
  const trimmed = label.trim();

  const prefixed = trimmed.match(
    /^(Straßenbahn|Stadtbus|RegioBus|Regionalbus|Expressbus|Regiobus|S-?Bahn|Zug|Bus)\s+(.+)$/i,
  );
  if (prefixed) {
    const prefix = prefixed[1].toLowerCase();
    const lineNumber = prefixed[2].trim();
    if (prefix === "straßenbahn") return { kind: "tram", lineNumber };
    if (prefix === "stadtbus") return { kind: "citybus", lineNumber };
    if (prefix === "regiobus" || prefix === "regionalbus")
      return { kind: "regiobus", lineNumber };
    if (prefix === "expressbus") return { kind: "expressbus", lineNumber };
    if (prefix === "bus") return { kind: "citybus", lineNumber };
    return { kind: "train", lineNumber };
  }

  // Austrian train category prefixes (IC, ICE, EC, RJ, RJX, REX, R, D, EN, NJ ...)
  if (/^(ICE?|EC|RJX?|REX|EN|NJ|D)\s?\d*/i.test(trimmed)) {
    return { kind: "train", lineNumber: trimmed };
  }

  // Graz "Einkaufslinien" trams are labelled just "E1", "E2", ... with no prefix.
  if (/^E\d+$/i.test(trimmed)) {
    return { kind: "tram", lineNumber: trimmed };
  }

  return { kind: "other", lineNumber: trimmed };
}

export const VEHICLE_LABELS: Record<VehicleKind, string> = {
  tram: "Straßenbahn",
  citybus: "Stadtbus",
  regiobus: "RegioBus",
  expressbus: "Expressbus",
  train: "Zug",
  other: "Sonstige",
};

export const VEHICLE_COLORS: Record<VehicleKind, string> = {
  tram: "#e11d48", // rose
  citybus: "#2563eb", // blue
  regiobus: "#059669", // emerald
  expressbus: "#d97706", // amber
  train: "#7c3aed", // violet
  other: "#64748b", // slate
};
