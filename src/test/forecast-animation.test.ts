import { describe, expect, it } from "vitest";
import { interpolatedForecast, interpolateDirection, movementDirection } from "@/lib/forecast-animation";
import { selectedForecast } from "@/lib/forecast-selection";
import type { Series } from "@/lib/weather";

const series: Series = { time: ["2026-11-24T00:00:00Z", "2026-11-24T01:00:00Z"], wind: [10, 20], gust: [20, 30], windDir: [359, 1], wave: [1, 2], waveDir: [90, 110] };
describe("point-only animated weather", () => {
  it("interpolates all numeric values between adjacent hours", () => {
    expect(interpolatedForecast(series, Date.parse("2026-11-24T00:30:00Z"))).toMatchObject({ wind: 15, gust: 25, wave: 1.5, windDir: 0, waveDir: 100, interpolated: true });
  });
  it("crosses north without an artificial directional jump", () => { expect(interpolateDirection(359, 1, .5)).toBe(0); expect(interpolateDirection(1, 359, .5)).toBe(0); });
  it("uses opposite direction for physical movement", () => { expect(movementDirection(0)).toBe(180); expect(movementDirection(270)).toBe(90); });
  it("does not invent missing or out-of-range observations", () => {
    expect(interpolatedForecast({ ...series, wind: [10, null] }, Date.parse("2026-11-24T00:30:00Z"))?.wind).toBeNull();
    expect(interpolatedForecast(series, Date.parse("2026-11-24T02:00:00Z"))).toBeNull();
    expect(interpolatedForecast({ ...series, time: [series.time[0] ?? "", "2026-11-24T02:00:00Z"] }, Date.parse("2026-11-24T00:30:00Z"))).toBeNull();
  });
  it("returns identical graph and animation values at exact and interpolated times", () => {
    for (const time of [...series.time, "2026-11-24T00:30:00Z"]) expect(selectedForecast(series, time, undefined)).toEqual(interpolatedForecast(series, Date.parse(time)));
  });
});