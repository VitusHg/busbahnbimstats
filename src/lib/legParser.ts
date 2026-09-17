import { classifyVehicle } from "./vehicle";
import type { Leg, RawEvent } from "./types";

type Segment =
  | {
      kind: "leg";
      depTime: string;
      depStop: string;
      label: string;
      direction: string;
      arrTime: string;
      arrStop: string;
    }
  | { kind: "walk"; time: string; place: string; durationMin: number }
  | { kind: "transfer"; time: string; place: string; durationMin: number };

// One alternation over all three segment shapes so matches come out in the
// order they appear in the text. Only horizontal whitespace (spaces/tabs) is
// treated as flexible padding; every "\n" is a real line break so a run of
// "\s*" can never accidentally swallow a following line.
const SEGMENT_RE = new RegExp(
  [
    String.raw`(?<legDepTime>\d{1,2}:\d{2})[ \t]*-[ \t]*Abfahrt[ \t]+(?<legDepStop>[^\n]+)\n` +
      String.raw`[ \t]*mit[ \t]+(?<legLabel>[^\n]+?)[ \t]+Richtung[ \t]+(?<legDirection>[^\n]+)\n` +
      String.raw`[ \t]*(?<legArrTime>\d{1,2}:\d{2})[ \t]*-[ \t]*Ankunft[ \t]+(?<legArrStop>[^\n]+)`,
    String.raw`(?<walkTime>\d{1,2}:\d{2})[ \t]*-[ \t]*Fußweg[ \t]+nach[ \t]+(?<walkPlace>.+?),[ \t]*Dauer[ \t]+(?<walkDur>\d+)[ \t]*Min\.`,
    String.raw`(?<transferTime>\d{1,2}:\d{2})[ \t]*-[ \t]*Übergang[ \t]+nach[ \t]+(?<transferPlace>.+?),[ \t]*Dauer[ \t]+(?<transferDur>\d+)[ \t]*Min\.`,
  ].join("|"),
  "g",
);

function extractSegments(description: string): Segment[] {
  const segments: Segment[] = [];
  for (const match of description.matchAll(SEGMENT_RE)) {
    const groups = match.groups!;
    if (groups.legDepTime !== undefined) {
      segments.push({
        kind: "leg",
        depTime: groups.legDepTime,
        depStop: groups.legDepStop.trim(),
        label: groups.legLabel.trim(),
        direction: groups.legDirection.trim(),
        arrTime: groups.legArrTime,
        arrStop: groups.legArrStop.trim(),
      });
    } else if (groups.walkTime !== undefined) {
      segments.push({
        kind: "walk",
        time: groups.walkTime,
        place: groups.walkPlace.trim(),
        durationMin: Number(groups.walkDur),
      });
    } else if (groups.transferTime !== undefined) {
      segments.push({
        kind: "transfer",
        time: groups.transferTime,
        place: groups.transferPlace.trim(),
        durationMin: Number(groups.transferDur),
      });
    }
  }
  return segments;
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Resolves a sequence of "HH:MM" times (in appearance order) to absolute
 * Dates, given that the first time in the sequence is known to fall on
 * `anchor`. A later time that is numerically smaller than the one before it
 * is assumed to have rolled over into the next calendar day - this lets a
 * journey safely cross midnight without needing any timezone-conversion
 * library: we only ever add real elapsed minutes to a known-correct instant.
 */
function resolveTimes(anchor: Date, times: string[]): Date[] {
  if (times.length === 0) return [];
  const anchorMinutes = minutesOfDay(times[0]);
  let dayOffset = 0;
  let prevMinutes = anchorMinutes;
  const result: Date[] = [];
  for (const t of times) {
    const m = minutesOfDay(t);
    if (m < prevMinutes) dayOffset += 1;
    const deltaMinutes = dayOffset * 1440 + m - anchorMinutes;
    result.push(new Date(anchor.getTime() + deltaMinutes * 60_000));
    prevMinutes = m;
  }
  return result;
}

export interface ParsedEvent {
  legs: Leg[];
  walkMinutes: number;
  walkSegments: number;
}

/** Parses one VEVENT's DESCRIPTION into real transit legs, ignoring walks and transfers. */
export function parseEventLegs(event: RawEvent): ParsedEvent {
  const segments = extractSegments(event.description);
  if (segments.length === 0) {
    return { legs: [], walkMinutes: 0, walkSegments: 0 };
  }

  // Flatten every timestamp in appearance order so day-rollover is tracked
  // across the whole description, not just within leg segments.
  const allTimes: string[] = [];
  for (const seg of segments) {
    if (seg.kind === "leg") {
      allTimes.push(seg.depTime, seg.arrTime);
    } else {
      allTimes.push(seg.time);
    }
  }
  const resolved = resolveTimes(event.start, allTimes);

  const legs: Leg[] = [];
  let walkMinutes = 0;
  let walkSegments = 0;
  let cursor = 0;
  let legIndex = 0;

  for (const seg of segments) {
    if (seg.kind === "leg") {
      const departureTime = resolved[cursor++];
      const arrivalTime = resolved[cursor++];
      const { kind, lineNumber } = classifyVehicle(seg.label);
      legs.push({
        id: `${event.uid}#${legIndex++}`,
        sourceEventUid: event.uid,
        departureTime,
        departureStop: seg.depStop,
        arrivalTime,
        arrivalStop: seg.arrStop,
        lineLabel: seg.label,
        lineNumber,
        vehicleKind: kind,
        direction: seg.direction,
        durationMin: Math.round(
          (arrivalTime.getTime() - departureTime.getTime()) / 60_000,
        ),
      });
    } else {
      cursor += 1;
      if (seg.kind === "walk") {
        walkMinutes += seg.durationMin;
        walkSegments += 1;
      }
    }
  }

  return { legs, walkMinutes, walkSegments };
}
