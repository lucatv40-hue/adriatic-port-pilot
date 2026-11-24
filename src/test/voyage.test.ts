import { describe, expect, it } from "vitest";
import { boatAt, voyageWeather, relativeWind, windSide } from "@/lib/voyage";
import { routeSchedule } from "@/lib/route-timing";
import type { PointForecast } from "@/lib/weather";

const pts = [{ lat: 45, lon: 12 }, { lat: 45, lon: 12.5 }, { lat: 45, lon: 13 }];
const dep = Date.parse("2026-11-24T06:00:00Z");
const stops = routeSchedule(pts, dep, 10);
const h = (n: number) => new Date(dep + n * 3_600_000).toISOString();
const fc = (wind: number[]): PointForecast => ({ lat: 0, lon: 0, windOk: true, waveOk: true, series: { time: wind.map((_, i) => h(i)), wind, gust: wind.map(w => w + 5), windDir: wind.map(() => 90), wave: wind.map(() => 1), waveDir: wind.map(() => 90) } });

describe("voyage simulation", () => {
  it("places the boat mid-segment at half the leg time", () => {
    const b = boatAt(pts, stops, (stops[0]!.arrival + stops[1]!.arrival) / 2)!;
    expect(b.segment).toBe(0); expect(b.lon).toBeCloseTo(12.25, 5); expect(b.heading).toBeGreaterThan(89);
  });
  it("stops at arrival", () => { const b = boatAt(pts, stops, stops[2]!.arrival + 9e6)!; expect(b.arrived).toBe(true); expect(b.lon).toBe(13); });
  it("blends both neighbouring points at the same time and flags it as estimate", () => {
    const f = [fc([10, 10, 10, 10, 10]), fc([20, 20, 20, 20, 20]), fc([30, 30, 30, 30, 30])];
    const t = (stops[0]!.arrival + stops[1]!.arrival) / 2;
    const w = voyageWeather(f, boatAt(pts, stops, t)!, t)!;
    expect(w.wind).toBeCloseTo(15, 5); expect(w.estimate).toBe(true);
  });
  it("returns null outside the forecast horizon instead of extending the last hour", () => {
    const f = [fc([10]), fc([20]), fc([30])];
    const t = stops[1]!.arrival;
    expect(voyageWeather(f, boatAt(pts, stops, t)!, t)).toBeNull();
  });
  it("describes wind relative to the bow", () => {
    expect(windSide(relativeWind(90, 90))).toBe("di prua");
    expect(windSide(relativeWind(180, 90))).toBe("al traverso di dritta");
  });
});
