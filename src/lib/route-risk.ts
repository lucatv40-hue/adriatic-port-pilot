import type { PointForecast } from "@/lib/weather";
import type { Thresholds } from "@/lib/thresholds";
import { distanceNm, forecastAtArrival, routeSchedule } from "@/lib/route-timing";

export type RoutePoint = { lat: number; lon: number };
export type RouteSection = {
  a: RoutePoint;
  b: RoutePoint;
  entry: number;
  exit: number;
  maxWind: number;
  maxGust: number;
  maxWave: number | null;
  critical: boolean;
  score: number;
};

/** Adds forecast samples between the visible waypoints, preserving every original waypoint. */
export function denseRoutePoints(points: RoutePoint[], spacingNm = 4, maxPoints = 31): RoutePoint[] {
  if (points.length < 2) return [...points];
  const legs = points.slice(0, -1).map((point, i) => distanceNm(point, points[i + 1]!));
  const total = legs.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) return [...points];
  const targetSegments = Math.min(maxPoints - 1, Math.max(legs.length, Math.round(total / spacingNm)));
  const counts = legs.map(() => 1);
  for (let remaining = targetSegments - legs.length; remaining > 0; remaining--) {
    let split = 0;
    for (let i = 1; i < legs.length; i++) {
      if (legs[i]! / counts[i]! > legs[split]! / counts[split]!) split = i;
    }
    counts[split]! += 1;
  }
  const out: RoutePoint[] = [];
  points.slice(0, -1).forEach((a, i) => {
    const b = points[i + 1]!, count = counts[i]!;
    for (let step = 0; step < count; step++) {
      const fraction = step / count;
      out.push({ lat: +(a.lat + (b.lat - a.lat) * fraction).toFixed(5), lon: +(a.lon + (b.lon - a.lon) * fraction).toFixed(5) });
    }
  });
  out.push(points.at(-1)!);
  return out;
}

/** Finds the worst leg, including conditions sampled halfway through its crossing. */
export function worstRouteSection(points: RoutePoint[], forecasts: PointForecast[], departure: number, speedKn: number, thresholds: Thresholds): RouteSection | null {
  const stops = routeSchedule(points, departure, speedKn);
  if (stops.length < 2 || forecasts.length !== points.length) return null;
  const atStops = stops.map((stop, i) => {
    const forecast = forecasts[i];
    return forecast ? forecastAtArrival(forecast.series, stop.arrival) : null;
  });
  let worst: RouteSection | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const entry = stops[i]!, exit = stops[i + 1]!, first = atStops[i], last = atStops[i + 1];
    if (!first || !last || first.wind === null || first.gust === null || last.wind === null || last.gust === null) continue;
    const halfway = (entry.arrival + exit.arrival) / 2;
    const middleA = forecastAtArrival(forecasts[i]!.series, halfway);
    const middleB = forecastAtArrival(forecasts[i + 1]!.series, halfway);
    const samples = [first, last, middleA, middleB].filter((sample) => sample !== null && sample.wind !== null && sample.gust !== null);
    const winds = samples.map((sample) => sample!.wind!);
    const gusts = samples.map((sample) => sample!.gust!);
    const waves = samples.map((sample) => sample!.wave).filter((wave): wave is number => wave !== null && wave !== undefined);
    const maxWind = Math.max(...winds), maxGust = Math.max(...gusts), maxWave = waves.length ? Math.max(...waves) : null;
    const critical = maxGust > thresholds.wind || (maxWave !== null && maxWave > thresholds.wave);
    const score = Math.max(maxWind / Math.max(1, thresholds.wind), maxGust / Math.max(1, thresholds.wind * 1.3), maxWave === null ? 0 : maxWave / Math.max(0.1, thresholds.wave));
    if (!worst || score > worst.score) worst = { a: points[i]!, b: points[i + 1]!, entry: entry.arrival, exit: exit.arrival, maxWind, maxGust, maxWave, critical, score };
  }
  return worst;
}
