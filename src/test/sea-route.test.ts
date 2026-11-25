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

import { routePlan, onLand as _onLand, inLagoon as _inLagoon } from "@/lib/sea-route";
describe("routePlan", () => {
  it("lagoon departure: first weather point is the safe-water buoy outside Bocca di Lido, points equally spaced at sea", () => {
    const r = routePlan({ lat: 45.4505, lon: 12.4335 }, { lat: 45.5, lon: 13.55 }, 5);
    expect(r.points[0]).toEqual({ lat: 45.42, lon: 12.458 });
    expect(r.points).toHaveLength(5);
    r.points.forEach((q) => { expect(_inLagoon(q)).toBe(false); expect(_onLand(q)).toBe(false); });
    expect(r.track[0]).toEqual({ lat: 45.4505, lon: 12.4335 });
    const d = r.points.slice(1).map((q, i) => Math.hypot(q.lat - r.points[i]!.lat, q.lon - r.points[i]!.lon));
    expect(Math.max(...d) / Math.min(...d)).toBeLessThan(1.6);
  });
});
