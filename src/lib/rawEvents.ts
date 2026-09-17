import ical from "node-ical";
import type { RawEvent } from "./types";

function textValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in (value as Record<string, unknown>)) {
    return String((value as { val: unknown }).val ?? "");
  }
  return String(value);
}

/** Parses raw ICS text into a chronologically sorted list of VEVENTs. */
export function parseRawEvents(icsText: string): RawEvent[] {
  const data = ical.sync.parseICS(icsText);
  const events: RawEvent[] = [];

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== "VEVENT") continue;
    if (!component.start || !component.end) continue;

    events.push({
      uid: String(component.uid ?? key),
      summary: textValue(component.summary),
      description: textValue(component.description),
      location: textValue(component.location),
      start: new Date(component.start),
      end: new Date(component.end),
    });
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
