import { describe, expect, it } from "vitest";
import { CO2_CAR_G_PER_KM, CO2_TRANSIT_G_PER_KM, estimateCo2SavedGrams, haversineKm } from "./distance";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 47.07, lon: 15.44 }, { lat: 47.07, lon: 15.44 })).toBe(0);
  });

  it("matches the well-known ~111.2 km per degree of latitude", () => {
    const distance = haversineKm({ lat: 47.0, lon: 15.0 }, { lat: 48.0, lon: 15.0 });
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it("is symmetric", () => {
    const a = { lat: 47.0713, lon: 15.4189 };
    const b = { lat: 48.2082, lon: 16.3738 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

describe("estimateCo2SavedGrams", () => {
  it("is 0 for 0 km", () => {
    expect(estimateCo2SavedGrams(0)).toBe(0);
  });

  it("scales linearly with the documented per-km factor difference", () => {
    expect(estimateCo2SavedGrams(10)).toBe(10 * (CO2_CAR_G_PER_KM - CO2_TRANSIT_G_PER_KM));
  });

  it("never goes negative for a negative distance (defensive)", () => {
    expect(estimateCo2SavedGrams(-5)).toBe(0);
  });
});
