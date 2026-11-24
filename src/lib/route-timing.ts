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

/** Anchor any waypoint in UTC; earlier points subtract sailing time. */
export function anchoredSchedule(points: Point[], speedKn: number, point: number, time: number): RouteStop[] {
  const base = routeSchedule(points, 0, speedKn);
  const anchor = base[point];
  if (!anchor || !Number.isFinite(time)) return [];
  return base.map(stop => ({ ...stop, arrival: time + stop.arrival - anchor.arrival }));
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
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function departureTimestamp(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime)) return NaN;
  let utc = wallTime;
  for (let i = 0; i < 3; i++) {
    const displayed = Date.parse(`${localDepartureValue(new Date(utc))}:00Z`);
    utc += wallTime - displayed;
  }
  return localDepartureValue(new Date(utc)) === value ? utc : NaN;
}

export function formatRouteTime(value: number | string): string {
  return new Date(value).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}