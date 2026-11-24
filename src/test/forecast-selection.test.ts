import { describe, expect, it } from "vitest";
import { selectedForecast } from "@/lib/forecast-selection";
import type { Series } from "@/lib/weather";

const series: Series = { time: ["2026-11-24T01:00:00Z", "2026-11-24T02:00:00Z"], wind: [7, 15], gust: [11, 22], windDir: [0, 90], wave: [.2, 1.4], waveDir: [90, 180] };
describe("forecast display selection", () => {
  it("updates every indicator to the same selected hour", () => {
    expect(selectedForecast(series, "2026-11-24T02:00:00Z", 0)).toEqual({ index: 1, time: "2026-11-24T02:00:00.000Z", interpolated: false, wind: 15, gust: 22, windDir: 90, wave: 1.4, waveDir: 180 });
  });
  it("keeps ETA selection when no manual hour is chosen", () => {
    expect(selectedForecast(series, null, Date.parse("2026-11-24T01:10:00Z"))?.wind).toBe(7);
  });
  it("never replaces an unavailable hour with another forecast", () => {
    expect(selectedForecast(series, "2026-11-25T02:00:00Z", 0)).toBeNull();
  });
});