// Pure sail-routing helpers: per leg, compare the direct course with a single-tack/gybe
// pair chosen for the best VMC (speed made good towards the leg's end) on the forecast wind.
import { crossesLand, inLagoon, onLand } from "@/lib/sea-route";
type Point = { lat: number; lon: number };
export type SailMode = "vmc" | "comfort";
export const COMFORT_MIN_TWA = 60;
export interface SailLeg { from: number; tack: Point | null; twd: number | null; timeH: number; directTimeH: number; distanceNm: number; vmc: number; kind: "diretto" | "bolina" | "poppa" | "n/d" }

/** Simplified cruising polar: fraction of the user's mean speed at a given true wind angle. */
export function polar(twa: number): number {
  const a = Math.abs(((twa + 540) % 360) - 180);
  const table: [number, number][] = [[0, 0], [38, 0], [45, 0.75], [60, 0.9], [90, 1], [120, 1], [150, 0.85], [180, 0.7]];
  for (let i = 1; i < table.length; i++) {
    const previous = table[i - 1], next = table[i];
    if (!previous || !next) continue;
    const [a0, f0] = previous, [a1, f1] = next;
    if (a <= a1) return f0 + (f1 - f0) * (a - a0) / (a1 - a0);
  }
  return 0.7;
}
const rad = Math.PI / 180;
function toXY(o: Point, p: Point) { return { x: (p.lon - o.lon) * 60 * Math.cos(o.lat * rad), y: (p.lat - o.lat) * 60 }; }
function fromXY(o: Point, x: number, y: number): Point { return { lat: o.lat + y / 60, lon: o.lon + x / (60 * Math.cos(o.lat * rad)) }; }
const unit = (h: number) => ({ x: Math.sin(h * rad), y: Math.cos(h * rad) });
const windAngle = (heading: number, twd: number) => Math.abs(((heading - twd + 540) % 360) - 180);

/** twd = direction the wind blows FROM (degrees). */
export function sailLeg(a: Point, b: Point, twd: number | null, speedKn: number, index = 0, mode: SailMode = "vmc"): SailLeg {
  const d = toXY(a, b), dist = Math.hypot(d.x, d.y);
  const brg = (Math.atan2(d.x, d.y) / rad + 360) % 360;
  const empty = { from: index, tack: null, twd, distanceNm: dist };
  if (twd === null || !(speedKn > 0) || dist === 0) return { ...empty, timeH: dist / speedKn, directTimeH: dist / speedKn, vmc: speedKn, kind: "n/d" };
  // Inside a lagoon channel or on a leg that touches land, no tacking: follow the channel.
  if (inLagoon(a) || inLagoon(b)) return { ...empty, timeH: dist / speedKn, directTimeH: dist / speedKn, vmc: speedKn, kind: "diretto" };
  const vDirect = speedKn * polar(brg - twd);
  const directTimeH = vDirect > 0 ? dist / vDirect : Infinity;
  const allowed = (heading: number) => mode !== "comfort" || windAngle(heading, twd) >= COMFORT_MIN_TWA;
  let best = { timeH: allowed(brg) ? directTimeH : Infinity, tack: null as Point | null, h1: brg };
  for (let h1 = 0; h1 < 360; h1 += 1) for (const off of [-1, 1]) {
    // Second heading mirrored about the wind axis (other tack/gybe).
    const h2 = (2 * twd - h1 + 360) % 360;
    if (!allowed(h1) || !allowed(h2)) continue;
    if (off < 0) continue;
    const u1 = unit(h1), u2 = unit(h2), det = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(det) < 1e-6) continue;
    const s1 = (d.x * u2.y - d.y * u2.x) / det, s2 = (u1.x * d.y - u1.y * d.x) / det;
    if (s1 < 0 || s2 < 0) continue;
    const v1 = speedKn * polar(h1 - twd), v2 = speedKn * polar(h2 - twd);
    if (v1 <= 0 || v2 <= 0) continue;
    const t = s1 / v1 + s2 / v2;
    if (t >= best.timeH * 0.98) continue;
    const tp = fromXY(a, u1.x * s1, u1.y * s1);
    if (onLand(tp) || inLagoon(tp) || crossesLand(a, tp) || crossesLand(tp, b)) continue;
    best = { timeH: t, tack: fromXY(a, u1.x * s1, u1.y * s1), h1 };
  }
  const offWind = Math.abs(((brg - twd + 540) % 360) - 180);
  const kind = !Number.isFinite(best.timeH) ? "n/d" : best.tack ? (offWind < 90 ? "bolina" : "poppa") : "diretto";
  return { ...empty, tack: best.tack, timeH: best.timeH, directTimeH, vmc: Number.isFinite(best.timeH) ? dist / best.timeH : 0, kind };
}

export function sailRoute(points: Point[], twds: (number | null)[], speedKn: number, mode: SailMode = "vmc") {
  const legs = points.slice(1).flatMap((b, i) => { const a = points[i]; return a ? [sailLeg(a, b, twds[i] ?? null, speedKn, i, mode)] : []; });
  const first = points[0];
  const path: Point[] = first ? [first] : [];
  legs.forEach((l, i) => { const b = points[i + 1]; if (l.tack) path.push(l.tack); if (b) path.push(b); });
  const timeH = legs.reduce((s, l) => s + l.timeH, 0);
  // Never present a forbidden direct heading as a valid comfortable sailing path.
  return { legs, path: Number.isFinite(timeH) ? path : [], timeH };
}
