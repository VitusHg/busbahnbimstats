// Core domain types shared across the parsing pipeline and the stats/UI layer.

export type VehicleKind =
  | "tram"
  | "citybus"
  | "regiobus"
  | "expressbus"
  | "train"
  | "other";

/** A single VEVENT read out of an ICS feed, before any Busbahnbim-specific parsing. */
export interface RawEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}

/** One real vehicle ride extracted from a VEVENT's DESCRIPTION (walks/transfers excluded). */
export interface Leg {
  id: string;
  sourceEventUid: string;
  departureTime: Date;
  departureStop: string;
  arrivalTime: Date;
  arrivalStop: string;
  lineLabel: string;
  lineNumber: string;
  vehicleKind: VehicleKind;
  direction: string;
  durationMin: number;
}

/** One or more Legs chained together into a real-world journey. */
export interface Trip {
  id: string;
  legs: Leg[];
  originStop: string;
  destinationStop: string;
  originLabel: string;
  destinationLabel: string;
  startTime: Date;
  endTime: Date;
  transitDurationMin: number;
  totalDurationMin: number;
  transferWaitMin: number;
  legCount: number;
  vehicleKinds: VehicleKind[];
  lines: string[];
  sourceEventUids: string[];
  mergedAcrossEvents: boolean;
}

export interface ParseDiagnostics {
  totalEvents: number;
  recognizedEvents: number;
  unrecognizedEvents: number;
  totalLegs: number;
  totalTrips: number;
  tripsMergedAcrossEvents: number;
  totalWalkMinutes: number;
  totalWalkSegments: number;
}

export interface TripBuildResult {
  trips: Trip[];
  diagnostics: ParseDiagnostics;
}
