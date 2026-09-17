import { describe, expect, it } from "vitest";
import { parseRawEvents } from "./rawEvents";
import { buildTrips } from "./tripBuilder";
import {
  buildIcs,
  connectionDescription,
  legLine,
  transferLine,
  type FixtureEvent,
} from "./testUtils/buildIcs";

function simpleLegEvent(
  uid: string,
  destLabel: string,
  originLabel: string,
  depTime: string,
  depStop: string,
  arrTime: string,
  arrStop: string,
  start: string,
  end: string,
  label = "Straßenbahn 1",
  direction = "Irgendwohin",
): FixtureEvent {
  return {
    uid,
    summary: `Fahrt nach ${destLabel} || Startort: ${originLabel}`,
    location: originLabel,
    description: connectionDescription(legLine(depTime, depStop, label, direction, arrTime, arrStop)),
    start,
    end,
  };
}

describe("buildTrips", () => {
  it("keeps legs from one VEVENT (walk + ride + Übergang + ride) as a single trip", () => {
    const description = connectionDescription(
      [
        legLine("16:58", "Graz Reiterkaserne", "Straßenbahn 7", "Wetzelsdorf", "17:05", "Graz Jakominiplatz, A"),
        transferLine("17:05", "Graz Jakominiplatz", 1),
        legLine("17:10", "Graz Jakominiplatz, F", "Stadtbus 31", "Harter Straße", "17:29", "Graz Ankerstraße"),
      ].join("\n\n"),
      "31 Min.",
    );
    const ics = buildIcs([
      {
        uid: "EVT-1",
        summary: "Fahrt nach Graz Ankerstraße || Startort: Graz Reiterkaserne",
        location: "Graz Reiterkaserne",
        description,
        start: "20260902T165800",
        end: "20260902T172900",
      },
    ]);

    const { trips, diagnostics } = buildTrips(parseRawEvents(ics));

    expect(trips).toHaveLength(1);
    expect(trips[0].legCount).toBe(2);
    expect(trips[0].mergedAcrossEvents).toBe(false);
    expect(trips[0].originStop).toBe("Graz Reiterkaserne");
    expect(trips[0].destinationStop).toBe("Graz Ankerstraße");
    expect(trips[0].transitDurationMin).toBe(7 + 19);
    expect(trips[0].transferWaitMin).toBe(5);
    expect(diagnostics.totalTrips).toBe(1);
    expect(diagnostics.tripsMergedAcrossEvents).toBe(0);
  });

  it("links two separate VEVENTs into one trip when the stop matches and the gap is short", () => {
    const events = [
      simpleLegEvent(
        "A",
        "Graz Reiterkaserne",
        "Graz Jakominiplatz",
        "13:53",
        "Graz Jakominiplatz, B",
        "13:59",
        "Graz Reiterkaserne",
        "20260915T135300",
        "20260915T135900",
        "Straßenbahn 1",
        "Reiterkaserne",
      ),
      simpleLegEvent(
        "B",
        "Graz Lenaugasse",
        "Graz Reiterkaserne",
        "14:01",
        "Graz Reiterkaserne",
        "14:03",
        "Graz Lenaugasse",
        "20260915T140100",
        "20260915T140300",
        "E1",
        "Mariatrost",
      ),
    ];
    const { trips, diagnostics } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(1);
    expect(trips[0].legCount).toBe(2);
    expect(trips[0].mergedAcrossEvents).toBe(true);
    expect(trips[0].sourceEventUids).toEqual(["A", "B"]);
    expect(trips[0].originStop).toBe("Graz Jakominiplatz, B");
    expect(trips[0].destinationStop).toBe("Graz Lenaugasse");
    expect(trips[0].originLabel).toBe("Graz Jakominiplatz");
    expect(trips[0].destinationLabel).toBe("Graz Lenaugasse");
    expect(diagnostics.tripsMergedAcrossEvents).toBe(1);
  });

  it("does not link two VEVENTs when the gap between them is too long", () => {
    const events = [
      simpleLegEvent(
        "A",
        "Graz Reiterkaserne",
        "Graz Jakominiplatz",
        "12:31",
        "Graz Hasnerplatz",
        "12:39",
        "Graz Jakominiplatz, C",
        "20260915T123100",
        "20260915T123900",
      ),
      simpleLegEvent(
        "B",
        "Graz Reiterkaserne",
        "Graz Jakominiplatz",
        "13:53",
        "Graz Jakominiplatz, B",
        "13:59",
        "Graz Reiterkaserne",
        "20260915T135300",
        "20260915T135900",
      ),
    ];
    const { trips } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(2);
    expect(trips[0].mergedAcrossEvents).toBe(false);
    expect(trips[1].mergedAcrossEvents).toBe(false);
  });

  it("does not link two VEVENTs when the stop doesn't match even if the gap is short", () => {
    const events = [
      simpleLegEvent(
        "A",
        "Graz Ziel A",
        "Graz Start A",
        "10:00",
        "Graz Start A",
        "10:10",
        "Graz Ziel A",
        "20260915T100000",
        "20260915T101000",
      ),
      simpleLegEvent(
        "B",
        "Graz Ziel B",
        "Graz Ganz anderer Ort",
        "10:12",
        "Graz Ganz anderer Ort",
        "10:20",
        "Graz Ziel B",
        "20260915T101200",
        "20260915T102000",
      ),
    ];
    const { trips } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(2);
  });

  it("treats a matching platform-letter suffix as the same physical stop for linking", () => {
    const events = [
      simpleLegEvent(
        "A",
        "Graz Jakominiplatz",
        "Graz Start",
        "10:00",
        "Graz Start",
        "10:10",
        "Graz Jakominiplatz, B",
        "20260915T100000",
        "20260915T101000",
      ),
      simpleLegEvent(
        "B",
        "Graz Ziel",
        "Graz Jakominiplatz",
        "10:15",
        "Graz Jakominiplatz, D",
        "10:25",
        "Graz Ziel",
        "20260915T101500",
        "20260915T102500",
      ),
    ];
    const { trips } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(1);
    expect(trips[0].mergedAcrossEvents).toBe(true);
  });

  it("reports diagnostics for a calendar mixing recognizable and foreign entries", () => {
    const events: FixtureEvent[] = [
      simpleLegEvent(
        "A",
        "Graz Ziel",
        "Graz Start",
        "10:00",
        "Graz Start",
        "10:10",
        "Graz Ziel",
        "20260915T100000",
        "20260915T101000",
      ),
      {
        uid: "FOREIGN-1",
        summary: "Zahnarzttermin",
        location: "Ordination",
        description: "Bitte 10 Minuten vorher da sein.",
        start: "20260916T090000",
        end: "20260916T093000",
      },
    ];
    const { trips, diagnostics } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(1);
    expect(diagnostics.totalEvents).toBe(2);
    expect(diagnostics.recognizedEvents).toBe(1);
    expect(diagnostics.unrecognizedEvents).toBe(1);
  });

  it("does not merge a there-and-back errand into one loop trip", () => {
    // Real-world shape: ride to a stop, do something for ~19 min, ride straight
    // back. Both legs share a stop and a short gap, but this is two separate
    // errands, not one continuous journey with a transfer.
    const events = [
      simpleLegEvent(
        "A",
        "Graz Zinzendorfgasse",
        "Graz Wirtschaftskammer/tim",
        "10:12",
        "Graz Wirtschaftskammer/tim",
        "10:19",
        "Graz Zinzendorfgasse",
        "20260909T101200",
        "20260909T101900",
      ),
      simpleLegEvent(
        "B",
        "Graz Wirtschaftskammer/tim",
        "Graz Zinzendorfgasse",
        "10:38",
        "Graz Zinzendorfgasse",
        "10:46",
        "Graz Wirtschaftskammer/tim",
        "20260909T103800",
        "20260909T104600",
      ),
    ];
    const { trips } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(2);
    expect(trips[0].mergedAcrossEvents).toBe(false);
    expect(trips[1].mergedAcrossEvents).toBe(false);
  });

  it("splits an outbound+return chain at the turnaround stop instead of looping it into one trip", () => {
    // WKO-WIFI -[transfer@Senior]-> Andritz, then (after a pause) back:
    // Andritz -[transfer@Senior]-> WKO-WIFI. This must become two 2-leg
    // trips split at Andritz, not one 4-leg trip that ends where it began.
    const events = [
      simpleLegEvent(
        "A",
        "Graz Senior:innenzentrum",
        "Graz WKO-WIFI/tim",
        "10:17",
        "Graz WKO-WIFI/tim",
        "10:19",
        "Graz Senior:innenzentrum",
        "20260910T101700",
        "20260910T101900",
      ),
      simpleLegEvent(
        "B",
        "Graz Andritz",
        "Graz Senior:innenzentrum",
        "10:22",
        "Graz Senior:innenzentrum",
        "10:29",
        "Graz Andritz",
        "20260910T102200",
        "20260910T102900",
      ),
      simpleLegEvent(
        "C",
        "Graz Senior:innenzentrum",
        "Graz Andritz",
        "10:47",
        "Graz Andritz",
        "10:53",
        "Graz Senior:innenzentrum",
        "20260910T104700",
        "20260910T105300",
      ),
      simpleLegEvent(
        "D",
        "Graz WKO-WIFI/tim",
        "Graz Senior:innenzentrum",
        "11:00",
        "Graz Senior:innenzentrum",
        "11:03",
        "Graz WKO-WIFI/tim",
        "20260910T110000",
        "20260910T110300",
      ),
    ];
    const { trips } = buildTrips(parseRawEvents(buildIcs(events)));

    expect(trips).toHaveLength(2);
    expect(trips[0].legCount).toBe(2);
    expect(trips[0].originStop).toBe("Graz WKO-WIFI/tim");
    expect(trips[0].destinationStop).toBe("Graz Andritz");
    expect(trips[1].legCount).toBe(2);
    expect(trips[1].originStop).toBe("Graz Andritz");
    expect(trips[1].destinationStop).toBe("Graz WKO-WIFI/tim");
  });
});
