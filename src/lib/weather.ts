import { loadWaveGrid, waveAt } from "./wave-grid";
// Waves: Copernicus Marine (open licence, commercial use allowed) via the gh-pages grid.
const WAVE_GRID_URL = "https://lucatv40-hue.github.io/adriatic-port-pilot";
export interface Series { time: string[]; wind: (number | null)[]; gust: (number | null)[]; windDir: (number | null)[]; wave: (number | null)[]; waveDir: (number | null)[] }
export type WindModel = "icon2i";
export interface WindSource { model: WindModel; fetchedAt: string; modelUpdatedAt: string | null; fallback: boolean; complete: boolean; gridLat: number | null; gridLon: number | null }
export interface PointForecast { lat: number; lon: number; series: Series; windOk: boolean; waveOk: boolean; windSource?: WindSource }

export function samplePoints(a: { lat: number; lon: number }, b: { lat: number; lon: number }, n = 5) {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { lat: +(a.lat + (b.lat - a.lat) * t).toFixed(4), lon: +(a.lon + (b.lon - a.lon) * t).toFixed(4) }; });
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => num(Array.isArray(v) ? v[i] : null));
async function safe(url: string): Promise<unknown[]> {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(12_000) }); if (!r.ok) return []; const j: unknown = await r.json(); return Array.isArray(j) ? j : [j]; } catch { return []; }
}
type H = { hourly?: Record<string, unknown>; hourly_units?: Record<string, unknown>; latitude?: number; longitude?: number };
const requests = new Map<string, { expires: number; fetchedAt: string; promise: Promise<unknown[]> }>();
function cached(url: string): Promise<unknown[]> {
  const existing = requests.get(url);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = safe(url).then((rows) => { if (rows.length === 0) requests.delete(url); return rows; });
  if (requests.size >= 64) { const first = requests.keys().next().value; if (first) requests.delete(first); }
  requests.set(url, { expires: Date.now() + 15 * 60_000, fetchedAt: new Date().toISOString(), promise });
  return promise;
}
function row(value: unknown): H | undefined {
  return value && typeof value === "object" ? value as H : undefined;
}
export function forecastWindow(now: number) {
  const start = Math.floor(now / 3_600_000) * 3_600_000;
  const end = Math.ceil((now + 48 * 3_600_000) / 3_600_000) * 3_600_000;
  const times = Array.from({ length: (end - start) / 3_600_000 + 1 }, (_, i) => (start + i * 3_600_000) / 1000);
  return { start, end, times };
}
function localWindCell(data: H | undefined, point: { lat: number; lon: number }): boolean {
  if (!data?.hourly || data.hourly_units?.["wind_speed_10m"] !== "kn" || data.hourly_units?.["wind_gusts_10m"] !== "kn" || data.hourly_units?.["wind_direction_10m"] !== "°") return false;
  // An out-of-domain model may return a distant boundary cell, not local weather.
  if (num(data.latitude) === null || num(data.longitude) === null || Math.abs((data.latitude ?? 0) - point.lat) > 0.2 || Math.abs((data.longitude ?? 0) - point.lon) > 0.3) return false;
  return true;
}
export function completeWind(data: H | undefined, times: number[], point: { lat: number; lon: number }): boolean {
  if (!localWindCell(data, point) || !data?.hourly) return false;
  const actual = data.hourly["time"];
  if (!Array.isArray(actual)) return false;
  return times.every((time) => {
    const index = actual.indexOf(time);
    return index >= 0 && ["wind_speed_10m", "wind_gusts_10m", "wind_direction_10m"].every((key) => {
      const values = data.hourly?.[key];
      return Array.isArray(values) && num(values[index]) !== null;
    });
  });
}

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

export async function fetchRouteForecast(pts: { lat: number; lon: number }[], now = Date.now()): Promise<PointForecast[]> {
  if (pts.length === 0) return [];
  const lat = pts.map((p) => p.lat).join(","), lon = pts.map((p) => p.lon).join(",");
  const window = forecastWindow(now);
  const hour = (time: number) => new Date(time).toISOString().slice(0, 16);
  const q = `latitude=${lat}&longitude=${lon}&start_hour=${hour(window.start)}&end_hour=${hour(window.end)}&timezone=UTC&timeformat=unixtime`;
  const windUrl = `https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&models=italia_meteo_arpae_icon_2i&cell_selection=sea`;
  const [W, M] = await Promise.all([
    cached(windUrl),
    loadWaveGrid(WAVE_GRID_URL),
  ]);
  return pts.map((p, i) => {
    // Keep covered ICON-2I hours; invalid cells and missing values never use another model.
    const selected = row(W[i]);
    const parsed = parseForecastSeries(localWindCell(selected, p) ? selected?.hourly : undefined, undefined);
    const time = window.times.map((t) => new Date(t * 1000).toISOString());
    const indices = new Map(parsed.time.map((t, index) => [t, index]));
    const values = (key: Exclude<keyof Series, "time">) => time.map((t) => { const index = indices.get(t); return index === undefined ? null : parsed[key][index] ?? null; });
    const series: Series = { time, wind: values("wind"), gust: values("gust"), windDir: values("windDir"), wave: time.map((t) => (M ? waveAt(M, p.lat, p.lon, t).h : null)), waveDir: time.map((t) => (M ? waveAt(M, p.lat, p.lon, t).d : null)) };
    return { ...p, series, windOk: series.wind.some((x) => x !== null), waveOk: series.wave.some((x) => x !== null), windSource: { model: "icon2i", fallback: false, complete: completeWind(selected, window.times, p), fetchedAt: requests.get(windUrl)?.fetchedAt ?? new Date(now).toISOString(), modelUpdatedAt: null, gridLat: num(selected?.latitude), gridLon: num(selected?.longitude) } };
  });
}
export const maxOf = (a: (number | null)[]) => { const v = a.filter((x): x is number => x !== null); return v.length ? Math.max(...v) : null; };
export const compass = (d: number | null) => (d === null ? "–" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(d / 45) % 8]);
