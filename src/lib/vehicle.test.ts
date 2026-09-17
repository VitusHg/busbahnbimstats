import { describe, expect, it } from "vitest";
import { classifyVehicle } from "./vehicle";

describe("classifyVehicle", () => {
  it.each([
    ["Straßenbahn 7", "tram", "7"],
    ["Stadtbus 31", "citybus", "31"],
    ["RegioBus 470", "regiobus", "470"],
    ["Expressbus X30", "expressbus", "X30"],
    ["E1", "tram", "E1"],
    ["E12", "tram", "E12"],
    ["ICE 123", "train", "ICE 123"],
    ["REX 7", "train", "REX 7"],
  ])("classifies %s as %s / %s", (label, kind, lineNumber) => {
    expect(classifyVehicle(label)).toEqual({ kind, lineNumber });
  });

  it("falls back to 'other' for an unrecognized label without throwing", () => {
    expect(classifyVehicle("Seilbahn Schlossberg")).toEqual({
      kind: "other",
      lineNumber: "Seilbahn Schlossberg",
    });
  });
});
