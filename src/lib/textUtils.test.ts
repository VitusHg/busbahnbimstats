import { describe, expect, it } from "vitest";
import { formatDurationMin, normalizeStopName } from "./textUtils";

describe("normalizeStopName", () => {
  it("strips a trailing single-letter platform designator", () => {
    expect(normalizeStopName("Graz Jakominiplatz, A")).toBe("Graz Jakominiplatz");
    expect(normalizeStopName("Graz Jakominiplatz, F")).toBe("Graz Jakominiplatz");
  });

  it("leaves stop names without a platform suffix untouched", () => {
    expect(normalizeStopName("Graz Reiterkaserne")).toBe("Graz Reiterkaserne");
    expect(normalizeStopName("Graz WIFI (Bergmanngasse)")).toBe("Graz WIFI (Bergmanngasse)");
    expect(normalizeStopName("Hartberg Europaplatz (Ressavarstraße)")).toBe(
      "Hartberg Europaplatz (Ressavarstraße)",
    );
  });

  it("does not strip longer comma suffixes that aren't platform letters", () => {
    expect(normalizeStopName("Münzgrabenstraße 151, 8010 Graz")).toBe(
      "Münzgrabenstraße 151, 8010 Graz",
    );
  });
});

describe("formatDurationMin", () => {
  it("formats minutes under an hour", () => {
    expect(formatDurationMin(7)).toBe("7 Min.");
  });

  it("formats whole hours without a minutes remainder", () => {
    expect(formatDurationMin(120)).toBe("2 Std.");
  });

  it("formats hours with a minutes remainder", () => {
    expect(formatDurationMin(70)).toBe("1 Std. 10 Min.");
  });
});
