import { describe, it, expect } from "vitest";
import { noticeFeatures, noticeLevel, capeRisk, waveFeatures, currentFeatures, circlePolygon } from "@/lib/map-layers";

const base = { body: "x", lat: 45.4, lon: 12.4, radius_km: 2, valid_from: null, issuer: "CP Venezia", source_url: "https://x" };
describe("map layers", () => {
  it("interdizione is a red zone, lavori yellow", () => {
    expect(noticeLevel("interdizione")).toBe("rossa");
    expect(noticeLevel("lavori")).toBe("gialla");
  });
  it("expired notices are not drawn", () => {
    const now = Date.parse("2026-11-25T10:00:00Z");
    const f = noticeFeatures([{ ...base, id: "a", title: "A", category: "lavori", valid_until: "2026-11-24T00:00:00Z" }, { ...base, id: "b", title: "B", category: "interdizione", valid_until: "2026-12-01T00:00:00Z" }], now);
    expect(f.features.map((x) => x.properties["id"])).toEqual(["b"]);
  });
  it("circle polygon radius ≈ 2 km northward", () => {
    const ring = circlePolygon(45, 13, 2);
    expect(ring[0]![1] - 45).toBeCloseTo(2 / 110.574, 4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
  it("CAPE thresholds", () => {
    expect(capeRisk(2500)).toBe("alto"); expect(capeRisk(1000)).toBe("moderato"); expect(capeRisk(300)).toBe("basso"); expect(capeRisk(299)).toBeNull();
  });
  it("waves carry Tp and skip land cells", () => {
    const g = { lat0: 45, lon0: 13, dLat: 0.1, dLon: 0.1, ny: 1, nx: 2, times: ["2026-11-25T10:00:00Z"], h: [[1.2, null]], d: [[90, null]], tp: [[6.5, null]] };
    const f = waveFeatures(g, "2026-11-25T10:00:00Z", 1);
    expect(f.features).toHaveLength(1);
    expect(f.features[0]!.properties).toMatchObject({ h: 1.2, tp: 6.5, rotate: 270 });
  });
  it("current 1 m/s northward = 1.9 kn toward 0°", () => {
    const g = { lat0: 45, lon0: 13, dLat: 0.1, dLon: 0.1, ny: 1, nx: 1, times: ["2026-11-25T10:00:00Z"], u: [[0]], v: [[1]] };
    expect(currentFeatures(g, "2026-11-25T10:00:00Z", 1).features[0]!.properties).toMatchObject({ kn: 1.9, rotate: 0 });
  });
});
