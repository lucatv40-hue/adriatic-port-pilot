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

export function parseForecastSeries(w: H["hourly"], m: H["hourly"]): Series {
  const timestamps = (hourly: H["hourly"]) => Array.isArray(hourly?.["time"])
    ? hourly["time"].map((v: unknown) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return "";
      const date = new Date(v * 1000);
      return Number.isFinite(date.getTime()) ? date.toISOString() : "";
    })
    : [];
  const windTimes = timestamps(w), marineTimes = timestamps(m);
  const time = [...new Set([...windTimes, ...marineTimes].filter(Boolean))].sort();
  const values = (hourly: H["hourly"], times: string[], key: string) => {
    const data = arr(hourly?.[key], times.length);
    const byTime = new Map(times.map((t, i) => [t, data[i] ?? null]));
    return time.map((t) => byTime.get(t) ?? null);
  };
  return { time, wind: values(w, windTimes, "wind_speed_10m"), gust: values(w, windTimes, "wind_gusts_10m"), windDir: values(w, windTimes, "wind_direction_10m"), wave: values(m, marineTimes, "wave_height"), waveDir: values(m, marineTimes, "wave_direction") };
}

export async function fetchRouteForecast(pts: { lat: number; lon: number }[]): Promise<PointForecast[]> {
  const lat = pts.map((p) => p.lat).join(","), lon = pts.map((p) => p.lon).join(",");
  const q = `latitude=${lat}&longitude=${lon}&forecast_hours=48&timezone=UTC&timeformat=unixtime`;
  const [W, M] = await Promise.all([
    safe(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn`),
    safe(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height,wave_direction`),
  ]);
  return pts.map((p, i) => {
    const w = (W[i] as H | undefined)?.hourly, m = (M[i] as H | undefined)?.hourly;
    const series = parseForecastSeries(w, m);
    return { ...p, series, windOk: series.wind.some((x) => x !== null), waveOk: series.wave.some((x) => x !== null) };
  });
}
export const maxOf = (a: (number | null)[]) => { const v = a.filter((x): x is number => x !== null); return v.length ? Math.max(...v) : null; };
export const compass = (d: number | null) => (d === null ? "–" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(d / 45) % 8]);
