import { describe, it, expect } from "vitest";
import { rateDeparture, bestDepartures } from "@/lib/departure-advice";
import type { PointForecast } from "@/lib/weather";

const now = Date.parse("2026-11-25T00:00:00Z");
const times = Array.from({ length: 80 }, (_, i) => new Date(now + i * 3_600_000).toISOString());
const pts = [{ lat: 45.4, lon: 12.4 }, { lat: 45.5, lon: 12.8 }];
const fc = (wind: (i: number) => number, wave = 0.4): PointForecast[] => pts.map((p) => ({ ...p, windOk: true, waveOk: true, series: { time: times, wind: times.map((_, i) => wind(i)), gust: times.map((_, i) => wind(i) * 1.3), windDir: times.map(() => 90), wave: times.map(() => wave), waveDir: times.map(() => 90) } }));
const t = { wind: 20, wave: 1.5 };

describe("consiglio partenza", () => {
  it("calma a motore = 4 stelle", () => { expect(rateDeparture(pts, fc(() => 4), now, 6, "motore", t)?.stars).toBe(4); });
  it("onda oltre soglia = sconsigliato (0)", () => { expect(rateDeparture(pts, fc(() => 10, 2), now, 6, "motore", t)?.stars).toBe(0); });
  it("raffiche oltre soglia = sconsigliato", () => { expect(rateDeparture(pts, fc(() => 25), now, 6, "motore", t)?.stars).toBe(0); });
  it("vela con poco vento perde stelle, mai sotto 1", () => { const a = rateDeparture(pts, fc(() => 3), now, 6, "vela", t); expect(a?.stars).toBeGreaterThanOrEqual(1); expect(a?.stars).toBeLessThan(4); });
  it("al massimo 3 consigli distanziati di 6 ore, il migliore per primo", () => {
    const r = bestDepartures(pts, fc((i) => (i > 30 && i < 40 ? 4 : 18)), 6, "motore", t, now);
    expect(r).toHaveLength(3);
    expect(r[0]!.stars).toBe(4);
    for (let i = 1; i < r.length; i++) for (let j = 0; j < i; j++) expect(Math.abs(r[i]!.departure - r[j]!.departure)).toBeGreaterThanOrEqual(6 * 3_600_000);
  });
});
