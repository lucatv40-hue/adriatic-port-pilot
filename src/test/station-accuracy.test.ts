import { describe, it, expect } from "vitest";
import { meanAbsError, nearestStation } from "@/lib/station-accuracy";

describe("station accuracy", () => {
  it("averages absolute error on shared hours only", () => {
    const obs = new Map([["a", 10], ["b", 4], ["c", 9]]);
    const fc = new Map([["a", 12], ["b", 8]]);
    expect(meanAbsError(obs, fc)).toEqual({ mae: 3, samples: 2 });
  });
  it("returns null with no overlap", () => { expect(meanAbsError(new Map([["a", 1]]), new Map())).toBeNull(); });
  it("picks the closest station", () => {
    expect(nearestStation(45.43, 12.37).id).toBe("LIPZ");
    expect(nearestStation(45.65, 13.76).id).toBe("LIPQ");
    expect(nearestStation(44.87, 13.84).id).toBe("LDPL");
  });
});
