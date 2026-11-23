import type { Series } from "@/lib/weather";

type Point = { lat: number; lon: number };
export type RouteStop = { distanceNm: number; arrival: number };

export function distanceNm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function routeSchedule(points: Point[], departure: number, speedKn: number): RouteStop[] {
  if (!Number.isFinite(departure) || !Number.isFinite(speedKn) || speedKn <= 0) return [];
  let distance = 0;
  return points.map((p, i) => {
    const previous = points[i - 1];
    if (previous) distance += distanceNm(previous, p);
    return { distanceNm: distance, arrival: departure + distance / speedKn * 3_600_000 };
  });
}

// Select only a covered forecast hour, never substitute a distant or expired forecast.
export function forecastAtArrival(series: Series, arrival: number) {
  const times = series.time.map((time) => Date.parse(time));
  const first = times[0], last = times.at(-1);
  if (!Number.isFinite(arrival) || first === undefined || last === undefined || arrival < first || arrival > last) return null;
  let index = -1, difference = Infinity;
  times.forEach((time, i) => {
    const delta = Math.abs(time - arrival);
    if (Number.isFinite(time) && delta < difference) { index = i; difference = delta; }
  });
  if (index < 0 || difference > 30 * 60_000) return null;
  return {
    index, time: series.time[index], wind: series.wind[index] ?? null,
    gust: series.gust[index] ?? null, windDir: series.windDir[index] ?? null,
    wave: series.wave[index] ?? null, waveDir: series.waveDir[index] ?? null,
  };
}

export function localDepartureValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatRouteTime(value: number | string): string {
  return new Date(value).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}