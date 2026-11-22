export interface Series { time: string[]; wind: (number | null)[]; gust: (number | null)[]; windDir: (number | null)[]; wave: (number | null)[]; waveDir: (number | null)[] }
export interface PointForecast { lat: number; lon: number; series: Series; windOk: boolean; waveOk: boolean }

export function samplePoints(a: { lat: number; lon: number }, b: { lat: number; lon: number }, n = 5) {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { lat: +(a.lat + (b.lat - a.lat) * t).toFixed(4), lon: +(a.lon + (b.lon - a.lon) * t).toFixed(4) }; });
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => num(Array.isArray(v) ? v[i] : null));
async function safe(url: string): Promise<unknown[]> {
  try { const r = await fetch(url); if (!r.ok) return []; const j = await r.json(); return Array.isArray(j) ? j : [j]; } catch { return []; }
}
type H = { hourly?: Record<string, unknown> };

export async function fetchRouteForecast(pts: { lat: number; lon: number }[]): Promise<PointForecast[]> {
  const lat = pts.map((p) => p.lat).join(","), lon = pts.map((p) => p.lon).join(",");
  const q = `latitude=${lat}&longitude=${lon}&forecast_hours=48&timezone=Europe%2FRome`;
  const [W, M] = await Promise.all([
    safe(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn`),
    safe(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height,wave_direction`),
  ]);
  return pts.map((p, i) => {
    const w = (W[i] as H | undefined)?.hourly, m = (M[i] as H | undefined)?.hourly;
    const time = ((w?.["time"] ?? m?.["time"]) as string[] | undefined) ?? [];
    const n = time.length;
    const series = { time, wind: arr(w?.["wind_speed_10m"], n), gust: arr(w?.["wind_gusts_10m"], n), windDir: arr(w?.["wind_direction_10m"], n), wave: arr(m?.["wave_height"], n), waveDir: arr(m?.["wave_direction"], n) };
    return { ...p, series, windOk: series.wind.some((x) => x !== null), waveOk: series.wave.some((x) => x !== null) };
  });
}
export const maxOf = (a: (number | null)[]) => { const v = a.filter((x): x is number => x !== null); return v.length ? Math.max(...v) : null; };
export const compass = (d: number | null) => (d === null ? "–" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(d / 45) % 8]);
