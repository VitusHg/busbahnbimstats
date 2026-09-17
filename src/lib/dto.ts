import type { Leg, Trip } from "./types";
import type { Stats } from "./stats";

// Server-formatted, JSON-safe shapes for the API response. Times are always
// rendered in Europe/Vienna local time server-side (in addition to the raw
// ISO instant) so the dashboard shows correct Austrian times regardless of
// which timezone the viewer's own browser happens to be in.

const timeFormatter = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function localTime(date: Date): string {
  return timeFormatter.format(date);
}

function localDate(date: Date): string {
  return dateFormatter.format(date);
}

export interface LegDTO {
  id: string;
  departureTime: string;
  departureTimeLocal: string;
  departureStop: string;
  arrivalTime: string;
  arrivalTimeLocal: string;
  arrivalStop: string;
  lineLabel: string;
  lineNumber: string;
  vehicleKind: Leg["vehicleKind"];
  direction: string;
  durationMin: number;
}

export interface TripDTO {
  id: string;
  legs: LegDTO[];
  originStop: string;
  destinationStop: string;
  originLabel: string;
  destinationLabel: string;
  startTime: string;
  startDateLocal: string;
  startTimeLocal: string;
  endTime: string;
  endTimeLocal: string;
  totalDurationMin: number;
  transitDurationMin: number;
  transferWaitMin: number;
  legCount: number;
  vehicleKinds: Leg["vehicleKind"][];
  lines: string[];
  mergedAcrossEvents: boolean;
}

export function toLegDTO(leg: Leg): LegDTO {
  return {
    id: leg.id,
    departureTime: leg.departureTime.toISOString(),
    departureTimeLocal: localTime(leg.departureTime),
    departureStop: leg.departureStop,
    arrivalTime: leg.arrivalTime.toISOString(),
    arrivalTimeLocal: localTime(leg.arrivalTime),
    arrivalStop: leg.arrivalStop,
    lineLabel: leg.lineLabel,
    lineNumber: leg.lineNumber,
    vehicleKind: leg.vehicleKind,
    direction: leg.direction,
    durationMin: leg.durationMin,
  };
}

export function toTripDTO(trip: Trip): TripDTO {
  return {
    id: trip.id,
    legs: trip.legs.map(toLegDTO),
    originStop: trip.originStop,
    destinationStop: trip.destinationStop,
    originLabel: trip.originLabel,
    destinationLabel: trip.destinationLabel,
    startTime: trip.startTime.toISOString(),
    startDateLocal: localDate(trip.startTime),
    startTimeLocal: localTime(trip.startTime),
    endTime: trip.endTime.toISOString(),
    endTimeLocal: localTime(trip.endTime),
    totalDurationMin: trip.totalDurationMin,
    transitDurationMin: trip.transitDurationMin,
    transferWaitMin: trip.transferWaitMin,
    legCount: trip.legCount,
    vehicleKinds: trip.vehicleKinds,
    lines: trip.lines,
    mergedAcrossEvents: trip.mergedAcrossEvents,
  };
}

export type StatsDTO = Omit<Stats, "longestTrip" | "shortestTrip"> & {
  longestTrip: TripDTO | null;
  shortestTrip: TripDTO | null;
};

export function toStatsDTO(stats: Stats): StatsDTO {
  return {
    ...stats,
    longestTrip: stats.longestTrip ? toTripDTO(stats.longestTrip) : null,
    shortestTrip: stats.shortestTrip ? toTripDTO(stats.shortestTrip) : null,
  };
}
