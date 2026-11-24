import type { PointForecast } from "@/lib/weather";
import type { RouteStop } from "@/lib/route-timing";
import { interpolatedForecast, interpolateDirection } from "@/lib/forecast-animation";

type Point = { lat: number; lon: number };
export type BoatPosition = Point & { segment: number; fraction: number; distanceNm: number; heading: number; arrived: boolean };

export function bearing(a: Point, b: Point) {
  const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/** Boat position along the route geometry at simulated time, by constant speed between stops. */
export function boatAt(points: Point[], stops: RouteStop[], time: number): BoatPosition | null {
  const first = stops[0], last = stops.at(-1);
  if (points.length < 2 || stops.length !== points.length || !first || !last || !Number.isFinite(time)) return null;
  const t = Math.max(first.arrival, Math.min(last.arrival, time));
  let i = stops.findIndex((s, k) => k > 0 && t <= s.arrival); if (i < 1) i = 1;
  const a = points[i - 1]!, b = points[i]!, sa = stops[i - 1]!, sb = stops[i]!;
  const span = sb.arrival - sa.arrival, f = span > 0 ? (t - sa.arrival) / span : 1;
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, segment: i - 1, fraction: f, distanceNm: sa.distanceNm + (sb.distanceNm - sa.distanceNm) * f, heading: bearing(a, b), arrived: t >= last.arrival };
}

/** Re-places the boat on a sail leg a→tack→b (one tack), keeping the same fraction of the leg by distance. */
export function alongSailLeg(boat: BoatPosition, a: Point, tack: Point | null, b: Point): BoatPosition {
  if (!tack) return boat;
  const d = (p: Point, q: Point) => Math.hypot(q.lat - p.lat, (q.lon - p.lon) * Math.cos(p.lat * Math.PI / 180));
  const d1 = d(a, tack), d2 = d(tack, b), x = boat.fraction * (d1 + d2);
  if (d1 + d2 === 0) return boat;
  if (x <= d1) { const f = d1 ? x / d1 : 1; return { ...boat, lat: a.lat + (tack.lat - a.lat) * f, lon: a.lon + (tack.lon - a.lon) * f, heading: bearing(a, tack) }; }
  const f = d2 ? (x - d1) / d2 : 1;
  return { ...boat, lat: tack.lat + (b.lat - tack.lat) * f, lon: tack.lon + (b.lon - tack.lon) * f, heading: bearing(tack, b) };
}

export type VoyageWeather = { wind: number | null; gust: number | null; windDir: number | null; wave: number | null; waveDir: number | null; estimate: boolean };

/** Weather at the boat: each neighbouring forecast point read at the same simulated time, then blended by position. Outside the forecast horizon → null (never extended). */
export function voyageWeather(forecasts: PointForecast[], boat: BoatPosition, time: number): VoyageWeather | null {
  const A = forecasts[boat.segment], B = forecasts[boat.segment + 1];
  if (!A || !B) return null;
  const fa = interpolatedForecast(A.series, time), fb = interpolatedForecast(B.series, time);
  if (!fa || !fb) return null;
  const f = boat.fraction;
  const mix = (a: number | null, b: number | null) => f <= 0 ? a : f >= 1 ? b : a == null || b == null ? null : a + (b - a) * f;
  const dir = (a: number | null, b: number | null) => f <= 0 ? a : f >= 1 ? b : a == null || b == null ? null : interpolateDirection(a, b, f);
  return { wind: mix(fa.wind, fb.wind), gust: mix(fa.gust, fb.gust), windDir: dir(fa.windDir, fb.windDir), wave: mix(fa.wave, fb.wave), waveDir: dir(fa.waveDir, fb.waveDir), estimate: (f > 0 && f < 1) || fa.interpolated || fb.interpolated };
}

/** Wind source relative to bow: 0 = dead ahead, 90 = starboard beam, 270 = port beam. */
export function relativeWind(windDir: number, heading: number) { return (windDir - heading + 360) % 360; }
export function windSide(rel: number) {
  if (rel <= 30 || rel >= 330) return "di prua"; if (rel >= 150 && rel <= 210) return "di poppa";
  const side = rel < 180 ? "dritta" : "sinistra", a = rel < 180 ? rel : 360 - rel;
  return a < 70 ? `al mascone di ${side}` : a <= 110 ? `al traverso di ${side}` : `al giardinetto di ${side}`;
}
