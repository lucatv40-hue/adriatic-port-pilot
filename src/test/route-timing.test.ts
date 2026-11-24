import { describe, expect, it } from "vitest";
import { routeSchedule, anchoredSchedule, forecastAtArrival, localDepartureValue, departureTimestamp } from "@/lib/route-timing";
import { parseForecastSeries, samplePoints } from "@/lib/weather";

const departure = Date.parse("2026-11-23T09:00:00Z");
const series = parseForecastSeries(
  { time: [departure / 1000, departure / 1000 + 3600, departure / 1000 + 7200, departure / 1000 + 10800], wind_speed_10m: [15, 18, 22, 30], wind_gusts_10m: [20, 25, 28, 35], wind_direction_10m: [0, 45, 90, 180] },
  { time: [departure / 1000 + 3600, departure / 1000 + 7200, departure / 1000 + 10800], wave_height: [0.5, 1, 2], wave_direction: [45, 90, 180] },
);
describe("orari e meteo di passaggio", () => {
  const points = samplePoints({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, 5);
  it("l'ora scelta al punto 1 è la partenza e il punto 2 aggiunge il tempo di navigazione", () => {
    const stops = anchoredSchedule(points, 10, 0, departure);
    expect(stops[0]?.arrival).toBe(departure);
    expect(stops[1]?.arrival).toBeCloseTo(departure + 1.5010115183 * 3_600_000, -1);
  });
  it("l'ora scelta al punto 3 ricalcola avanti e indietro", () => {
    const stops = anchoredSchedule(points, 10, 2, departure);
    expect(stops[2]?.arrival).toBe(departure);
    expect(stops[3]?.arrival).toBeCloseTo(departure + 1.5010115183 * 3_600_000, -1);
    expect(stops[1]?.arrival).toBeCloseTo(departure - 1.5010115183 * 3_600_000, -1);
    expect(stops[0]?.arrival).toBeCloseTo(departure - 3.0020230366 * 3_600_000, -1);
  });
  it("un nuovo riferimento sostituisce quello precedente", () => {
    const initial = anchoredSchedule(points, 10, 0, departure);
    const chosen = departure + 4 * 3_600_000;
    const updated = anchoredSchedule(points, 10, 1, chosen);
    expect(updated[1]?.arrival).toBe(chosen);
    expect(updated[2]?.arrival).toBeCloseTo(chosen + 1.5010115183 * 3_600_000, -1);
    expect(updated[0]?.arrival).not.toBe(initial[0]?.arrival);
  });
  it("cambiare velocità conserva l'ora del riferimento", () => {
    const stops = anchoredSchedule(points, 20, 2, departure);
    expect(stops[2]?.arrival).toBe(departure);
    expect(stops[3]?.arrival).toBeCloseTo(departure + .75050575915 * 3_600_000, -1);
  });
  it("calcola 5 tappe a velocità costante in nodi", () => {
    const stops = routeSchedule(samplePoints({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), departure, 10);
    expect(stops).toHaveLength(5);
    expect(stops[0]?.arrival).toBe(departure);
    expect((stops[2]?.arrival ?? 0) - departure).toBeCloseTo(3.0020230366 * 3_600_000, -1);
    expect((stops[4]?.distanceNm ?? 0)).toBeCloseTo(60.04046, 4);
    const faster = routeSchedule(samplePoints({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), departure, 20);
    expect((faster[4]?.arrival ?? 0) - departure).toBeCloseTo(((stops[4]?.arrival ?? 0) - departure) / 2, 0);
  });
  it("dopo 3 ore mostra 30 nodi, non i 15 della partenza", () => {
    expect(forecastAtArrival(series, departure)?.wind).toBe(15);
    expect(forecastAtArrival(series, departure + 3 * 3_600_000)).toMatchObject({ wind: 30, gust: 35, windDir: 180, wave: 2, waveDir: 180 });
  });
  it("sceglie l'ora più vicina al passaggio", () => {
    expect(forecastAtArrival(series, departure + 40 * 60_000)?.wind).toBe(18);
  });
  it("fuori copertura non usa la prima o ultima previsione", () => {
    expect(forecastAtArrival(series, departure - 1)).toBeNull();
    expect(forecastAtArrival(series, departure + 48 * 3_600_000)).toBeNull();
  });
  it("allinea vento e onde per orario, non per indice", () => {
    expect(forecastAtArrival(series, departure)?.wave).toBeNull();
    expect(forecastAtArrival(series, departure + 3_600_000)?.wave).toBe(0.5);
  });
  it("gestisce dati assenti e velocità non valida", () => {
    expect(forecastAtArrival(parseForecastSeries(undefined, undefined), departure)).toBeNull();
    expect(parseForecastSeries({ time: [1e30, null, "bad"] }, undefined).time).toEqual([]);
    expect(routeSchedule([{ lat: 45, lon: 12 }], departure, 0)).toEqual([]);
    expect(routeSchedule([{ lat: 45, lon: 12 }], NaN, 6)).toEqual([]);
  });
  it("il campo partenza usa Europe/Rome indipendentemente dal dispositivo", () => {
    expect(localDepartureValue(new Date("2026-11-23T09:30:00Z"))).toBe("2026-11-23T10:30");
    expect(departureTimestamp("2026-11-23T10:30")).toBe(Date.parse("2026-11-23T09:30:00Z"));
    expect(departureTimestamp("2026-07-23T10:30")).toBe(Date.parse("2026-07-23T08:30:00Z"));
    expect(departureTimestamp("2026-03-29T02:30")).toBeNaN();
  });
});