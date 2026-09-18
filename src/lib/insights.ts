import type { TripDTO } from "./dto";
import type { DayCount } from "./stats";
import { toViennaParts } from "./viennaTime";

/**
 * Median morning departure time across weekdays (Mon-Fri), using each
 * weekday's earliest trip as "when the day started". Returns null if there
 * are no weekday trips to go on.
 */
export function typicalWeekdayDeparture(trips: TripDTO[]): string | null {
  const earliestMinutesByDay = new Map<string, number>();

  for (const trip of trips) {
    const { dayKey, weekday } = toViennaParts(new Date(trip.startTime));
    if (weekday > 4) continue; // Monday=0 .. Friday=4

    const [h, m] = trip.startTimeLocal.split(":").map(Number);
    const minutes = h * 60 + m;
    const existing = earliestMinutesByDay.get(dayKey);
    if (existing === undefined || minutes < existing) {
      earliestMinutesByDay.set(dayKey, minutes);
    }
  }

  const minutesList = [...earliestMinutesByDay.values()].sort((a, b) => a - b);
  if (minutesList.length === 0) return null;

  const mid = Math.floor(minutesList.length / 2);
  const medianMinutes =
    minutesList.length % 2 === 0
      ? Math.round((minutesList[mid - 1] + minutesList[mid]) / 2)
      : minutesList[mid];

  const h = Math.floor(medianMinutes / 60);
  const m = medianMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type TrendGranularity = "day" | "week" | "month";

const MONTH_LABELS_DE = [
  "Jän",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

function mondayOf(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const isoDow = (d.getUTCDay() + 6) % 7; // Monday=0..Sunday=6
  d.setUTCDate(d.getUTCDate() - isoDow);
  return d.toISOString().slice(0, 10);
}

/**
 * Re-buckets a daily (gap-filled) trip-count series into weekly or monthly
 * totals for the trend chart's granularity toggle. "day" is a passthrough.
 */
export function aggregateTrend(data: DayCount[], granularity: TrendGranularity): DayCount[] {
  if (granularity === "day") return data;

  const buckets = new Map<string, number>();
  for (const { date, count } of data) {
    const key = granularity === "week" ? mondayOf(date) : date.slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 0) + count);
  }
  return [...buckets.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatTrendLabel(dateKey: string, granularity: TrendGranularity): string {
  if (granularity === "month") {
    const [year, month] = dateKey.split("-");
    return `${MONTH_LABELS_DE[Number(month) - 1]} ${year.slice(2)}`;
  }
  const [, month, day] = dateKey.split("-");
  return `${day}.${month}.`;
}
