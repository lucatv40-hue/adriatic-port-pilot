// Pure GeoJSON builders for the MapLibre chart (/carta). Missing data → no feature, never invented values.
import { sampleWindGrid, type WindGrid } from "@/lib/wind-grid";
import type { WaveGrid } from "@/lib/wave-grid";

type Feature = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] } | { type: "Polygon"; coordinates: [number, number][][] }; properties: Record<string, string | number | boolean | null> };
export type FC = { type: "FeatureCollection"; features: Feature[] };
const fc = (features: Feature[]): FC => ({ type: "FeatureCollection", features });
const pt = (lon: number, lat: number, properties: Feature["properties"]): Feature => ({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties });

/** Wind arrows on a regular lat/lon lattice; `rotate` = direction the wind blows toward. Gusts only if the grid carries them. */
export function windFeatures(g: WindGrid | null, step = 0.15, gust?: (lat: number, lon: number) => number | null): FC {
  if (!g) return fc([]);
  const { west, south, dx, dy, width, height } = g.grid;
  const out: Feature[] = [];
  for (let lat = south; lat <= south + (height - 1) * dy; lat += step)
    for (let lon = west; lon <= west + (width - 1) * dx; lon += step) {
      const w = sampleWindGrid(g, lat, lon);
      if (!w || w.fromDegrees === null) continue;
      out.push(pt(+lon.toFixed(3), +lat.toFixed(3), { kn: Math.round(w.speedKn), from: Math.round(w.fromDegrees), rotate: Math.round((w.fromDegrees + 180) % 360), gust: gust?.(lat, lon) ?? null }));
    }
  return fc(out);
}

export type WaveGridX = WaveGrid & { tp?: (number | null)[][] };
/** Wave height + mean direction (toward = from+180) + peak period Tp when published. */
export function waveFeatures(g: WaveGridX | null, time: string | null, every = 2): FC {
  if (!g || !time) return fc([]);
  const t = g.times.findIndex((x) => Date.parse(x) === Date.parse(time));
  if (t < 0) return fc([]);
  const out: Feature[] = [];
  for (let y = 0; y < g.ny; y += every) for (let x = 0; x < g.nx; x += every) {
    const i = y * g.nx + x, h = g.h[t]?.[i] ?? null;
    if (h === null) continue;
    const d = g.d[t]?.[i] ?? null, tp = g.tp?.[t]?.[i] ?? null;
    out.push(pt(+(g.lon0 + x * g.dLon).toFixed(3), +(g.lat0 + y * g.dLat).toFixed(3), { h, from: d, rotate: d === null ? null : (d + 180) % 360, tp }));
  }
  return fc(out);
}

export type CurrentGrid = { lat0: number; lon0: number; dLat: number; dLon: number; ny: number; nx: number; times: string[]; u: (number | null)[][]; v: (number | null)[][] };
/** Surface current vectors (uo/vo m/s, oceanographic "toward"); speed in knots. */
export function currentFeatures(g: CurrentGrid | null, time: string | null, every = 3): FC {
  if (!g || !time) return fc([]);
  const t = g.times.findIndex((x) => Date.parse(x) === Date.parse(time));
  if (t < 0) return fc([]);
  const out: Feature[] = [];
  for (let y = 0; y < g.ny; y += every) for (let x = 0; x < g.nx; x += every) {
    const i = y * g.nx + x, u = g.u[t]?.[i] ?? null, v = g.v[t]?.[i] ?? null;
    if (u === null || v === null) continue;
    const s = Math.hypot(u, v);
    out.push(pt(+(g.lon0 + x * g.dLon).toFixed(3), +(g.lat0 + y * g.dLat).toFixed(3), { kn: +(s * 3600 / 1852).toFixed(1), rotate: Math.round((Math.atan2(u, v) * 180 / Math.PI + 360) % 360) }));
  }
  return fc(out);
}

export type CapeGrid = { lat0: number; lon0: number; dLat: number; dLon: number; ny: number; nx: number; times: string[]; cape: (number | null)[][] };
/** Convective risk class from CAPE J/kg: ≥2500 alto, ≥1000 moderato, ≥300 basso; below 300 omitted. */
export function capeRisk(j: number): "alto" | "moderato" | "basso" | null {
  return j >= 2500 ? "alto" : j >= 1000 ? "moderato" : j >= 300 ? "basso" : null;
}
export function capeFeatures(g: CapeGrid | null, time: string | null): FC {
  if (!g || !time) return fc([]);
  const t = g.times.findIndex((x) => Date.parse(x) === Date.parse(time));
  if (t < 0) return fc([]);
  const out: Feature[] = [];
  for (let y = 0; y < g.ny; y++) for (let x = 0; x < g.nx; x++) {
    const c = g.cape[t]?.[y * g.nx + x] ?? null; const r = c === null ? null : capeRisk(c);
    if (r) out.push(pt(+(g.lon0 + x * g.dLon).toFixed(3), +(g.lat0 + y * g.dLat).toFixed(3), { cape: c, risk: r }));
  }
  return fc(out);
}

export type NoticeLike = { id: string; title: string; body: string; lat: number; lon: number; radius_km: number; category: string; valid_from: string | null; valid_until: string; issuer: string | null; source_url: string; country?: string | null };
const RED = new Set(["interdizione", "esercitazioni", "meteo"]);
/** Red = prohibition/danger (interdizione, esercitazioni, meteo); yellow = caution. Expired notices are dropped. */
export function noticeLevel(category: string): "rossa" | "gialla" { return RED.has(category) ? "rossa" : "gialla"; }
export function circlePolygon(lat: number, lon: number, km: number, n = 48): [number, number][] {
  const r = Math.max(0.3, km), ring: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    ring.push([+(lon + (r / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(a)).toFixed(5), +(lat + (r / 110.574) * Math.cos(a)).toFixed(5)]);
  }
  return ring;
}
export function noticeFeatures(list: NoticeLike[], now = Date.now()): FC {
  return fc(list.filter((n) => Date.parse(n.valid_until) >= now).map((n) => ({
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [circlePolygon(n.lat, n.lon, n.radius_km)] },
    properties: { id: n.id, title: n.title, body: n.body.slice(0, 280), level: noticeLevel(n.category), category: n.category, from: n.valid_from, until: n.valid_until, issuer: n.issuer, url: n.source_url },
  })));
}
