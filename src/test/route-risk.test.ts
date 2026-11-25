import { describe, expect, it } from "vitest";
import * as routeRisk from "@/lib/route-risk";
import { denseRoutePoints, worstRouteSection } from "@/lib/route-risk";
import { distanceNm } from "@/lib/route-timing";
import type { PointForecast } from "@/lib/weather";

const now = Date.parse("2026-11-25T00:00:00Z");
const times = Array.from({ length: 80 }, (_, i) => new Date(now + i * 3_600_000).toISOString());
const forecast = (lat: number, lon: number, wind: number, wave = 0.4): PointForecast => ({
  lat, lon, windOk: true, waveOk: true,
  series: { time: times, wind: times.map(() => wind), gust: times.map(() => wind * 1.3), windDir: times.map(() => 90), wave: times.map(() => wave), waveDir: times.map(() => 90) },
});

describe("analisi punti intermedi", () => {
  it("inserisce rilevamenti tra i waypoint e conserva tutti i waypoint originali", () => {
    const points = [{ lat: 45, lon: 12 }, { lat: 45, lon: 12.5 }, { lat: 45, lon: 13 }];
    const dense = denseRoutePoints(points, 4);
    expect(dense.length).toBeGreaterThan(7);
    expect(dense[0]).toEqual(points[0]);
    expect(dense.at(-1)).toEqual(points[2]);
    expect(dense).toContainEqual(points[1]);
  });

  it("non supera il limite di punti anche su una rotta lunga", () => {
    const dense = denseRoutePoints([{ lat: 44, lon: 12 }, { lat: 46, lon: 15 }], 4, 31);
    expect(dense.length).toBeLessThanOrEqual(31);
  });

  it("trova una criticità nel punto intermedio e indica ingresso e uscita", () => {
    const points = [{ lat: 45, lon: 12 }, { lat: 45, lon: 12.5 }, { lat: 45, lon: 13 }];
    const forecasts = [forecast(45, 12, 8), forecast(45, 12.5, 25), forecast(45, 13, 26)];
    const worst = worstRouteSection(points, forecasts, now, distanceNm(points[0]!, points[1]!), { wind: 20, wave: 1.5 });
    expect(worst?.critical).toBe(true);
    expect(worst?.maxGust).toBeCloseTo(33.8);
    expect(worst?.entry).toBe(now + 3_600_000);
    expect(worst?.exit).toBe(now + 2 * 3_600_000);
  });

  it("trova anche il tratto peggiore senza inventare un'allerta quando è tutto tranquillo", () => {
    const points = [{ lat: 45, lon: 12 }, { lat: 45, lon: 13 }];
    const worst = worstRouteSection(points, [forecast(45, 12, 5), forecast(45, 13, 5)], now, 20, { wind: 20, wave: 1.5 });
    expect(worst?.critical).toBe(false);
    expect(worst?.maxWind).toBe(5);
  });
});

describe("scelta lasciata al capitano", () => {
  it("non espone nessuna funzione che generi una rotta alternativa", () => {
    expect(Object.keys(routeRisk)).not.toContain("alternativeRoute");
  });
});
