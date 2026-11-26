import { crossesLand, onLand, type LL } from "@/lib/sea-route";

export const WAYPOINT_HOLD_MS = 500;

/** A separate gesture from chart anchoring: release commits only an armed drag. */
export function waypointGesture(activate: () => void, move: (x: number, y: number) => void, commit: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | null = null;
  let armed = false;
  let held = false;
  const cancel = () => { clearTimeout(timer); origin = null; armed = false; };
  return {
    start(x: number, y: number) {
      cancel(); held = false; origin = { x, y };
      timer = setTimeout(() => { armed = true; held = true; activate(); }, WAYPOINT_HOLD_MS);
    },
    move(x: number, y: number) {
      if (armed) move(x, y);
      else if (origin && Math.hypot(x - origin.x, y - origin.y) > 8) cancel();
    },
    end() { const ready = armed; cancel(); if (ready) commit(); },
    cancel,
    activated: () => held,
  };
}

export type EditedRoute = { points: LL[]; track: LL[] };
const same = (a: LL, b: LL) => Math.abs(a.lat - b.lat) < 0.00001 && Math.abs(a.lon - b.lon) < 0.00001;

/** Insert weather controls into their existing track, keeping channel/coastal vertices. */
function attachPoint(track: LL[], point: LL): number {
  const exact = track.findIndex(p => same(p, point));
  if (exact >= 0) return exact;
  let best = Infinity, slot = 1;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1], b = track[i];
    if (!a || !b) continue;
    const dx = b.lon - a.lon, dy = b.lat - a.lat;
    const t = Math.max(0, Math.min(1, ((point.lon - a.lon) * dx + (point.lat - a.lat) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(point.lon - a.lon - t * dx, point.lat - a.lat - t * dy);
    if (d < best) { best = d; slot = i; }
  }
  track.splice(slot, 0, point);
  return slot;
}

export function moveWaypoint(points: LL[], originalTrack: LL[] | undefined, index: number, point: LL, validate = true): EditedRoute | null {
  const old = points[index];
  if (!old || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return null;
  const track = [...(originalTrack?.length ? originalTrack : points)];
  points.forEach(p => attachPoint(track, p));
  const slot = track.findIndex(p => same(p, old));
  if (slot < 0) return null;
  const before = track[slot - 1], after = track[slot + 1];
  if (validate && (onLand(point) || (before && crossesLand(before, point)) || (after && crossesLand(point, after)))) return null;
  track[slot] = point;
  return { points: points.map((p, i) => i === index ? point : p), track };
}

/** Snap a new control to the actual track, not a straight shortcut between controls. */
export function insertWaypoint(points: LL[], originalTrack: LL[] | undefined, position: LL): EditedRoute | null {
  if (points.length < 2 || !Number.isFinite(position.lat) || !Number.isFinite(position.lon)) return null;
  const track = [...(originalTrack?.length ? originalTrack : points)];
  points.forEach(p => attachPoint(track, p));
  const scale = Math.cos(position.lat * Math.PI / 180);
  let best = Infinity, slot = -1;
  let point: LL | null = null;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1], b = track[i];
    if (!a || !b) continue;
    const dx = (b.lon - a.lon) * scale, dy = b.lat - a.lat;
    const t = Math.max(0, Math.min(1, (((position.lon - a.lon) * scale) * dx + (position.lat - a.lat) * dy) / (dx * dx + dy * dy || 1)));
    const candidate = { lat: a.lat + t * (b.lat - a.lat), lon: a.lon + t * (b.lon - a.lon) };
    const distance = Math.hypot((candidate.lon - position.lon) * scale, candidate.lat - position.lat);
    if (distance < best) { best = distance; slot = i; point = candidate; }
  }
  if (!point || slot < 1 || points.some(p => same(p, point)) || onLand(point)) return null;
  const a = track[slot - 1], b = track[slot];
  if (!a || !b || crossesLand(a, point) || crossesLand(point, b)) return null;
  const index = points.findIndex(p => track.findIndex(vertex => same(vertex, p)) >= slot);
  const next = [...points];
  next.splice(index < 0 ? next.length : index, 0, point);
  // Reuse an existing channel vertex instead of duplicating it.
  if (!track.some(p => same(p, point))) track.splice(slot, 0, point);
  return { points: next, track };
}