// Synthetic ICS builder used only by unit tests. Kept deliberately free of
// any of the uploader's real personal data (home/work addresses, geo
// coordinates) - it only reuses public Graz transit stop names and
// invented ones, and generates one property per line (RFC 5545 folding is
// optional for producers) so we never need to hand-fold text ourselves.

export interface FixtureEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  /** Local Europe/Vienna wall-clock time, ICS basic format e.g. "20260902T165000". */
  start: string;
  end: string;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export function buildIcs(events: FixtureEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", "X-WR-CALNAME:Test"];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${event.start}Z`,
      `DTSTART;TZID=Europe/Vienna:${event.start}`,
      `DTEND;TZID=Europe/Vienna:${event.end}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Builds a typical Busbahnbim "Ihre Verbindung: ..." description body from raw itinerary text. */
export function connectionDescription(body: string, totalLabel = "1 Min."): string {
  return `Ihre Verbindung:\n\n${body}\n\n-----\nGesamtdauer: ${totalLabel}\n\nVerbindung in BusBahnBim ansehen: https://verkehrsauskunft.verbundlinie.at?storageRecon=test`;
}

export function legLine(
  depTime: string,
  depStop: string,
  label: string,
  direction: string,
  arrTime: string,
  arrStop: string,
): string {
  return `${depTime} - Abfahrt ${depStop}\n      mit ${label} Richtung ${direction}\n${arrTime} - Ankunft ${arrStop}`;
}

export function walkLine(time: string, place: string, durationMin: number): string {
  return `${time} - Fußweg nach ${place}, Dauer ${durationMin} Min.`;
}

export function transferLine(time: string, place: string, durationMin: number): string {
  return `${time} - Übergang nach ${place}, Dauer ${durationMin} Min.`;
}
