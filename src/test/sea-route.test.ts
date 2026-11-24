import { describe, expect, it } from "vitest";
import { crossesLand, lagoonExit, seaRoute } from "@/lib/sea-route";

const certosa = { lat: 45.435, lon: 12.3722 }, sangiusto = { lat: 45.6485, lon: 13.76 }, pula = { lat: 44.873, lon: 13.8449 }, chioggia = { lat: 45.2155, lon: 12.2811 };
const legsOk = (r: { lat: number; lon: number }[]) => r.slice(1).every((q, i) => !crossesLand(r[i]!, q));

describe("sea route", () => {
  it("Venice lagoon port leaves via Lido inlet toward Trieste", () => {
    const ex = lagoonExit(certosa, sangiusto)!;
    expect(ex[ex.length - 1]!.lon).toBeCloseTo(12.44, 2);
  });
  it("Chioggia port leaves via Chioggia inlet toward Pula", () => {
    const ex = lagoonExit(chioggia, pula)!;
    expect(ex[ex.length - 1]!.lat).toBeCloseTo(45.234, 2);
  });
  it("Trieste to Pula never crosses Istria", () => {
    const r = seaRoute(sangiusto, pula);
    expect(crossesLand(sangiusto, pula)).toBe(true);
    expect(legsOk(r)).toBe(true);
  });
  it("Venice to Trieste has at least 5 points and no land legs", () => {
    const r = seaRoute(certosa, sangiusto);
    expect(r.length).toBeGreaterThanOrEqual(5);
    expect(legsOk(r.slice(4))).toBe(true);
  });
});
