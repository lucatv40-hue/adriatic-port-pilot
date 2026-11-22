export interface Waypoint { lat: number; lon: number; wind: number; gust: number; dir: number; wave: number }
export interface RouteWeather { points: Waypoint[]; tide: { time: string; level: number }[] }

export function samplePoints(a: { lat: number; lon: number }, b: { lat: number; lon: number }, n = 5) {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { lat: +(a.lat + (b.lat - a.lat) * t).toFixed(4), lon: +(a.lon + (b.lon - a.lon) * t).toFixed(4) }; });
}
const maxNext = (arr: (number | null)[], h = 12) => Math.max(0, ...arr.slice(0, h).map((x) => x ?? 0));

export async function fetchRouteWeather(pts: { lat: number; lon: number }[]): Promise<RouteWeather> {
  const lat = pts.map((p) => p.lat).join(","), lon = pts.map((p) => p.lon).join(",");
  const [w, m] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&forecast_hours=12&timezone=Europe%2FRome`).then((r) => r.json()),
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,sea_level_height_msl&forecast_days=2&timezone=Europe%2FRome`).then((r) => r.json()),
  ]);
  const W = Array.isArray(w) ? w : [w], M = Array.isArray(m) ? m : [m];
  const points = pts.map((p, i) => ({
    ...p,
    wind: Math.round(maxNext(W[i]?.hourly?.wind_speed_10m ?? [])),
    gust: Math.round(maxNext(W[i]?.hourly?.wind_gusts_10m ?? [])),
    dir: W[i]?.hourly?.wind_direction_10m?.[0] ?? 0,
    wave: +maxNext(M[i]?.hourly?.wave_height ?? []).toFixed(1),
  }));
  const last = M[M.length - 1]?.hourly;
  const tide = (last?.time ?? []).slice(0, 24).map((t: string, i: number) => ({ time: t, level: last.sea_level_height_msl?.[i] ?? 0 }));
  return { points, tide };
}
export const compass = (d: number) => ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(d / 45) % 8];
