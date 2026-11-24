// Pure sail-routing helpers: per leg, compare the direct course with a single-tack/gybe
// pair chosen for the best VMC (speed made good towards the leg's end) on the forecast wind.
type Point = { lat: number; lon: number };
export interface SailLeg { from: number; tack: Point | null; twd: number | null; timeH: number; directTimeH: number; distanceNm: number; vmc: number; kind: "diretto" | "bolina" | "poppa" | "n/d" }

/** Simplified cruising polar: fraction of the user's mean speed at a given true wind angle. */
export function polar(twa: number): number {
  const a = Math.abs(((twa + 540) % 360) - 180);
  const table: [number, number][] = [[0, 0], [38, 0], [45, 0.75], [60, 0.9], [90, 1], [120, 1], [150, 0.85], [180, 0.7]];
  for (let i = 1; i < table.length; i++) {
    const [a0, f0] = table[i - 1]!, [a1, f1] = table[i]!;
    if (a <= a1) return f0 + (f1 - f0) * (a - a0) / (a1 - a0);
  }
  return 0.7;
}
const rad = Math.PI / 180;
function toXY(o: Point, p: Point) { return { x: (p.lon - o.lon) * 60 * Math.cos(o.lat * rad), y: (p.lat - o.lat) * 60 }; }
function fromXY(o: Point, x: number, y: number): Point { return { lat: o.lat + y / 60, lon: o.lon + x / (60 * Math.cos(o.lat * rad)) }; }
const unit = (h: number) => ({ x: Math.sin(h * rad), y: Math.cos(h * rad) });

/** twd = direction the wind blows FROM (degrees). */
export function sailLeg(a: Point, b: Point, twd: number | null, speedKn: number, index = 0): SailLeg {
  const d = toXY(a, b), dist = Math.hypot(d.x, d.y);
  const brg = (Math.atan2(d.x, d.y) / rad + 360) % 360;
  const empty = { from: index, tack: null, twd, distanceNm: dist };
  if (twd === null || !(speedKn > 0) || dist === 0) return { ...empty, timeH: dist / speedKn, directTimeH: dist / speedKn, vmc: speedKn, kind: "n/d" };
  const vDirect = speedKn * polar(brg - twd);
  const directTimeH = vDirect > 0 ? dist / vDirect : Infinity;
  let best = { timeH: directTimeH, tack: null as Point | null, h1: brg };
  for (let h1 = 0; h1 < 360; h1 += 1) for (const off of [-1, 1]) {
    // Second heading mirrored about the wind axis (other tack/gybe).
    const h2 = (2 * twd - h1 + 360) % 360;
    if (off < 0) continue;
    const u1 = unit(h1), u2 = unit(h2), det = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(det) < 1e-6) continue;
    const s1 = (d.x * u2.y - d.y * u2.x) / det, s2 = (u1.x * d.y - u1.y * d.x) / det;
    if (s1 < 0 || s2 < 0) continue;
    const v1 = speedKn * polar(h1 - twd), v2 = speedKn * polar(h2 - twd);
    if (v1 <= 0 || v2 <= 0) continue;
    const t = s1 / v1 + s2 / v2;
    if (t < best.timeH * 0.98) best = { timeH: t, tack: fromXY(a, u1.x * s1, u1.y * s1), h1 };
  }
  const offWind = Math.abs(((brg - twd + 540) % 360) - 180);
  const kind = best.tack ? (offWind < 90 ? "bolina" : "poppa") : "diretto";
  return { ...empty, tack: best.tack, timeH: best.timeH, directTimeH, vmc: Number.isFinite(best.timeH) ? dist / best.timeH : 0, kind };
}

export function sailRoute(points: Point[], twds: (number | null)[], speedKn: number) {
  const legs = points.slice(1).map((b, i) => sailLeg(points[i]!, b, twds[i] ?? null, speedKn, i));
  const path: Point[] = points.length ? [points[0]!] : [];
  legs.forEach((l, i) => { if (l.tack) path.push(l.tack); path.push(points[i + 1]!); });
  return { legs, path, timeH: legs.reduce((s, l) => s + l.timeH, 0) };
}
