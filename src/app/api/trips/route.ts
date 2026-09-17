import { NextResponse } from "next/server";
import { fetchIcsText, IcsFetchError } from "@/lib/icsFetch";
import { parseRawEvents } from "@/lib/rawEvents";
import { buildTrips } from "@/lib/tripBuilder";
import { computeStats } from "@/lib/stats";
import { toStatsDTO, toTripDTO } from "@/lib/dto";

// node:dns / node:net (used for SSRF checks in icsFetch) require the Node runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const icsUrl =
    typeof body === "object" && body !== null && "icsUrl" in body && typeof (body as { icsUrl: unknown }).icsUrl === "string"
      ? (body as { icsUrl: string }).icsUrl.trim()
      : "";

  if (!icsUrl) {
    return NextResponse.json({ error: "Bitte einen Kalender-Link angeben." }, { status: 400 });
  }

  let icsText: string;
  try {
    icsText = await fetchIcsText(icsUrl);
  } catch (error) {
    if (error instanceof IcsFetchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unbekannter Fehler beim Abrufen des Kalenders." },
      { status: 500 },
    );
  }

  try {
    const rawEvents = parseRawEvents(icsText);
    const { trips, diagnostics } = buildTrips(rawEvents);
    const stats = computeStats(trips);

    const tripDTOs = trips
      .map(toTripDTO)
      .sort((a, b) => b.startTime.localeCompare(a.startTime));

    return NextResponse.json({
      trips: tripDTOs,
      stats: toStatsDTO(stats),
      diagnostics,
    });
  } catch {
    return NextResponse.json(
      { error: "Die Datei konnte nicht als ICS-Kalender gelesen werden." },
      { status: 400 },
    );
  }
}
