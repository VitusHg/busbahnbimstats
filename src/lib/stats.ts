import { normalizeStopName } from "./textUtils";
import { toViennaParts } from "./viennaTime";
import type { Trip, VehicleKind } from "./types";

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export interface ModeShareEntry {
  kind: VehicleKind;
  legCount: number;
  minutes: number;
}

export interface LineStat {
  lineLabel: string;
  vehicleKind: VehicleKind;
  legCount: number;
  minutes: number;
}

export interface StopStat {
  stop: string;
  departures: number;
  arrivals: number;
  total: number;
}

export interface RouteStat {
  origin: string;
  destination: string;
  count: number;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface WeekdayCount {
  weekday: number;
  count: number;
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface HeatmapCell {
  weekday: number;
  hour: number;
  count: number;
}

export interface Stats {
  rangeFrom: string | null;
  rangeTo: string | null;
  totals: {
    trips: number;
    legs: number;
    transitMinutes: number;
    transferMinutes: number;
    distinctStops: number;
    distinctLines: number;
    daysWithTrips: number;
  };
  averages: {
    tripDurationMin: number;
    legsPerTrip: number;
    transitMinutesPerActiveDay: number;
  };
  modeShare: ModeShareEntry[];
  topLines: LineStat[];
  topStops: StopStat[];
  topRoutes: RouteStat[];
  byWeekday: WeekdayCount[];
  byHour: HourCount[];
  heatmap: HeatmapCell[];
  overTime: DayCount[];
  longestTrip: Trip | null;
  shortestTrip: Trip | null;
  busiestDay: DayCount | null;
  longestStreakDays: number;
  directTripShare: number;
}

export function computeStats(trips: Trip[]): Stats {
  if (trips.length === 0) return emptyStats();

  const sorted = [...trips].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  const modeShareMap = new Map<VehicleKind, ModeShareEntry>();
  const lineMap = new Map<string, LineStat>();
  const stopMap = new Map<string, StopStat>();
  const routeMap = new Map<string, RouteStat>();
  const weekdayMap = new Map<number, number>();
  const hourMap = new Map<number, number>();
  const heatmapMap = new Map<string, HeatmapCell>();
  const dayMap = new Map<string, number>();

  let transitMinutes = 0;
  let transferMinutes = 0;
  let longestTrip = sorted[0];
  let shortestTrip = sorted[0];

  for (const trip of sorted) {
    transitMinutes += trip.transitDurationMin;
    transferMinutes += Math.max(0, trip.transferWaitMin);

    if (trip.totalDurationMin > longestTrip.totalDurationMin) longestTrip = trip;
    if (trip.totalDurationMin < shortestTrip.totalDurationMin) shortestTrip = trip;

    const { dayKey, hour, weekday } = toViennaParts(trip.startTime);
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
    weekdayMap.set(weekday, (weekdayMap.get(weekday) ?? 0) + 1);
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    const heatKey = `${weekday}-${hour}`;
    const heatCell = heatmapMap.get(heatKey) ?? { weekday, hour, count: 0 };
    heatCell.count += 1;
    heatmapMap.set(heatKey, heatCell);

    const origin = normalizeStopName(trip.originStop);
    const destination = normalizeStopName(trip.destinationStop);
    const routeKey = `${origin} -> ${destination}`;
    const route = routeMap.get(routeKey) ?? { origin, destination, count: 0 };
    route.count += 1;
    routeMap.set(routeKey, route);

    for (const leg of trip.legs) {
      const mode = modeShareMap.get(leg.vehicleKind) ?? {
        kind: leg.vehicleKind,
        legCount: 0,
        minutes: 0,
      };
      mode.legCount += 1;
      mode.minutes += leg.durationMin;
      modeShareMap.set(leg.vehicleKind, mode);

      const line = lineMap.get(leg.lineLabel) ?? {
        lineLabel: leg.lineLabel,
        vehicleKind: leg.vehicleKind,
        legCount: 0,
        minutes: 0,
      };
      line.legCount += 1;
      line.minutes += leg.durationMin;
      lineMap.set(leg.lineLabel, line);

      const depKey = normalizeStopName(leg.departureStop);
      const dep = stopMap.get(depKey) ?? {
        stop: depKey,
        departures: 0,
        arrivals: 0,
        total: 0,
      };
      dep.departures += 1;
      dep.total += 1;
      stopMap.set(depKey, dep);

      const arrKey = normalizeStopName(leg.arrivalStop);
      const arr = stopMap.get(arrKey) ?? {
        stop: arrKey,
        departures: 0,
        arrivals: 0,
        total: 0,
      };
      arr.arrivals += 1;
      arr.total += 1;
      stopMap.set(arrKey, arr);
    }
  }

  const daysWithTrips = dayMap.size;
  const totalLegs = sorted.reduce((sum, trip) => sum + trip.legCount, 0);
  const directTrips = sorted.filter((trip) => trip.legCount === 1).length;

  let busiestDay: DayCount | null = null;
  for (const [date, count] of dayMap) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { date, count };
  }

  return {
    rangeFrom: sorted[0].startTime.toISOString(),
    rangeTo: sorted[sorted.length - 1].endTime.toISOString(),
    totals: {
      trips: sorted.length,
      legs: totalLegs,
      transitMinutes: Math.round(transitMinutes),
      transferMinutes: Math.round(transferMinutes),
      distinctStops: stopMap.size,
      distinctLines: lineMap.size,
      daysWithTrips,
    },
    averages: {
      tripDurationMin: Math.round((transitMinutes + transferMinutes) / sorted.length),
      legsPerTrip: Number((totalLegs / sorted.length).toFixed(2)),
      transitMinutesPerActiveDay:
        daysWithTrips === 0 ? 0 : Math.round(transitMinutes / daysWithTrips),
    },
    modeShare: [...modeShareMap.values()].sort((a, b) => b.legCount - a.legCount),
    topLines: [...lineMap.values()]
      .sort((a, b) => b.legCount - a.legCount)
      .slice(0, 15),
    topStops: [...stopMap.values()].sort((a, b) => b.total - a.total).slice(0, 15),
    topRoutes: [...routeMap.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    byWeekday: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      count: weekdayMap.get(weekday) ?? 0,
    })),
    byHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap.get(hour) ?? 0,
    })),
    heatmap: [...heatmapMap.values()],
    overTime: fillDailyGaps(dayMap),
    longestTrip,
    shortestTrip,
    busiestDay,
    longestStreakDays: longestStreak([...dayMap.keys()]),
    directTripShare: Number((directTrips / sorted.length).toFixed(3)),
  };
}

