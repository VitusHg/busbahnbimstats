export interface GeoPoint {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle ("as the crow flies") distance between two points, in km. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * CO2 factors in grams per passenger-kilometer, Austria averages:
 * - Car: 147 g/pkm (VCÖ - Mobilität mit Zukunft, average of petrol/diesel).
 * - Public transport: ~37 g/pkm, derived from VCÖ's figure that bus travel
 *   cuts emissions by ~75% vs. a car (147 * 0.25 ≈ 37); used as one blended
 *   average across tram/bus/train rather than a per-mode breakdown, which
 *   understates savings for rail (VCÖ cites trains at just 5.4 g/pkm) but
 *   keeps the estimate conservative rather than overstated.
 * Source: https://vcoe.at/service/fragen-und-antworten/klima-emissionen-der-verkehrsmittel-im-vergleich
 */
export const CO2_CAR_G_PER_KM = 147;
export const CO2_TRANSIT_G_PER_KM = 37;

/** Estimated CO2 saved (grams) by covering `distanceKm` by public transport instead of car. */
export function estimateCo2SavedGrams(distanceKm: number): number {
  return Math.max(0, distanceKm) * (CO2_CAR_G_PER_KM - CO2_TRANSIT_G_PER_KM);
}
