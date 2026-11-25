import { afterEach, describe, expect, it, vi } from "vitest";
import { completeWind, fetchRouteForecast, forecastWindow } from "@/lib/weather";

afterEach(() => { vi.unstubAllGlobals(); });
const point = { lat: 45.435, lon: 12.3722 };
function data(now: number, wind = 15) {
  const time = forecastWindow(now).times;
  return { latitude: point.lat, longitude: point.lon, hourly_units: { wind_speed_10m: "kn", wind_gusts_10m: "kn", wind_direction_10m: "°" }, hourly: { time, wind_speed_10m: time.map(() => wind), wind_gusts_10m: time.map(() => 20), wind_direction_10m: time.map(() => 90) } };
}
describe("ICON-2I route weather", () => {
  it("covers 72 real hours (oggi, domani, dopodomani)", () => {
    const now = Date.parse("2026-11-24T00:39:00Z"), w = forecastWindow(now);
    expect(w.start).toBe(Date.parse("2026-11-24T00:00:00Z"));
    expect(w.end).toBe(Date.parse("2026-11-27T01:00:00Z"));
    expect(w.end - now).toBeGreaterThanOrEqual(72 * 3_600_000);
  });
  it("requires all three wind variables, hours, knots and a nearby grid", () => {
    const now = Date.parse("2026-11-25T00:00:00Z"), d = data(now);
    expect(completeWind(d, forecastWindow(now).times, point)).toBe(true);
    expect(completeWind({ ...d, latitude: 52 }, forecastWindow(now).times, point)).toBe(false);
    expect(completeWind({ ...d, hourly_units: { ...d.hourly_units, wind_speed_10m: "km/h" } }, forecastWindow(now).times, point)).toBe(false);
    d.hourly.wind_gusts_10m.pop();
    expect(completeWind(d, forecastWindow(now).times, point)).toBe(false);
  });
  it("uses explicit ICON-2I, marine cells and a single batch for five points", async () => {
    const now = Date.parse("2026-11-27T00:39:00Z");
    const fetch = vi.fn(async (_url: string) => new Response(JSON.stringify(Array.from({ length: 5 }, () => data(now)))));
    vi.stubGlobal("fetch", fetch);
    const result = await fetchRouteForecast(Array.from({ length: 5 }, () => point), now);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("models=italia_meteo_arpae_icon_2i&cell_selection=sea");
    expect(result).toHaveLength(5);
    expect(result[0]?.windSource).toMatchObject({ model: "icon2i", fallback: false, modelUpdatedAt: null });
  });
  it("keeps ICON-2I on incomplete hours without requesting automatic wind and reuses marine data", async () => {
    const now = Date.parse("2026-11-28T00:39:00Z");
    const broken = data(now, 40); broken.hourly.wind_gusts_10m.pop();
    const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("waves.json") ? {} : url.includes("models=") ? broken : data(now, 12))));
    vi.stubGlobal("fetch", fetch);
    const result = await fetchRouteForecast([point], now);
    expect(result[0]?.windSource).toMatchObject({ model: "icon2i", fallback: false, complete: false });
    expect(result[0]?.series.wind.every((v) => v === 40)).toBe(true);
    expect(result[0]?.series.gust.at(-1)).toBeNull();
    expect(result[0]?.series.wave.every((v) => v === null)).toBe(true);
    await fetchRouteForecast([point], now);
    expect(fetch.mock.calls.every(([url]) => url.includes("waves.json") || url.includes("models=italia_meteo_arpae_icon_2i"))).toBe(true);
  });
  it("rejects distant wind cells without switching models and preserves independent waves", async () => {
    const now = Date.parse("2026-11-30T00:39:00Z");
    const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("waves.json")
      ? { lat0: point.lat, lon0: point.lon, dLat: 0.04, dLon: 0.04, ny: 1, nx: 1, times: forecastWindow(now).times.map((t) => new Date(t * 1000).toISOString()), h: forecastWindow(now).times.map(() => [0.7]), d: forecastWindow(now).times.map(() => [180]) }
      : { ...data(now), latitude: 52 })));
    vi.stubGlobal("fetch", fetch);
    const result = await fetchRouteForecast([point], now);
    expect(result[0]?.series.wind.every((v) => v === null)).toBe(true);
    expect(result[0]?.windOk).toBe(false);
    expect(result[0]?.series.wave.every((v) => v === 0.7)).toBe(true);
  });
  it("failed sources return null rather than zeros", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const result = await fetchRouteForecast([point], Date.parse("2026-11-29T00:39:00Z"));
    expect(result[0]?.series.wind.every((v) => v === null)).toBe(true);
    expect(result[0]?.windOk).toBe(false);
  });
});