import { describe, expect, it } from "vitest";
import { aggregateTrend, formatTrendLabel, typicalWeekdayDeparture } from "./insights";
import type { LegDTO, TripDTO } from "./dto";

let legCounter = 0;

function makeTrip(isoDate: string, startTimeLocal: string): TripDTO {
  legCounter += 1;
  const leg: LegDTO = {
    id: `leg-${legCounter}`,
    departureTime: `${isoDate}T06:00:00.000Z`,
    departureTimeLocal: startTimeLocal,
    departureStop: "A",
    arrivalTime: `${isoDate}T06:10:00.000Z`,
    arrivalTimeLocal: "08:10",
    arrivalStop: "B",
    lineLabel: "Straßenbahn 1",
    lineNumber: "1",
    vehicleKind: "tram",
    direction: "Irgendwohin",
    durationMin: 10,
  };
  return {
    id: `trip-${legCounter}`,
    legs: [leg],
    originStop: "A",
    destinationStop: "B",
    originLabel: "A",
    destinationLabel: "B",
    startTime: leg.departureTime,
    startDateLocal: isoDate,
    startTimeLocal,
    endTime: leg.arrivalTime,
    endTimeLocal: leg.arrivalTimeLocal,
    totalDurationMin: 10,
    transitDurationMin: 10,
    transferWaitMin: 0,
    legCount: 1,
    vehicleKinds: ["tram"],
    lines: ["Straßenbahn 1"],
    mergedAcrossEvents: false,
  };
}

describe("typicalWeekdayDeparture", () => {
  it("returns the median of each weekday's earliest departure", () => {
    // 2026-09-14..18 = Mon..Fri (verified), 19/20 = weekend.
    const trips = [
      makeTrip("2026-09-14", "08:00"),
      makeTrip("2026-09-15", "07:30"),
      makeTrip("2026-09-16", "08:15"),
    ];
    expect(typicalWeekdayDeparture(trips)).toBe("08:00");
  });

  it("uses only the earliest trip when a weekday has more than one", () => {
    const trips = [
      makeTrip("2026-09-14", "09:00"),
      makeTrip("2026-09-14", "08:00"),
      makeTrip("2026-09-15", "08:00"),
    ];
    expect(typicalWeekdayDeparture(trips)).toBe("08:00");
  });

  it("ignores weekend trips", () => {
    const trips = [makeTrip("2026-09-19", "10:00"), makeTrip("2026-09-20", "11:00")];
    expect(typicalWeekdayDeparture(trips)).toBeNull();
  });

  it("returns null for no trips", () => {
    expect(typicalWeekdayDeparture([])).toBeNull();
  });
});

describe("aggregateTrend", () => {
  const daily = [
    { date: "2026-09-14", count: 1 },
    { date: "2026-09-15", count: 2 },
    { date: "2026-09-21", count: 3 },
    { date: "2026-10-01", count: 4 },
  ];

  it("passes daily data through unchanged", () => {
    expect(aggregateTrend(daily, "day")).toEqual(daily);
  });

  it("buckets by ISO week (Monday-anchored), summing counts", () => {
    const weekly = aggregateTrend(daily, "week");
    // 09-14 (Mon) and 09-15 (Tue) fall in the same week (Monday 09-14).
    expect(weekly).toEqual([
      { date: "2026-09-14", count: 3 },
      { date: "2026-09-21", count: 3 },
      { date: "2026-09-28", count: 4 }, // week containing 2026-10-01
    ]);
  });

  it("buckets by calendar month, summing counts", () => {
    const monthly = aggregateTrend(daily, "month");
    expect(monthly).toEqual([
      { date: "2026-09", count: 6 },
      { date: "2026-10", count: 4 },
    ]);
  });
});

describe("formatTrendLabel", () => {
  it("formats a day key as DD.MM.", () => {
    expect(formatTrendLabel("2026-09-05", "day")).toBe("05.09.");
    expect(formatTrendLabel("2026-09-05", "week")).toBe("05.09.");
  });

  it("formats a month key with a German abbreviation and 2-digit year", () => {
    expect(formatTrendLabel("2026-09", "month")).toBe("Sep 26");
    expect(formatTrendLabel("2026-01", "month")).toBe("Jän 26");
  });
});
