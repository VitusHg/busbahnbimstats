import { describe, expect, it } from "vitest";
import { parseRawEvents } from "./rawEvents";
import { parseEventLegs } from "./legParser";
import {
  buildIcs,
  connectionDescription,
  legLine,
  transferLine,
  walkLine,
} from "./testUtils/buildIcs";

function singleEvent(description: string, start = "20260902T165000", end = "20260902T172900") {
  const ics = buildIcs([
    {
      uid: "TEST-1",
      summary: "Fahrt nach Testziel || Startort: Teststart",
      location: "Teststart",
      description,
      start,
      end,
    },
  ]);
  return parseRawEvents(ics)[0];
}

describe("parseEventLegs", () => {
  it("extracts a single simple leg", () => {
    const description = connectionDescription(
      legLine("16:23", "Graz Nibelungengasse", "Stadtbus 64E", "St.Leonhard", "16:26", "Graz Reiterkaserne"),
    );
    const event = singleEvent(description, "20260909T162300", "20260909T162600");
    const { legs, walkMinutes, walkSegments } = parseEventLegs(event);

    expect(legs).toHaveLength(1);
    expect(legs[0].departureStop).toBe("Graz Nibelungengasse");
    expect(legs[0].arrivalStop).toBe("Graz Reiterkaserne");
    expect(legs[0].lineLabel).toBe("Stadtbus 64E");
    expect(legs[0].lineNumber).toBe("64E");
    expect(legs[0].vehicleKind).toBe("citybus");
    expect(legs[0].direction).toBe("St.Leonhard");
    expect(legs[0].durationMin).toBe(3);
    expect(walkMinutes).toBe(0);
    expect(walkSegments).toBe(0);
  });

  it("ignores a Fußweg before and after the ride and excludes it from the leg's time window", () => {
    const description = connectionDescription(
      [
        walkLine("16:51", "Graz Uni/Mensa (Leechgasse)", 11),
        legLine("17:02", "Graz Uni/Mensa (Leechgasse)", "Stadtbus 31", "Harter Straße", "17:29", "Graz Ankerstraße"),
        walkLine("17:29", "Zieladresse 1, 8054 Graz", 1),
      ].join("\n\n"),
      "39 Min.",
    );
    const event = singleEvent(description, "20260826T165100", "20260826T172900");
    const { legs, walkMinutes, walkSegments } = parseEventLegs(event);

    expect(legs).toHaveLength(1);
    expect(legs[0].departureStop).toBe("Graz Uni/Mensa (Leechgasse)");
    expect(legs[0].arrivalStop).toBe("Graz Ankerstraße");
    // The leg's own window must exclude the leading walk (16:51-17:02).
    expect(legs[0].departureTime.getTime()).toBeGreaterThan(event.start.getTime());
    expect(walkMinutes).toBe(12);
    expect(walkSegments).toBe(2);
  });

  it("splits a walk + ride + transfer + ride description into two legs, dropping the transfer as its own entry", () => {
    // Mirrors the user's worked example: walk to Reiterkaserne is dropped,
    // the tram leg and the bus leg become two separate legs, and the
    // Übergang in between is not surfaced as a leg or walk segment.
    const description = connectionDescription(
      [
        walkLine("16:50", "Graz Reiterkaserne", 8),
        legLine("16:58", "Graz Reiterkaserne", "Straßenbahn 7", "Wetzelsdorf", "17:05", "Graz Jakominiplatz, A"),
        transferLine("17:05", "Graz Jakominiplatz", 1),
        legLine("17:10", "Graz Jakominiplatz, F", "Stadtbus 31", "Harter Straße", "17:29", "Graz Ankerstraße"),
      ].join("\n\n"),
      "39 Min.",
    );
    const event = singleEvent(description, "20260902T165000", "20260902T172900");
    const { legs, walkMinutes, walkSegments } = parseEventLegs(event);

    expect(legs).toHaveLength(2);

    expect(legs[0].departureStop).toBe("Graz Reiterkaserne");
    expect(legs[0].arrivalStop).toBe("Graz Jakominiplatz, A");
    expect(legs[0].lineLabel).toBe("Straßenbahn 7");
    expect(legs[0].vehicleKind).toBe("tram");
    expect(legs[0].durationMin).toBe(7);

    expect(legs[1].departureStop).toBe("Graz Jakominiplatz, F");
    expect(legs[1].arrivalStop).toBe("Graz Ankerstraße");
    expect(legs[1].lineLabel).toBe("Stadtbus 31");
    expect(legs[1].vehicleKind).toBe("citybus");
    expect(legs[1].durationMin).toBe(19);

    // The gap between the two legs (17:05 -> 17:10) is the transfer/wait
    // time; it must not appear as walking time.
    expect(walkMinutes).toBe(8);
    expect(walkSegments).toBe(1);
    expect(
      legs[1].departureTime.getTime() - legs[0].arrivalTime.getTime(),
    ).toBe(5 * 60_000);
  });

  it("classifies a bare line code (no vehicle-type prefix) as a Graz tram", () => {
    const description = connectionDescription(
      legLine("16:51", "Graz Reiterkaserne", "E1", "Mariatrost", "16:53", "Graz Lenaugasse"),
    );
    const event = singleEvent(description, "20260914T165100", "20260914T165300");
    const { legs } = parseEventLegs(event);

    expect(legs).toHaveLength(1);
    expect(legs[0].vehicleKind).toBe("tram");
    expect(legs[0].lineNumber).toBe("E1");
  });

  it("keeps messy direction text (über.../parenthetical notes) intact without breaking parsing", () => {
    const description = connectionDescription(
      legLine(
        "17:22",
        "Graz St.Leonhard/Klinikum Mitte, H",
        "Expressbus X30",
        "Hartberg Bahnhof über Gleisdorf, Expressbus",
        "18:32",
        "Hartberg Europaplatz (Ressavarstraße)",
      ),
      "1 Std. 10 Min.",
    );
    const event = singleEvent(description, "20260911T172200", "20260911T183200");
    const { legs } = parseEventLegs(event);

    expect(legs).toHaveLength(1);
    expect(legs[0].vehicleKind).toBe("expressbus");
    expect(legs[0].lineNumber).toBe("X30");
    expect(legs[0].direction).toBe("Hartberg Bahnhof über Gleisdorf, Expressbus");
    expect(legs[0].durationMin).toBe(70);
  });

  it("rolls a leg over midnight correctly", () => {
    const description = connectionDescription(
      legLine("23:50", "Graz Hauptbahnhof", "Stadtbus 40N", "Nachtlinie", "00:15", "Graz Andritz"),
    );
    const event = singleEvent(description, "20260905T235000", "20260906T001500");
    const { legs } = parseEventLegs(event);

    expect(legs).toHaveLength(1);
    expect(legs[0].durationMin).toBe(25);
    expect(legs[0].arrivalTime.getTime()).toBeGreaterThan(legs[0].departureTime.getTime());
  });

  it("returns no legs for a calendar entry that doesn't match the Busbahnbim format", () => {
    const event = singleEvent("Zahnarzttermin um 15 Uhr, bitte pünktlich sein.");
    const { legs, walkMinutes, walkSegments } = parseEventLegs(event);

    expect(legs).toHaveLength(0);
    expect(walkMinutes).toBe(0);
    expect(walkSegments).toBe(0);
  });
});
