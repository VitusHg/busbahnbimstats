import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";
import { toViennaParts } from "./viennaTime";
import type { Leg, Trip } from "./types";

let legCounter = 0;

function makeLeg(overrides: Partial<Leg> & { departureTime: Date; arrivalTime: Date }): Leg {
  legCounter += 1;
  return {
    id: `leg-${legCounter}`,
    sourceEventUid: `evt-${legCounter}`,
    departureStop: "Graz Start",
    arrivalStop: "Graz Ziel",
    lineLabel: "Straßenbahn 1",
    lineNumber: "1",
    vehicleKind: "tram",
    direction: "Irgendwohin",
    durationMin: Math.round(
      (overrides.arrivalTime.getTime() - overrides.departureTime.getTime()) / 60_000,
    ),
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> & { legs: Leg[] }): Trip {
  const { legs, ...rest } = overrides;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const transitDurationMin = legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  const totalDurationMin = Math.round(
    (last.arrivalTime.getTime() - first.departureTime.getTime()) / 60_000,
  );
  return {
    id: first.sourceEventUid,
    legs,
    originStop: first.departureStop,
    destinationStop: last.arrivalStop,
    originLabel: first.departureStop,
    destinationLabel: last.arrivalStop,
    startTime: first.departureTime,
    endTime: last.arrivalTime,
    transitDurationMin,
    totalDurationMin,
    transferWaitMin: totalDurationMin - transitDurationMin,
    legCount: legs.length,
    vehicleKinds: [...new Set(legs.map((l) => l.vehicleKind))],
    lines: [...new Set(legs.map((l) => l.lineLabel))],
    sourceEventUids: [first.sourceEventUid],
    mergedAcrossEvents: false,
    ...rest,
  };
}

describe("computeStats", () => {
  it("returns an empty-but-well-formed result for no trips", () => {
    const stats = computeStats([]);
    expect(stats.totals.trips).toBe(0);
    expect(stats.longestTrip).toBeNull();
    expect(stats.byWeekday).toHaveLength(7);
    expect(stats.byHour).toHaveLength(24);
  });

  it("buckets a trip into the correct Vienna weekday/hour regardless of server-local time", () => {
    // 2026-09-15T06:00:00Z is Tuesday 08:00 in Europe/Vienna (CEST, UTC+2).
    const dep = new Date("2026-09-15T06:00:00Z");
    const arr = new Date("2026-09-15T06:10:00Z");
    const trip = makeTrip({ legs: [makeLeg({ departureTime: dep, arrivalTime: arr })] });

    const stats = computeStats([trip]);
    const expected = toViennaParts(dep);

    expect(stats.byWeekday.find((w) => w.count > 0)?.weekday).toBe(expected.weekday);
    expect(stats.byWeekday.find((w) => w.count > 0)?.weekday).toBe(1); // Tuesday
    expect(stats.byHour.find((h) => h.count > 0)?.hour).toBe(8);
  });

  it("aggregates mode share, top stops and top lines across trips", () => {
    const tripA = makeTrip({
      legs: [
        makeLeg({
          departureTime: new Date("2026-09-01T06:00:00Z"),
          arrivalTime: new Date("2026-09-01T06:10:00Z"),
          departureStop: "Graz Jakominiplatz, A",
          arrivalStop: "Graz Reiterkaserne",
          lineLabel: "Straßenbahn 7",
          vehicleKind: "tram",
        }),
      ],
    });
    const tripB = makeTrip({
      legs: [
        makeLeg({
          departureTime: new Date("2026-09-02T06:00:00Z"),
          arrivalTime: new Date("2026-09-02T06:20:00Z"),
          departureStop: "Graz Jakominiplatz, F",
          arrivalStop: "Graz Ankerstraße",
          lineLabel: "Stadtbus 31",
          vehicleKind: "citybus",
        }),
      ],
    });

    const stats = computeStats([tripA, tripB]);

    expect(stats.totals.trips).toBe(2);
    expect(stats.totals.legs).toBe(2);
    // Platform-letter variants of "Graz Jakominiplatz" must be merged.
    const jakominiplatz = stats.topStops.find((s) => s.stop === "Graz Jakominiplatz");
    expect(jakominiplatz?.departures).toBe(2);

    const modeKinds = stats.modeShare.map((m) => m.kind).sort();
    expect(modeKinds).toEqual(["citybus", "tram"]);

    const lineLabels = stats.topLines.map((l) => l.lineLabel).sort();
    expect(lineLabels).toEqual(["Stadtbus 31", "Straßenbahn 7"]);
  });

  it("finds the longest streak of consecutive days with a trip", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-05"];
    const trips = days.map((day) =>
      makeTrip({
        legs: [
          makeLeg({
            departureTime: new Date(`${day}T06:00:00Z`),
            arrivalTime: new Date(`${day}T06:10:00Z`),
          }),
        ],
      }),
    );

    const stats = computeStats(trips);
    expect(stats.longestStreakDays).toBe(3);
  });

  it("zero-fills days without a trip in the overTime series instead of skipping them", () => {
    // Trips on 09-01 and 09-04: the three days between must still appear as
    // explicit zero-count entries so a line chart doesn't smooth a gap away.
    const days = ["2026-09-01", "2026-09-04"];
    const trips = days.map((day) =>
      makeTrip({
        legs: [
          makeLeg({
            departureTime: new Date(`${day}T06:00:00Z`),
            arrivalTime: new Date(`${day}T06:10:00Z`),
          }),
        ],
      }),
    );

    const stats = computeStats(trips);

    expect(stats.overTime.map((d) => d.date)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
    expect(stats.overTime.map((d) => d.count)).toEqual([1, 0, 0, 1]);
  });

  it("computes the direct-trip share from single-leg vs multi-leg trips", () => {
    const direct = makeTrip({
      legs: [
        makeLeg({
          departureTime: new Date("2026-09-01T06:00:00Z"),
          arrivalTime: new Date("2026-09-01T06:10:00Z"),
        }),
      ],
    });
    const withTransfer = makeTrip({
      legs: [
        makeLeg({
          departureTime: new Date("2026-09-02T06:00:00Z"),
          arrivalTime: new Date("2026-09-02T06:10:00Z"),
        }),
        makeLeg({
          departureTime: new Date("2026-09-02T06:15:00Z"),
          arrivalTime: new Date("2026-09-02T06:25:00Z"),
        }),
      ],
    });

    const stats = computeStats([direct, withTransfer]);
    expect(stats.directTripShare).toBeCloseTo(0.5);
  });
});
