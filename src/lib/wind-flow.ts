import { windGridAtTime, type WindGrid } from "@/lib/wind-grid";

/** Display multiplier: real wind is far too slow to see at map scale, so flow is shown accelerated. */
export const FLOW_SPEED_SCALE = 600;
export const FLOW_DT_SECONDS = 0.05;
const METRES_PER_DEGREE = 111_320;

export type FlowParticle = { lat: number; lon: number; age: number; life: number };
export type FlowBand = "calm" | "breeze" | "fresh" | "gale";
export type FlowArea = { west: number; south: number; east: number; north: number };

/** Speed bands drive colour only; they never replace the underlying value. */
export function flowBand(speedKn: number): FlowBand {
  if (!Number.isFinite(speedKn)) return "calm";
  if (speedKn < 8) return "calm";
  if (speedKn < 20) return "breeze";
  if (speedKn < 35) return "fresh";
  return "gale";
}

export function flowBounds(grid: WindGrid): FlowArea {
  const { west, south, dx, dy, width, height } = grid.grid;
  return { west, south, east: west + (width - 1) * dx, north: south + (height - 1) * dy };
}

/**
 * Restricts seeding and culling to the part of the field the user is looking at,
 * clipped to the model's own coverage: no particle is ever placed where the
 * model has no data, and none is drawn far outside the visible map.
 */
export function flowArea(grid: WindGrid, view?: FlowArea): FlowArea {
  const b = flowBounds(grid);
  if (!view || ![view.west, view.south, view.east, view.north].every(Number.isFinite)) return b;
  return {
    west: Math.max(b.west, Math.min(b.east, view.west)),
    east: Math.min(b.east, Math.max(b.west, view.east)),
    south: Math.max(b.south, Math.min(b.north, view.south)),
    north: Math.min(b.north, Math.max(b.south, view.north)),
  };
}

/** Degrees of the direction the wind blows toward, for drawing on a rotated map. */
export function flowTowardDegrees(u: number, v: number): number {
  return (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;
}

/**
 * Places a particle only where the model actually has wind: land-masked or
 * missing nodes are rejected, never drawn over.
 */
export function seedParticle(frames: WindGrid[], time: number, random: () => number, view?: FlowArea, attempts = 12): FlowParticle | null {
  const first = frames[0];
  if (!first || !Number.isFinite(time)) return null;
  const { west, south, east, north } = flowArea(first, view);
  if (!(east > west) || !(north > south)) return null;
  for (let i = 0; i < attempts; i++) {
    const lat = south + (north - south) * random();
    const lon = west + (east - west) * random();
    if (!windGridAtTime(frames, time, lat, lon)) continue;
    return { lat, lon, age: 0, life: 2 + random() * 3 };
  }
  return null;
}

/**
 * Advances one particle by a fixed display step. Returns null when the field
 * has no wind there, the particle aged out, or it left the watched area, so the
 * caller can reseed it instead of drawing an invented segment.
 */
export function advectParticle(frames: WindGrid[], time: number, particle: FlowParticle, view?: FlowArea, dtSeconds = FLOW_DT_SECONDS): FlowParticle | null {
  const first = frames[0];
  if (!first) return null;
  const wind = windGridAtTime(frames, time, particle.lat, particle.lon);
  if (!wind) return null;
  const age = particle.age + dtSeconds;
  if (age > particle.life) return null;
  const cosLat = Math.cos(particle.lat * Math.PI / 180);
  if (cosLat <= 0.01) return null;
  const lat = particle.lat + (wind.v * dtSeconds * FLOW_SPEED_SCALE) / METRES_PER_DEGREE;
  const lon = particle.lon + (wind.u * dtSeconds * FLOW_SPEED_SCALE) / (METRES_PER_DEGREE * cosLat);
  const { west, south, east, north } = flowArea(first, view);
  if (lat < south || lat > north || lon < west || lon > east) return null;
  return { lat, lon, age, life: particle.life };
}
