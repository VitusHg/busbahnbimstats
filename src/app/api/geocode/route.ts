import { NextResponse } from "next/server";
import { geocodeStops } from "@/lib/geocoding";

export const runtime = "nodejs";

const MAX_STOPS_PER_REQUEST = 200;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const stops =
    typeof body === "object" && body !== null && Array.isArray((body as { stops?: unknown }).stops)
      ? (body as { stops: unknown[] }).stops.filter((s): s is string => typeof s === "string")
      : null;

  if (!stops || stops.length === 0) {
    return NextResponse.json({ error: "Keine Haltestellen angegeben." }, { status: 400 });
  }
  if (stops.length > MAX_STOPS_PER_REQUEST) {
    return NextResponse.json({ error: "Zu viele Haltestellen auf einmal." }, { status: 400 });
  }

  const points = await geocodeStops(stops);

  return NextResponse.json({
    points: Object.fromEntries(points),
  });
}
