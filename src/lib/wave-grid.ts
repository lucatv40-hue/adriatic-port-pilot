// Copernicus Marine wave grid (published by GitHub Actions next to the wind grid).
export type WaveGrid = { lat0: number; lon0: number; dLat: number; dLon: number; ny: number; nx: number; times: string[]; h: (number | null)[][]; d: (number | null)[][] };

/** Nearest valid sea cell (searches 2 cells around so coastal ports still get a value). */
export function waveAt(g: WaveGrid, lat: number, lon: number, time: string): { h: number | null; d: number | null } {
  const t = g.times.findIndex((x) => Date.parse(x) === Date.parse(time));
  if (t < 0) return { h: null, d: null };
  const fy = (lat - g.lat0) / g.dLat, fx = (lon - g.lon0) / g.dLon;
  const cy = Math.round(fy), cx = Math.round(fx);
  let best: { h: number | null; d: number | null; dist: number } | null = null;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    if (y < 0 || x < 0 || y >= g.ny || x >= g.nx) continue;
    const h = g.h[t]?.[y * g.nx + x] ?? null;
    if (h === null) continue;
    const dist = (y - fy) ** 2 + (x - fx) ** 2;
    if (!best || dist < best.dist) best = { h, d: g.d[t]?.[y * g.nx + x] ?? null, dist };
  }
  return best ? { h: best.h, d: best.d } : { h: null, d: null };
}

let pending: Promise<WaveGrid | null> | null = null;
let loadedAt = 0;
export function loadWaveGrid(base: string): Promise<WaveGrid | null> {
  if (!pending || Date.now() - loadedAt > 15 * 60_000) {
    loadedAt = Date.now();
    pending = fetch(`${base}/waves.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => (g && Array.isArray(g.times) && Array.isArray(g.h) && Number.isFinite(g.nx) ? (g as WaveGrid) : null))
      .catch(() => null);
    void pending.then((g) => { if (!g) pending = null; });
  }
  return pending;
}
