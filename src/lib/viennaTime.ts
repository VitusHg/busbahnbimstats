const VIENNA_TZ = "Europe/Vienna";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VIENNA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export interface ViennaParts {
  /** Calendar day in Europe/Vienna local time, as YYYY-MM-DD. */
  dayKey: string;
  /** Local hour of day, 0-23. */
  hour: number;
  /** Local weekday, 0=Monday..6=Sunday. */
  weekday: number;
}

/**
 * Reads the Europe/Vienna calendar day/hour/weekday for an absolute instant.
 * Using Intl instead of the Date object's own getters is what makes this
 * correct regardless of the server process's own timezone (e.g. a host
 * running in UTC would otherwise bucket late-evening Vienna trips into the
 * wrong day or hour).
 */
export function toViennaParts(date: Date): ViennaParts {
  const parts = partsFormatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  // Some ICU builds render midnight as "24" under hour12:false.
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  return {
    dayKey: `${map.year}-${map.month}-${map.day}`,
    hour,
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}
