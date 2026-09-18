import type { GeoPoint } from "./distance";

export type { GeoPoint };

// Process-lifetime cache so repeated requests (and overlapping stop names
// across different users of the same deployment) don't re-hit Nominatim.
// `null` means "looked up, no result" - also cached, so a bad match isn't
// retried on every request.
const cache = new Map<string, GeoPoint | null>();
const MAX_CACHE_ENTRIES = 5000;

// Nominatim's usage policy caps unattended use at 1 request/second and asks
// for a descriptive User-Agent. Requests are queued through this promise
// chain so they run strictly one at a time, spaced out, regardless of how
// many stops are requested concurrently by different callers.
const MIN_INTERVAL_MS = 1100;
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the chain alive even if this task rejects.
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

// Soft bias toward Styria/Graz (most stops in this app's data), without
// hard-excluding results elsewhere in Austria.
const STYRIA_VIEWBOX = "13.4,47.9,16.2,46.5";

async function geocodeOne(stopName: string): Promise<GeoPoint | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "at",
    viewbox: STYRIA_VIEWBOX,
    bounded: "0",
    q: stopName,
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "BusBahnBimStats/1.0 (personal transit-stats tool; OSM Nominatim)",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (results.length === 0) return null;
    const { lat, lon } = results[0];
    return { lat: Number(lat), lon: Number(lon) };
  } catch {
    return null;
  }
}

/**
 * Resolves stop names to coordinates via OSM Nominatim, one at a time at
 * most ~1/second, using a persistent process-lifetime cache. Returns a map
 * keyed by the exact input strings; a stop that couldn't be located maps to
 * null rather than being omitted, so callers can tell "not found" apart
 * from "not requested".
 */
export async function geocodeStops(
  stopNames: string[],
): Promise<Map<string, GeoPoint | null>> {
  const unique = [...new Set(stopNames)];
  const result = new Map<string, GeoPoint | null>();

  const toFetch: string[] = [];
  for (const name of unique) {
    if (cache.has(name)) {
      result.set(name, cache.get(name)!);
    } else {
      toFetch.push(name);
    }
  }

  await Promise.all(
    toFetch.map((name) =>
      enqueue(async () => {
        const point = await geocodeOne(`${name}, Österreich`);
        if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
        cache.set(name, point);
        result.set(name, point);
      }),
    ),
  );

  return result;
}