/**
 * Expands a sparse date->count map into one entry per calendar day between
 * the first and last day seen, filling gaps with 0. Without this, a
 * day-by-day trend chart would draw a straight (or smoothed) line directly
 * between the nearest two active days, visually hiding a run of inactive
 * days as if it were gradual change instead of a real gap.
 */
function fillDailyGaps(dayMap: Map<string, number>): DayCount[] {
  const keys = [...dayMap.keys()].sort();
  if (keys.length === 0) return [];

  const result: DayCount[] = [];
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime();
  let cursor = new Date(`${keys[0]}T00:00:00Z`);
  while (cursor.getTime() <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, count: dayMap.get(key) ?? 0 });
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return result;
}

function longestStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const sortedDays = [...dayKeys].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(`${sortedDays[i - 1]}T00:00:00Z`);
    const curr = new Date(`${sortedDays[i]}T00:00:00Z`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function emptyStats(): Stats {
  return {
    rangeFrom: null,
    rangeTo: null,
    totals: {
      trips: 0,
      legs: 0,
      transitMinutes: 0,
      transferMinutes: 0,
      distinctStops: 0,
      distinctLines: 0,
      daysWithTrips: 0,
    },
    averages: { tripDurationMin: 0, legsPerTrip: 0, transitMinutesPerActiveDay: 0 },
    modeShare: [],
    topLines: [],
    topStops: [],
    topRoutes: [],
    byWeekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0 })),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    heatmap: [],
    overTime: [],
    longestTrip: null,
    shortestTrip: null,
    busiestDay: null,
    longestStreakDays: 0,
    directTripShare: 0,
  };
}
