import { describe, expect, it } from "vitest";
import { buildMapData } from "./mapData";
import { haversineKm } from "./distance";
import type { LegDTO, TripDTO } from "./dto";

let legCounter = 0;

function makeLeg(departureStop: string, arrivalStop: string): LegDTO {
  legCounter += 1;
  return {
    id: `leg-${legCounter}`,
    departureTime: "2026-09-01T06:00:00.000Z",
    departureTimeLocal: "08:00",
    departureStop,
    arrivalTime: "2026-09-01T06:10:00.000Z",
    arrivalTimeLocal: "08:10",
    arrivalStop,
    lineLabel: "Straßenbahn 1",
    lineNumber: "1",
    vehicleKind: "tram",
    direction: "Irgendwohin",
    durationMin: 10,
  };
}

function makeTrip(legs: LegDTO[]): TripDTO {
  return {
    id: `trip-${legCounter}`,
    legs,
    originStop: legs[0].departureStop,
    destinationStop: legs[legs.length - 1].arrivalStop,
    originLabel: legs[0].departureStop,
    destinationLabel: legs[legs.length - 1].arrivalStop,
    startTime: legs[0].departureTime,
    startDateLocal: "01.09.2026",
    startTimeLocal: legs[0].departureTimeLocal,
    endTime: legs[legs.length - 1].arrivalTime,
    endTimeLocal: legs[legs.length - 1].arrivalTimeLocal,
    totalDurationMin: 10 * legs.length,
    transitDurationMin: 10 * legs.length,
    transferWaitMin: 0,
    legCount: legs.length,
    vehicleKinds: ["tram"],
    lines: ["Straßenbahn 1"],
    mergedAcrossEvents: false,
  };
}

const GRAZ_A = { lat: 47.07, lon: 15.44 };
const GRAZ_B = { lat: 47.08, lon: 15.45 };
const GRAZ_C = { lat: 47.09, lon: 15.46 };

describe("buildMapData", () => {
  it("builds one stop per unique geocoded name with a visit count", () => {
    const trips = [makeTrip([makeLeg("A", "B")]), makeTrip([makeLeg("A", "B")])];
    const { stops } = buildMapData(trips, { A: GRAZ_A, B: GRAZ_B });

    expect(stops).toHaveLength(2);
    const a = stops.find((s) => s.name === "A");
    const b = stops.find((s) => s.name === "B");
    // 2 trips x 1 leg each => A departed from twice, B arrived at twice.
    expect(a?.visits).toBe(2);
    expect(b?.visits).toBe(2);
  });

  it("omits stops that couldn't be geocoded and counts them as unresolved", () => {
    const trips = [makeTrip([makeLeg("A", "Unbekannt")])];
    const { stops, unresolvedStopCount } = buildMapData(trips, { A: GRAZ_A, Unbekannt: null });

    expect(stops.map((s) => s.name)).toEqual(["A"]);
    expect(unresolvedStopCount).toBe(1);
  });

  it("aggregates repeated stop pairs into one connection with a count", () => {
    const trips = [makeTrip([makeLeg("A", "B")]), makeTrip([makeLeg("B", "A")])];
    const { connections } = buildMapData(trips, { A: GRAZ_A, B: GRAZ_B });

    expect(connections).toHaveLength(1);
    expect(connections[0].count).toBe(2);
  });

  it("sums per-leg distance across every leg, not just trip endpoints", () => {
    // A -> B -> C should count both hops, not the direct A->C distance.
    const trip = makeTrip([makeLeg("A", "B"), makeLeg("B", "C")]);
    const { totalDistanceKm } = buildMapData([trip], { A: GRAZ_A, B: GRAZ_B, C: GRAZ_C });

    const expected = haversineKm(GRAZ_A, GRAZ_B) + haversineKm(GRAZ_B, GRAZ_C);
    expect(totalDistanceKm).toBeCloseTo(expected, 6);
  });

  it("skips a leg's distance contribution when either endpoint is unresolved", () => {
    const trip = makeTrip([makeLeg("A", "Unbekannt")]);
    const { totalDistanceKm } = buildMapData([trip], { A: GRAZ_A, Unbekannt: null });
    expect(totalDistanceKm).toBe(0);
  });
});
