import { parseEventLegs } from "./legParser";
import { normalizeStopName } from "./textUtils";
import type { Leg, ParseDiagnostics, RawEvent, Trip, TripBuildResult } from "./types";

/**
 * Maximum gap between one leg's arrival and the next leg's departure for two
 * *separate* calendar events to be treated as one continuous real-world
 * trip (as opposed to two unrelated rides that happen to share a stop).
 * Legs inside a single VEVENT are always kept together regardless of this
 * value, since Busbahnbim already grouped them into one search result.
 */
const LINK_MAX_GAP_MIN = 20;

function parseSummary(
  summary: string,
  fallbackOrigin: string,
  fallbackDestination: string,
): { originLabel: string; destinationLabel: string } {
  const match = summary.match(/^Fahrt nach (.+?) \|\| Startort: (.+)$/);
  if (match) {
    return { destinationLabel: match[1].trim(), originLabel: match[2].trim() };
  }
  return { originLabel: fallbackOrigin, destinationLabel: fallbackDestination };
}

interface TripGroup {
  legs: Leg[];
  sourceEventUids: string[];
  mergedAcrossEvents: boolean;
  originLabel: string;
  destinationLabel: string;
  /** Normalized stops already visited in this trip-in-progress, incl. the origin. */
  visitedStops: Set<string>;
}

function startGroup(
  legs: Leg[],
  event: RawEvent,
  originLabel: string,
  destinationLabel: string,
): TripGroup {
  return {
    legs: [...legs],
    sourceEventUids: [event.uid],
    mergedAcrossEvents: false,
    originLabel,
    destinationLabel,
    visitedStops: new Set([
      normalizeStopName(legs[0].departureStop),
      ...legs.map((leg) => normalizeStopName(leg.arrivalStop)),
    ]),
  };
}

function finalizeTrip(group: TripGroup): Trip {
  const { legs } = group;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const transitDurationMin = legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  const totalDurationMin = Math.round(
    (last.arrivalTime.getTime() - first.departureTime.getTime()) / 60_000,
  );

  return {
    id: group.sourceEventUids[0],
    legs,
    originStop: first.departureStop,
    destinationStop: last.arrivalStop,
    originLabel: group.originLabel,
    destinationLabel: group.destinationLabel,
    startTime: first.departureTime,
    endTime: last.arrivalTime,
    transitDurationMin,
    totalDurationMin,
    transferWaitMin: totalDurationMin - transitDurationMin,
    legCount: legs.length,
    vehicleKinds: [...new Set(legs.map((leg) => leg.vehicleKind))],
    lines: [...new Set(legs.map((leg) => leg.lineLabel))],
    sourceEventUids: group.sourceEventUids,
    mergedAcrossEvents: group.mergedAcrossEvents,
  };
}

/**
 * Parses every VEVENT's DESCRIPTION into legs, then chains legs into Trips:
 * all legs from one VEVENT always belong together, and consecutive VEVENTs
 * are merged into the same Trip when the next one departs from (approximately)
 * where the previous one arrived, soon enough after it, matching the pattern
 * of a rider searching one leg of a journey at a time.
 */
export function buildTrips(rawEvents: RawEvent[]): TripBuildResult {
  let totalWalkMinutes = 0;
  let totalWalkSegments = 0;
  let recognizedEvents = 0;

  const trips: Trip[] = [];
  let current: TripGroup | null = null;

  for (const event of rawEvents) {
    const { legs, walkMinutes, walkSegments } = parseEventLegs(event);
    totalWalkMinutes += walkMinutes;
    totalWalkSegments += walkSegments;
    if (legs.length === 0) continue;
    recognizedEvents += 1;

    const { originLabel, destinationLabel } = parseSummary(
      event.summary,
      legs[0].departureStop,
      legs[legs.length - 1].arrivalStop,
    );

    if (current) {
      const group = current;
      const lastLeg = group.legs[group.legs.length - 1];
      const firstLeg = legs[0];
      const gapMin =
        (firstLeg.departureTime.getTime() - lastLeg.arrivalTime.getTime()) / 60_000;
      const stopsMatch =
        normalizeStopName(lastLeg.arrivalStop) ===
        normalizeStopName(firstLeg.departureStop);
      // Reject a merge that would double back to a stop the trip already
      // passed through - that's "went out, ran an errand, came back", i.e.
      // two separate trips, not one continuous ride with a transfer.
      const revisitsStop = legs.some((leg) =>
        group.visitedStops.has(normalizeStopName(leg.arrivalStop)),
      );

      if (gapMin >= 0 && gapMin <= LINK_MAX_GAP_MIN && stopsMatch && !revisitsStop) {
        group.legs.push(...legs);
        group.sourceEventUids.push(event.uid);
        group.mergedAcrossEvents = true;
        group.destinationLabel = destinationLabel;
        for (const leg of legs) group.visitedStops.add(normalizeStopName(leg.arrivalStop));
        continue;
      }
      trips.push(finalizeTrip(group));
    }

    current = startGroup(legs, event, originLabel, destinationLabel);
  }
  if (current) trips.push(finalizeTrip(current));

  const diagnostics: ParseDiagnostics = {
    totalEvents: rawEvents.length,
    recognizedEvents,
    unrecognizedEvents: rawEvents.length - recognizedEvents,
    totalLegs: trips.reduce((sum, trip) => sum + trip.legCount, 0),
    totalTrips: trips.length,
    tripsMergedAcrossEvents: trips.filter((trip) => trip.mergedAcrossEvents).length,
    totalWalkMinutes,
    totalWalkSegments,
  };

  return { trips, diagnostics };
}
