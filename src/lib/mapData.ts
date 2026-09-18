import { normalizeStopName } from "./textUtils";
import { haversineKm, type GeoPoint } from "./distance";
import type { TripDTO } from "./dto";

export interface MapStop {
  name: string;
  lat: number;
  lon: number;
  visits: number;
}

export interface MapConnection {
  key: string;
  from: MapStop;
  to: MapStop;
  count: number;
  distanceKm: number;
}

export interface MapData {
  stops: MapStop[];
  connections: MapConnection[];
  /** Sum of per-leg straight-line distances across every trip (a lower-bound estimate of real distance traveled). */
  totalDistanceKm: number;
  /** Unique stops that couldn't be geocoded (missing from `points` or resolved to null). */
  unresolvedStopCount: number;
}

/**
 * Combines parsed trips with a stop-name -> coordinates lookup into the
 * shape the map view and the distance/CO2 stats need: one point per unique
 * stop (sized by how often it was used) and one straight-line connection
 * per unique stop pair (weighted by how often that pair was ridden).
 */
export function buildMapData(
  trips: TripDTO[],
  points: Record<string, GeoPoint | null | undefined>,
): MapData {
  const stopVisits = new Map<string, number>();
  const connectionCounts = new Map<string, { from: string; to: string; count: number }>();
  const seenStopNames = new Set<string>();
  let totalDistanceKm = 0;
  let unresolvedStopCount = 0;

  for (const trip of trips) {
    for (const leg of trip.legs) {
      const from = normalizeStopName(leg.departureStop);
      const to = normalizeStopName(leg.arrivalStop);
      stopVisits.set(from, (stopVisits.get(from) ?? 0) + 1);
      stopVisits.set(to, (stopVisits.get(to) ?? 0) + 1);

      for (const name of [from, to]) {
        if (!seenStopNames.has(name)) {
          seenStopNames.add(name);
          if (!points[name]) unresolvedStopCount += 1;
        }
      }

      const fromPoint = points[from];
      const toPoint = points[to];
      if (fromPoint && toPoint) {
        totalDistanceKm += haversineKm(fromPoint, toPoint);
        const key = [from, to].sort().join(" | ");
        const existing = connectionCounts.get(key);
        if (existing) existing.count += 1;
        else connectionCounts.set(key, { from, to, count: 1 });
      }
    }
  }

  const stops: MapStop[] = [];
  for (const [name, visits] of stopVisits) {
    const point = points[name];
    if (point) stops.push({ name, lat: point.lat, lon: point.lon, visits });
  }
  const stopByName = new Map(stops.map((s) => [s.name, s]));

  const connections: MapConnection[] = [];
  for (const [key, entry] of connectionCounts) {
    const from = stopByName.get(entry.from);
    const to = stopByName.get(entry.to);
    if (from && to) {
      connections.push({ key, from, to, count: entry.count, distanceKm: haversineKm(from, to) });
    }
  }

  return { stops, connections, totalDistanceKm, unresolvedStopCount };
}
